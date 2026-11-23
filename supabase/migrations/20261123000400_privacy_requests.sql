begin;
create table turnly_private.privacy_request (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null,
  kind text not null check (kind in ('export','deletion')),
  status text not null default 'pending' check (status in ('pending','in_review','resolved')),
  opened_at timestamptz not null default now()
);
create unique index privacy_request_open on turnly_private.privacy_request(actor,kind) where status<>'resolved';
create table turnly_private.privacy_request_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null references turnly_private.privacy_request(id),
  actor uuid not null,
  status text not null,
  at timestamptz not null default now()
);
revoke all on turnly_private.privacy_request,turnly_private.privacy_request_audit from public,anon,authenticated;

create function public.turnly_privacy_request(request_kind text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare requester uuid:=auth.uid(); request_id uuid;
begin
  if requester is null then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if request_kind is not null then
    if request_kind not in ('export','deletion') then raise exception 'Solicitud inválida' using errcode='22023'; end if;
    insert into turnly_private.privacy_request(actor,kind) values(requester,request_kind)
    on conflict(actor,kind) where status<>'resolved' do nothing returning id into request_id;
    if found then
      insert into turnly_private.privacy_request_audit(request_id,actor,status) values(request_id,requester,'pending');
    end if;
  end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.opened_at desc) from (
    select id,kind,status,opened_at from turnly_private.privacy_request where actor=requester order by opened_at desc limit 50
  ) q),'[]');
end $$;

create function public.turnly_privacy_support(target uuid default null, next_status text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare updated uuid;
begin
  if not turnly_private.is_superadmin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
  if target is not null then
    if next_status is null or next_status not in ('in_review','resolved') then raise exception 'Estado inválido' using errcode='22023'; end if;
    update turnly_private.privacy_request set status=next_status
    where id=target and ((status='pending' and next_status='in_review') or (status='in_review' and next_status='resolved'))
    returning id into updated;
    if found then
      insert into turnly_private.privacy_request_audit(request_id,actor,status) values(updated,auth.uid(),next_status);
    end if;
  end if;
  return coalesce((select jsonb_agg(to_jsonb(q) order by q.opened_at desc) from (
    select id,actor,kind,status,opened_at from turnly_private.privacy_request
    where status<>'resolved' order by opened_at desc limit 50
  ) q),'[]');
end $$;

revoke all on function public.turnly_privacy_request(text),public.turnly_privacy_support(uuid,text) from public,anon;
grant execute on function public.turnly_privacy_request(text),public.turnly_privacy_support(uuid,text) to authenticated;
commit;
