'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatInTimeZone } from 'date-fns-tz'
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { brandConfig } from '@/config/brand'
import { formatCurrency } from '@/lib/utils'

type ReservaData = {
  id: string
  cliente_nombre: string
  fecha: string
  hora: string
  negocio: { nombre: string; moneda?: string; logo_url?: string; timezone?: string } | null
  servicio: { nombre: string; precio?: number } | null
}

const pdfStyles = StyleSheet.create({
  page: { padding: 30, fontSize: 12, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, border: '1 solid #e2e8f0', padding: 20 },
  title: { fontSize: 18, marginBottom: 6, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#64748b', marginBottom: 16 },
  row: { marginBottom: 8 },
})

function ReservaTicketPDF({ reserva, fechaLocal, horaLocal, precio }: { reserva: ReservaData; fechaLocal: string; horaLocal: string; precio: string }) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.card}>
          <Text style={pdfStyles.title}>Comprobante de Reserva</Text>
          <Text style={pdfStyles.subtitle}>Emitido por {brandConfig.appName}</Text>

          <Text style={pdfStyles.row}>Estado: Confirmado</Text>
          <Text style={pdfStyles.row}>Cliente: {reserva.cliente_nombre}</Text>
          <Text style={pdfStyles.row}>Negocio: {reserva.negocio?.nombre ?? brandConfig.appName}</Text>
          <Text style={pdfStyles.row}>Servicio: {reserva.servicio?.nombre ?? '-'}</Text>
          <Text style={pdfStyles.row}>Fecha: {fechaLocal}</Text>
          <Text style={pdfStyles.row}>Hora: {horaLocal}</Text>
          <Text style={pdfStyles.row}>Precio: {precio}</Text>
          <Text style={pdfStyles.row}>Código: #{reserva.id.slice(0, 8).toUpperCase()}</Text>
        </View>
      </Page>
    </Document>
  )
}

export default function ReservaConfirmadaPage() {
  const { id } = useParams<{ id: string }>()
  const [reserva, setReserva] = useState<ReservaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadReserva() {
      try {
        const { data, error } = await supabase
          .from('turno')
          .select('id, cliente_nombre, fecha, hora, servicio(nombre, precio), negocio(nombre, moneda, logo_url, timezone)')
          .eq('id', id)
          .single()

        if (error || !data) {
          setError('No pudimos cargar tu comprobante.')
          return
        }

        setReserva(data as ReservaData)
      } catch {
        setError('No pudimos cargar tu comprobante.')
      } finally {
        setLoading(false)
      }
    }
    loadReserva()
  }, [id])

  const timezone = reserva?.negocio?.timezone || 'UTC'
  const moneda = reserva?.negocio?.moneda || 'ARS'

  const { fechaLocal, horaLocal, precio } = useMemo(() => {
    if (!reserva) return { fechaLocal: '-', horaLocal: '-', precio: '-' }
    const utcDate = new Date(`${reserva.fecha}T${reserva.hora}Z`)

    return {
      fechaLocal: formatInTimeZone(utcDate, timezone, 'dd/MM/yyyy'),
      horaLocal: formatInTimeZone(utcDate, timezone, 'HH:mm'),
      precio: formatCurrency(Number(reserva.servicio?.precio ?? 0), moneda),
    }
  }, [moneda, reserva, timezone])

  const downloadPDF = async () => {
    if (!reserva) return
    setDownloading(true)
    try {
      const blob = await pdf(
        <ReservaTicketPDF
          reserva={reserva}
          fechaLocal={fechaLocal}
          horaLocal={horaLocal}
          precio={precio}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `comprobante-${reserva.id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#020617] text-white font-black">CARGANDO...</div>
  if (!reserva) return <div className="min-h-screen grid place-items-center bg-[#020617] text-white">{error || 'Reserva no encontrada'}</div>

  const logo = reserva.negocio?.logo_url || brandConfig.appLogoUrl

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-10">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-white">← Inicio</Link>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
          <header className="flex items-center justify-between border-b border-dashed border-white/15 px-6 py-5">
            <div className="flex items-center gap-4">
              <img src={logo} alt={brandConfig.appName} className="h-12 w-12 rounded-xl object-cover border border-white/20" />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Ticket digital</p>
                <h1 className="text-xl font-black italic">{reserva.negocio?.nombre ?? brandConfig.appName}</h1>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">Confirmado</span>
          </header>

          <div className="px-6 py-7 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Cliente</span><span className="font-semibold">{reserva.cliente_nombre}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Servicio</span><span className="font-semibold">{reserva.servicio?.nombre ?? '-'}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Fecha</span><span className="font-semibold">{fechaLocal}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Hora</span><span className="font-semibold">{horaLocal}</span></div>
            <div className="mt-4 border-t border-white/10 pt-4 flex justify-between">
              <span className="text-slate-300 font-medium">Total</span>
              <span className="text-2xl font-black italic">{precio}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Código de comprobante: #{reserva.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </section>

        <button
          type="button"
          onClick={downloadPDF}
          disabled={downloading}
          className="mt-6 w-full rounded-2xl bg-white text-black py-4 font-black uppercase italic hover:opacity-90 disabled:opacity-50"
        >
          {downloading ? 'Generando PDF...' : 'Descargar comprobante PDF'}
        </button>
      </div>
    </main>
  )
}
