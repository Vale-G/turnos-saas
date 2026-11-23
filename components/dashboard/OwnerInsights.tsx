'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Insights = {
  forecast: {expected:number;error:number}|null
  heat: {weekday:number;hour:number;offered:number;occupied:number}[]
  periods: {label:string;open_days:number;bookings:number;completed:number;occupancy:number|null}[]
  cohorts: {horizon:number;eligible:number;returned:number}[]
  durations: {nombre:string;samples:number;median:number;p80:number}[]
  recovery: {count:number;lost:number|null;recovered:number|null;median:number|null;p80:number|null}
}
const format = (n:number|null) => n == null ? '—' : n.toLocaleString('es-AR',{maximumFractionDigits:1})
const weekdays = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
export function OwnerInsights({business,month,worker,service}:{business:string;month:string;worker:string;service:string}) {
  const [data,setData] = useState<Insights|null>(null)
  const [failed,setFailed] = useState(false)
  const [revision,retry] = useState(0)
  useEffect(()=>{
    let active=true
    async function load() {
      const {data,error}=await supabase.rpc('turnly_owner_insights',{business,month_start:month+'-01',worker:worker||null,service:service||null})
      if(active){setData(error?null:data);setFailed(Boolean(error))}
    }
    void load()
    return ()=>{active=false}
  },[business,month,worker,service,revision])
  if(failed) return <p role="alert">No pudimos cargar las estadísticas. <button onClick={()=>retry(revision+1)}>Reintentar</button></p>
  if(!data) return <p role="status">Cargando estadísticas…</p>
  const hours=[...new Set(data.heat.map(h=>h.hour))].sort((a,b)=>a-b)
  const recovery=data.recovery
  return <section className="my-8 space-y-6">
    <h2 className="text-2xl font-semibold">Ocupación por día y hora</h2>
    <p>Minutos reservados sobre minutos ofrecidos hasta hoy, descontando bloqueos y usando el horario y el equipo actuales. Elegí una celda para ver los minutos.</p>
    {hours.length===0 ? <p>Sin horas ofrecidas para el período.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th>Hora</th>{weekdays.map(d=><th key={d}>{d}</th>)}</tr></thead>
      <tbody>{hours.map(hour=><tr key={hour}><th>{hour}:00</th>{weekdays.map((d,i)=>{
        const cell=data.heat.find(h=>h.weekday===i && h.hour===hour)
        if(!cell) return <td key={d} className="text-center">—</td>
        const ratio=cell.occupied/cell.offered
        return <td key={d} className="p-1 text-center" style={{backgroundColor:'rgba(16,185,129,'+(0.08+0.5*ratio)+')'}}><details><summary>{format(ratio*100)}%</summary>{format(cell.occupied)} de {format(cell.offered)} min</details></td>
      })}</tr>)}</tbody></table></div>}
    <h2 className="text-xl font-semibold">Comparación con el mes anterior</h2>
    {data.periods.map(p=><p key={p.label}><strong>{p.label}</strong> · {p.open_days} días abiertos · {format(p.open_days?p.bookings/p.open_days:null)} reservas/día · {format(p.open_days?p.completed/p.open_days:null)} completadas/día · {format(p.occupancy)}% de ocupación</p>)}
    <h2 className="text-xl font-semibold">Recuperación de cancelaciones</h2>
    <p>{recovery.count} cancelaciones con registro · {format(recovery.recovered)} de {format(recovery.lost)} minutos cubiertos por reservas posteriores. Anticipación mediana: {format(recovery.median)} h · percentil 80: {format(recovery.p80)} h.</p>
    <h2 className="text-xl font-semibold">Clientes que volvieron</h2>
    <p>Primeras visitas del mes con cuenta identificada y ventana de observación completa.</p>
    {data.cohorts.map(c=><p key={c.horizon}>{c.horizon} días · {c.returned} de {c.eligible} clientes · {format(c.eligible?100*c.returned/c.eligible:null)}%</p>)}
    <h2 className="text-xl font-semibold">Duración medida por servicio</h2>
    {data.durations.length===0 && <p>Sin atenciones con inicio y fin registrados.</p>}
    {data.durations.map((d,i)=><p key={i}>{d.nombre} · {d.samples} mediciones · mediana {format(d.median)} min · percentil 80 {format(d.p80)} min</p>)}
    {data.forecast && <p>Estimación para la próxima semana completa: {format(data.forecast.expected)} reservas. Error medio en ocho semanas de validación: {format(data.forecast.error)} reservas.</p>}
  </section>
}
