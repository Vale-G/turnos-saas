// components/dashboard/UpgradePlanModal.tsx
'use client'

import { PlanNegocio } from '@/types/database.types'
import { PLANES } from '@/lib/permisos'

interface UpgradePlanModalProps {
  planActual: PlanNegocio
  featureBloqueada: string
  onClose: () => void
  onUpgrade: (nuevoPlan: PlanNegocio) => void
}

export default function UpgradePlanModal({
  planActual,
  featureBloqueada,
  onClose,
  onUpgrade
}: UpgradePlanModalProps) {
  
  const planRecomendado: PlanNegocio = planActual === 'trial' ? 'basico' : 'pro'
  const datosRecomendado = PLANES[planRecomendado]

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-[#0f172a] rounded-[4rem] border border-white/10 p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-4xl shadow-2xl">
            🔒
          </div>
          <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4">
            Función <span className="text-[#10b981]">Premium</span>
          </h2>
          <p className="text-slate-400 text-lg">
            <span className="font-bold text-white">"{featureBloqueada}"</span> está disponible en el Plan {datosRecomendado.nombre}
          </p>
        </div>

        {/* Comparación de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Plan Actual */}
          <div className="bg-[#020617] p-8 rounded-[3rem] border border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-700/30 rounded-2xl flex items-center justify-center text-2xl">
                📦
              </div>
              <div>
                <p className="text-xs text-slate-500 font-black uppercase">Tu plan actual</p>
                <h3 className="text-2xl font-black text-white italic">{PLANES[planActual].nombre}</h3>
              </div>
            </div>
            
            <ul className="space-y-3">
              {PLANES[planActual].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="text-slate-600 mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-3xl font-black text-slate-400 italic">
                ${PLANES[planActual].precio.toLocaleString()}
                <span className="text-sm text-slate-600 font-normal">/mes</span>
              </p>
            </div>
          </div>

          {/* Plan Recomendado */}
          <div className="bg-gradient-to-br from-[#10b981]/20 to-[#059669]/10 p-8 rounded-[3rem] border-2 border-[#10b981]/40 relative overflow-hidden">
            
            {/* Badge "Recomendado" */}
            <div className="absolute top-4 right-4 px-4 py-2 bg-[#10b981] text-black rounded-full text-[10px] font-black uppercase tracking-wider">
              Recomendado
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center text-2xl shadow-xl">
                🚀
              </div>
              <div>
                <p className="text-xs text-[#10b981] font-black uppercase">Mejora a</p>
                <h3 className="text-2xl font-black text-white italic">{datosRecomendado.nombre}</h3>
              </div>
            </div>
            
            <ul className="space-y-3">
              {datosRecomendado.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-white">
                  <span className="text-[#10b981] mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-6 pt-6 border-t border-[#10b981]/20">
              <p className="text-3xl font-black text-white italic">
                ${datosRecomendado.precio.toLocaleString()}
                <span className="text-sm text-slate-400 font-normal">/mes</span>
              </p>
            </div>
          </div>
        </div>

        {/* Beneficios Destacados */}
        <div className="bg-[#020617] p-8 rounded-[3rem] border border-[#10b981]/20 mb-8">
          <h4 className="text-lg font-black text-white uppercase italic mb-6 text-center">
            ¿Por qué mejorar ahora?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <p className="text-xs font-black text-[#10b981] uppercase">Más Ingresos</p>
              <p className="text-xs text-slate-400 mt-2">
                Optimiza tu agenda y aumenta turnos hasta 40%
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <p className="text-xs font-black text-[#10b981] uppercase">Tiempo Ahorrado</p>
              <p className="text-xs text-slate-400 mt-2">
                Automatiza recordatorios y gestión de clientes
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-xs font-black text-[#10b981] uppercase">Decisiones Inteligentes</p>
              <p className="text-xs text-slate-400 mt-2">
                Reportes financieros y métricas en tiempo real
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-4">
          <button
            onClick={() => onUpgrade(planRecomendado)}
            className="flex-1 bg-[#10b981] text-black py-6 rounded-[2rem] font-black uppercase text-lg tracking-wider shadow-2xl hover:scale-105 transition-transform"
          >
            Mejorar a {datosRecomendado.nombre} • ${datosRecomendado.precio.toLocaleString()}/mes
          </button>
          <button
            onClick={onClose}
            className="px-8 bg-white/5 text-white py-6 rounded-[2rem] font-black uppercase hover:bg-white/10 transition-colors"
          >
            Ahora no
          </button>
        </div>

        {/* Garantía */}
        <p className="text-center text-xs text-slate-500 mt-6 font-bold">
          🔒 Pago seguro • 7 días de garantía • Cancela cuando quieras
        </p>
      </div>
    </div>
  )
}
