import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-6 text-center px-6">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-indigo-500 text-3xl font-black shadow-[0_20px_60px_rgba(99,102,241,.35)]">T</div>
      <p className="text-8xl font-black italic text-emerald-500">404</p>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">
        Página no encontrada
      </h1>
      <p className="text-slate-500 max-w-sm">
        Esta página no existe o fue movida.
      </p>
      <Link href="/landing"
        className="bg-emerald-500 text-black font-black uppercase italic px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity">
        Volver al inicio
      </Link>
    </div>
  )
}
