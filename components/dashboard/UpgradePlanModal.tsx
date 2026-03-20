'use client'
import { useRouter } from 'next/navigation'

const FEATURES_PRO = [
  'Staff y servicios ilimitados',
  'Informes y estadisticas avanzadas',
  'Historial completo de clientes',
  'Cobros con MercadoPago',
  'Recordatorios automaticos',
]

export default function UpgradePlanModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter()

  return (
    <div className="bg-white/4 border border-white/8 rounded-[2rem] p-6 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="bg-amber-400 text-black text-[9px] font-black uppercase px-2 py-1 rounded-full">
          Plan Pro
        </span>
        {onClose && (
          <button onClick={onClose} className="text-slate-500 hover:text-white text-sm font-black">
            X
          </button>
        )}
      </div>
      <h3 className="font-black italic uppercase text-xl mb-2">Desbloqueá todo</h3>
      <p className="text-slate-400 text-sm mb-4">Upgradeá a Pro y accedé a todas las funciones.</p>
      <ul className="space-y-2 mb-6">
        {FEATURES_PRO.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7l3 3 6-6" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => { router.push('/upgrade'); onClose?.() }}
        className="w-full py-3 rounded-2xl font-black italic text-black bg-amber-400 hover:opacity-90 transition-opacity">
        Ver planes →
      </button>
    </div>
  )
}
