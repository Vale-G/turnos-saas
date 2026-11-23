'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { todayInTimeZone,addDaysISO } from '@/lib/local-date.mjs'

type Task = {id:string;fecha:string;hora:string}
type Option = {id:string;nombre:string}
export function OwnerTasks({business}:{business:string}){
  const [tasks,setTasks]=useState<{open:Task[];deposits:Task[]}|null>(null)
  const [options,setOptions]=useState<{team:Option[];services:Option[]}>({team:[],services:[]})
  const [worker,setWorker]=useState('')
  const [service,setService]=useState('')
  const [slots,setSlots]=useState<string[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [slotError,setSlotError]=useState('')
  const [searched,setSearched]=useState(false)
  const today=todayInTimeZone()
  useEffect(()=>{
    let active=true
    async function load(){
      const [open,deposits,team,services]=await Promise.all([
        supabase.from('turno').select('id,fecha,hora').eq('negocio_id',business).eq('fecha',addDaysISO(today,-1)).in('estado',['pendiente','confirmado']).order('hora'),
        supabase.from('turno').select('id,fecha,hora').eq('negocio_id',business).eq('politica_sena','obligatoria').eq('sena_pagada',false).eq('estado','pendiente').gte('fecha',today).order('fecha').order('hora').limit(20),
        supabase.from('staff').select('id,nombre').eq('negocio_id',business).eq('activo',true).order('nombre'),
        supabase.from('servicio').select('id,nombre').eq('negocio_id',business).order('nombre')
      ])
      if(!active) return
      if(open.error||deposits.error||team.error||services.error){setError('No pudimos cargar los pendientes.');return}
      setTasks({open:open.data,deposits:deposits.data});setOptions({team:team.data,services:services.data})
      setWorker(team.data[0]?.id??'');setService(services.data[0]?.id??'')
    }
    void load()
    return ()=>{active=false}
  },[business,today])
  async function findSlots(){
    setBusy(true);setSlots([]);setSlotError('');setSearched(false)
    try{
      for(let day=0;day<7;day++){
        const fecha=addDaysISO(today,day)
        const params=new URLSearchParams({negocioId:business,staffId:worker,servicioId:service,fecha})
        const response=await fetch('/api/public/disponibilidad?'+params,{cache:'no-store'})
        if(!response.ok) throw new Error()
        const data=await response.json()
        if(data.horarios.length){setSlots(data.horarios.slice(0,4).map((h:string)=>fecha+' · '+h));break}
      }
      setSearched(true)
    }catch{setSlotError('No se pudo consultar la disponibilidad.')}finally{setBusy(false)}
  }
  return <section className="my-6 rounded-2xl border p-5 space-y-3"><h2 className="text-xl font-semibold">Pendientes del negocio</h2>
    {error && <p role="alert">{error}</p>}
    {tasks && [['Turnos de ayer sin cerrar',tasks.open],['Próximas señas pendientes (hasta 20)',tasks.deposits]].map(([name,items])=>{
      const rows=items as Task[]
      return <details key={String(name)}><summary>{String(name)} · {rows.length}</summary><ul>{rows.map(t=><li key={t.id}><a className="underline" href={'/turnos?fecha='+t.fecha+'&turno='+t.id}>{t.fecha} · {t.hora.slice(0,5)}</a></li>)}</ul></details>
    })}
    {options.services.length>0 && options.team.length>0 && <fieldset disabled={busy} className="flex flex-wrap gap-3"><legend>Próximos huecos en siete días</legend>
      <select aria-label="Servicio para buscar huecos" value={service} onChange={e=>{setService(e.target.value);setSearched(false);setSlots([])}}>{options.services.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
      <select aria-label="Profesional para buscar huecos" value={worker} onChange={e=>{setWorker(e.target.value);setSearched(false);setSlots([])}}>{options.team.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
      <button onClick={findSlots}>{busy?'Buscando…':'Consultar disponibilidad'}</button>
    </fieldset>}
    {slotError && <p role="alert">{slotError}</p>}
    {searched && <p>{slots.length?slots.join(' / '):'Sin huecos en los próximos siete días.'}</p>}
  </section>
}
