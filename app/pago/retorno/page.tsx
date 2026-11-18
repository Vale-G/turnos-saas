'use client'
import { useEffect } from 'react'

export default function RetornoPago() {
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('turno')
    if(!id || !/^[0-9a-f-]{36}$/i.test(id)) return
    const token=sessionStorage.getItem('turnly-reserva-'+id)
    if(token && /^[0-9a-f]{64}$/.test(token)) window.location.replace('/cancelar/'+id+'?token='+token)
  },[])
  return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-bold">Consultar el estado del turno</h1><p>Abrí el enlace privado de tu reserva para consultar el estado actualizado del pago.</p></main>
}
