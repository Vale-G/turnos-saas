'use client'

const TURNOS_DEMO = [
  {
    nombre: 'Matias R.',
    servicio: 'Corte + barba',
    hora: '10:00',
    color: '#22C55E',
    estado: 'cobrado',
  },
  {
    nombre: 'Juan P.',
    servicio: 'Corte clásico',
    hora: '11:30',
    color: '#6366F1',
    estado: 'confirmado',
  },
  {
    nombre: 'Carlos M.',
    servicio: 'Barba perfilada',
    hora: '12:00',
    color: '#F59E0B',
    estado: 'pendiente',
  },
]

export default function Mockup() {
  return (
    <section className="max-w-2xl mx-auto px-6 pb-24">
      <div className="bg-[#0F172A] rounded-[2rem] border border-white/8 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 bg-[#6366F1] rounded-lg flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
              <path
                d="M11 7v4l2.5 2.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-black italic text-sm">Barberia El Flaco</span>
          <span className="ml-auto text-[9px] bg-amber-400 text-black font-black uppercase px-2 py-0.5 rounded-full">
            PRO
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#1E293B] rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">
              Cobrado hoy
            </p>
            <p className="text-2xl font-black text-[#6366F1]">$47.500</p>
          </div>
          <div className="bg-[#1E293B] rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">
              Turnos hoy
            </p>
            <p className="text-2xl font-black">8</p>
          </div>
        </div>

        <div className="space-y-2">
          {TURNOS_DEMO.map((turno) => (
            <div
              key={turno.nombre}
              className="bg-[#1E293B] rounded-xl p-3 flex items-center gap-3"
            >
              <div
                className="w-1 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: turno.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{turno.nombre}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {turno.servicio}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className="font-black text-sm"
                  style={{ color: turno.color }}
                >
                  {turno.hora}
                </p>
                <p
                  className="text-[9px] uppercase font-black"
                  style={{ color: turno.color }}
                >
                  {turno.estado}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
