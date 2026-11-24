'use client'

export default function PrintReservation() {
  return (
    <button type="button" onClick={() => window.print()}
      className="min-h-11 rounded-xl border border-slate-600 px-4 print:hidden">
      Imprimir comprobante
    </button>
  )
}
