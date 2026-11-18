create index if not exists turno_business_report_date_idx on public.turno (negocio_id,fecha);
create index if not exists turno_customer_visit_idx on public.turno (negocio_id,cliente_id,fecha) where estado='completado' and cliente_id is not null;

-- Aggregates only. Use caller RLS and the existing business-management predicate.
create function public.turnly_owner_insights(business uuid, month_start date, worker uuid default null, service uuid default null)
returns jsonb language plpgsql stable security invoker set search_path=pg_catalog,public as $$
declare result jsonb;
begin
 if month_start is null or extract(day from month_start)<>1 then raise exception 'Mes inválido'; end if;
 if not turnly_private.can_manage_business(business) or not exists (
   select 1 from public.negocio n where n.id=business and
   (n.suscripcion_tipo='pro' or (n.suscripcion_tipo='trial' and n.trial_hasta>=now()) or turnly_private.is_superadmin()))
 then raise exception 'Acceso denegado' using errcode='42501'; end if;
 with biz as (select id,zona_horaria,hora_apertura,hora_cierre,dias_laborales from public.negocio where id=business),
 bounds as (select (now() at time zone zona_horaria)::date today,
   (month_start+interval '1 month')::date next_month,
   (month_start-interval '1 month')::date prev from biz),
 days as (
   select d::date as day from bounds,generate_series(prev::timestamp,least(today,next_month-1)::timestamp,interval '1 day') d
   where month_start<=today and (d>=month_start or today>=next_month or extract(day from d)<=extract(day from today))
 ),
 shifts as (
   select day,w.id staff_id,tsrange(day+n.hora_apertura,day+n.hora_cierre,'[)') shift
   from days cross join biz n join public.staff w on w.negocio_id=n.id
   where w.activo and (worker is null or w.id=worker) and extract(dow from day)=any(n.dias_laborales) and n.hora_cierre>n.hora_apertura
 ),
 capacity as (
   select sh.*, tsmultirange(shift)-coalesce((select range_agg(r) from (
      select tsrange(day+b.hora_inicio,day+b.hora_fin,'[)') r from public.bloqueo b
       where b.staff_id=sh.staff_id and b.fecha=day and b.hora_fin>b.hora_inicio
      union all select tsrange(day+b.hora_inicio,day+b.hora_fin,'[)') from public.bloquehorario b
       where b.negocio_id=business and (b.fecha=day or (b.recurrente and b.dia_semana=extract(dow from day))) and b.hora_fin>b.hora_inicio
   ) exclusions),'{}'::tsmultirange) offered from shifts sh
 ),
 rows as (
   select t.*,tsrange(t.fecha+t.hora,t.fecha+t.hora+make_interval(mins=>t.duracion_minutos),'[)') slot
   from public.turno t,bounds where t.negocio_id=business and (worker is null or t.staff_id=worker)
     and (service is null or t.servicio_id=service) and t.fecha>=prev and t.fecha<next_month
 ),
 hourly as (
   select day,staff_id,h,offered * tsmultirange(tsrange(h,h+interval '1 hour','[)')) available,
     coalesce((select range_agg(slot) from rows t where t.staff_id=c.staff_id and t.fecha=c.day and t.estado<>'cancelado' and t.duracion_minutos is not null),'{}'::tsmultirange) booked
   from capacity c cross join lateral generate_series(date_trunc('hour',lower(shift)),upper(shift)-interval '1 second',interval '1 hour') h
 ),
 minutes as (
   select day,extract(dow from day)::int weekday,extract(hour from h)::int as hour,
    (select coalesce(sum(extract(epoch from upper(r)-lower(r))/60),0) from unnest(available) r) offered,
    (select coalesce(sum(extract(epoch from upper(r)-lower(r))/60),0) from unnest(available*booked) r) occupied from hourly
 ),
 heat as (select weekday,hour,sum(offered) offered,sum(occupied) occupied from minutes where day>=month_start group by weekday,hour having sum(offered)>0),
 periods as (select label,
   (select count(distinct day) from minutes where offered>0 and (day>=month_start)=is_current) open_days,
   (select count(*) from rows where fecha in (select day from days where (day>=month_start)=is_current)) bookings,
   (select count(*) from rows where estado='completado' and fecha in (select day from days where (day>=month_start)=is_current)) completed,
   (select round(100*sum(occupied)/nullif(sum(offered),0),1) from minutes where (day>=month_start)=is_current) occupancy
   from (values('Actual',true),('Anterior',false)) p(label,is_current)),
 cancellations as (
   select t.id,extract(epoch from ((t.fecha+t.hora) at time zone n.zona_horaria) - t.cancelado_en)/3600 lead_hours,
    t.duracion_minutos lost, (select coalesce(sum(extract(epoch from upper(r)-lower(r))/60),0)
     from unnest((select range_agg(t.slot * o.slot) from public.turno replacement
         join lateral (select tsrange(replacement.fecha+replacement.hora,replacement.fecha+replacement.hora+make_interval(mins=>replacement.duracion_minutos),'[)') slot) o on true
         where replacement.staff_id=t.staff_id and replacement.negocio_id=business and replacement.fecha=t.fecha and replacement.estado<>'cancelado'
         and replacement.duracion_minutos is not null and coalesce(replacement.asignado_en,replacement.created_at)>=t.cancelado_en and t.slot && o.slot)) r) recovered
   from rows t cross join biz n where t.fecha>=month_start and t.cancelado_en is not null and t.estado='cancelado' and t.duracion_minutos is not null
 ),
 visits as (select cliente_id,fecha,id,servicio_id,staff_id,row_number() over(partition by cliente_id order by fecha,hora,id) seq
   from public.turno where negocio_id=business and estado='completado' and cliente_id is not null),
 cohorts as (
   select horizon,count(v.id) eligible,count(v.id) filter(where exists(select 1 from visits r where r.cliente_id=v.cliente_id and r.seq>1 and r.fecha<=v.fecha+horizon)) returned
   from (values(30),(60),(90)) horizons(horizon) cross join bounds
   left join visits v on v.seq=1 and v.fecha>=month_start and v.fecha<next_month and v.fecha+horizon<=today
   and (service is null or v.servicio_id=service) and (worker is null or v.staff_id=worker) group by horizon
 ),
 durations as (select s.nombre,count(*) samples,
   round((percentile_cont(0.5) within group(order by extract(epoch from fin_real-inicio_real)/60))::numeric,1) median,
   round((percentile_cont(0.8) within group(order by extract(epoch from fin_real-inicio_real)/60))::numeric,1) p80
   from rows t left join public.servicio s on s.id=t.servicio_id where t.fecha>=month_start and t.estado='completado' and fin_real>=inicio_real group by s.id,s.nombre),
 weeks as (
   select ws::date week_start,count(t.id)::numeric bookings
   from bounds cross join lateral generate_series(date_trunc('week',today::timestamp)-interval '12 weeks',
     date_trunc('week',today::timestamp)-interval '1 week',interval '1 week') ws
   left join public.turno t on t.negocio_id=business and t.fecha>=ws::date and t.fecha<ws::date+7
     and (worker is null or t.staff_id=worker) and (service is null or t.servicio_id=service)
   group by ws
 ),
 predictions as (
   select *,avg(bookings) over(order by week_start rows between 4 preceding and 1 preceding) estimate,
     lag(bookings) over(order by week_start) baseline,row_number() over(order by week_start) sequence from weeks
 ),
 validation as (
   select avg(abs(estimate-bookings)) error,avg(abs(baseline-bookings)) baseline_error from predictions where sequence>4
 ),
 forecast as (
   select round(avg(bookings)) expected,(select round(error,1) from validation) error
   from weeks where week_start >= (select max(week_start)-21 from weeks)
   having (select error<baseline_error from validation)
    and exists(select 1 from public.turno t where t.negocio_id=business and t.fecha<(select min(week_start) from weeks)
      and (worker is null or t.staff_id=worker) and (service is null or t.servicio_id=service))
 )

 select jsonb_build_object(
 'forecast',(select to_jsonb(forecast) from forecast where month_start=date_trunc('month',(select today from bounds))::date),
 'heat',coalesce((select jsonb_agg(to_jsonb(heat) order by weekday,hour) from heat),'[]'),
 'periods',(select jsonb_agg(to_jsonb(periods) order by label) from periods),
 'cohorts',(select jsonb_agg(to_jsonb(cohorts) order by horizon) from cohorts),
 'durations',coalesce((select jsonb_agg(to_jsonb(durations) order by nombre) from durations),'[]'),
 'recovery',(select jsonb_build_object('count',count(*),'lost',sum(lost),'recovered',sum(recovered),
 'median',percentile_cont(0.5) within group(order by lead_hours),'p80',percentile_cont(0.8) within group(order by lead_hours)) from cancellations)
 ) into result;
 return result;
end; $$;
revoke all on function public.turnly_owner_insights(uuid,date,uuid,uuid) from public,anon;
grant execute on function public.turnly_owner_insights(uuid,date,uuid,uuid) to authenticated;
