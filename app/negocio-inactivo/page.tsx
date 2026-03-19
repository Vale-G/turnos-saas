export default function NegocioInactivo() {
  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-3xl">
        ✕
      </div>
      <h1 className="text-3xl font-black italic uppercase tracking-tighter text-red-400">
        Cuenta Inactiva
      </h1>
      <p className="text-slate-500 max-w-sm">
        Este negocio no está disponible por el momento. Si sos el dueño, contactate con soporte.
      </p>
    </div>
  )
}
