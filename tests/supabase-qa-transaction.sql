-- Ejecutar exclusivamente en el proyecto Supabase aislado de QA, después de la
-- migración booking_security_and_intervals. Toda la evidencia se revierte.
begin;

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
values
('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner1@qa.invalid','',now(),now()),
('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner2@qa.invalid','',now(),now())
on conflict (id) do nothing;

insert into public.negocio(id,owner_id,nombre,slug,hora_apertura,hora_cierre,dias_laborales)
values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','QA Uno','qa-uno-rollback','08:00','20:00',array[0,1,2,3,4,5,6]::smallint[]),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','QA Dos','qa-dos-rollback','08:00','20:00',array[0,1,2,3,4,5,6]::smallint[])
on conflict (id) do nothing;

insert into public.servicio(id,negocio_id,nombre,duracion,precio)
values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Consulta QA',60,1000)
on conflict (id) do nothing;
insert into public.staff(id,negocio_id,nombre)
values ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Profesional QA')
on conflict (id) do nothing;

do $qa$
declare
  booking record;
  adjacent record;
  cancelled record;
  visible_count integer;
  stored_count integer;
begin
  select * into booking from public.turnly_create_public_booking(
    '20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',current_date + 1,'10:00',null,
    'Cliente QA','+5491112345678','qa@example.com');
  if booking.manage_token !~ '^[0-9a-f]{64}$' then raise exception 'token no opaco'; end if;
  if not public.turnly_verify_manage_token(booking.turno_id,booking.manage_token) then raise exception 'token no verificable'; end if;

  begin
    perform * from public.turnly_create_public_booking(
      '20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',current_date + 1,'10:30',null,
      'Cliente QA 2','+5491112345679','qa2@example.com');
    raise exception 'se aceptó una superposición';
  exception when exclusion_violation then null;
  end;

  select * into adjacent from public.turnly_create_public_booking(
    '20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',current_date + 1,'11:00',null,
    'Cliente QA 3','+5491112345680','qa3@example.com');
  if adjacent.turno_id is null then raise exception 'turno adyacente rechazado'; end if;

  if has_column_privilege('authenticated','public.turno','duracion_minutos','insert')
     or has_column_privilege('authenticated','public.turno','hora_fin','insert')
     or has_column_privilege('authenticated','public.turno','duracion_minutos','update')
     or has_column_privilege('authenticated','public.turno','hora_fin','update') then
    raise exception 'authenticated puede alterar columnas derivadas';
  end if;

  insert into public.turno(
    negocio_id,servicio_id,staff_id,fecha,hora,estado,duracion_minutos,hora_fin
  ) values (
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    current_date + 1,'13:00','cancelado',1,'13:01'
  ) returning id,duracion_minutos,hora_fin into cancelled;
  if cancelled.duracion_minutos <> 60 or cancelled.hora_fin <> '14:00'::time then
    raise exception 'turno cancelado confió en intervalo inyectado';
  end if;
  update public.turno set estado='pendiente' where id=cancelled.id;
  begin
    perform * from public.turnly_create_public_booking(
      '20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000001',current_date + 1,'13:30',null,
      'Cliente QA 4','+5491112345681','qa4@example.com');
    raise exception 'reactivación permitió una superposición';
  exception when exclusion_violation then null;
  end;

  if has_table_privilege('anon','public.negocio','select') then raise exception 'anon conserva select'; end if;
  if has_function_privilege('anon','public.turnly_create_public_booking(uuid,uuid,uuid,date,time without time zone,uuid,text,text,text)','execute') then
    raise exception 'anon puede ejecutar reserva';
  end if;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  set local role authenticated;
  select count(*) into visible_count from public.negocio;
  reset role;
  if visible_count <> 1 then raise exception 'RLS mostró % negocios', visible_count; end if;

  select count(*) into stored_count from public.turno;
  if stored_count <> 3 then raise exception 'conteo inesperado de turnos: %', stored_count; end if;
end
$qa$;

rollback;
