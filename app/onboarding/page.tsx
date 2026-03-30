'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import Image from 'next/image'

const DIAS = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo']
const DIAS_KEYS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

export default function Onboarding() {
  const [paso, setPaso] = useState(1)
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [colorP, setColorP] = useState('#6366F1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paso 1 — Logo y nombre
  const [nombre, setNombre] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoPreview, setLogoPreview] = useState(false)

  // Paso 2 — Horarios
  const [diasActivos, setDiasActivos] = useState(['lunes','martes','miercoles','jueves','viernes','sabado'])
  const [horaApertura, setHoraApertura] = useState('09:00')
  const [horaCierre, setHoraCierre] = useState('19:00')
  const [whatsapp, setWhatsapp] = useState('')

  // Paso 3 — Primer servicio
  const [servicioNombre, setServicioNombre] = useState('')
  const [servicioPrecio, setServicioPrecio] = useState('')
  const [servicioDuracion, setServicioDuracion] = useState('30')

  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      let neg = null
      const { data: byOwner } = await supabase.from('Negocio')
        .select('id, nombre, tema, onboarding_completo').eq('owner_id', user.id).single()
      if (byOwner) neg = byOwner
      else {
        const { data: byId } = await supabase.from('Negocio')
          .select('id, nombre, tema, onboarding_completo').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(1).single()
        neg = byId
      }
      if (!neg) { router.push('/onboarding'); return }
      if (neg.onboarding_completo) { router.push('/dashboard'); return }

      setNegocioId(neg.id)
      setNombre(neg.nombre ?? '')
      setColorP(getThemeColor(neg.tema))
    }
    init()
  }, [router])

  const toggleDia = (dia: string) => {
    setDiasActivos(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    )
  }

  const guardarPaso1 = async () => {
    if (!negocioId || !nombre.trim()) return
    setLoading(true); setError(null)
    const { error } = await supabase.from('Negocio').update({
      nombre: nombre.trim(),
      ...(logoUrl.trim() && { logo_url: logoUrl.trim() }),
    }).eq('id', negocioId)
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false); setPaso(2)
  }

  const guardarPaso2 = async () => {
    if (!negocioId) return
    setLoading(true); setError(null)
    const _map: Record<string,number> = {domingo:0,lunes:1,martes:2,miercoles:3,jueves:4,viernes:5,sabado:6}
    const diasNums = diasActivos.map(d => _map[d])
    const { error } = await supabase.from('Negocio').update({
      dias_laborales: diasNums,
      hora_apertura: horaApertura + ':00',
      hora_cierre: horaCierre + ':00',
      ...(whatsapp.trim() && { whatsapp: whatsapp.trim() }),
    }).eq('id', negocioId)
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false); setPaso(3)
  }

  const guardarPaso3 = async () => {
    if (!negocioId) return
    setLoading(true); setError(null)
    if (servicioNombre.trim() && servicioPrecio) {
      const { error } = await supabase.from('Servicio').insert({
        negocio_id: negocioId,
        nombre: servicioNombre.trim(),
        precio: parseFloat(servicioPrecio),
        duracion: parseInt(servicioDuracion),
      })
      if (error) { setError(error.message); setLoading(false); return }
    }
    await supabase.from('Negocio').update({ onboarding_completo: true }).eq('id', negocioId)
    setLoading(false)
    router.push('/dashboard?bienvenida=1')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progreso = (paso / 3) * 100

  return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: colorP }}>
            <svg width="24" height="24" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8" stroke="black" strokeWidth="2"/>
              <path d="M11 7v4l2.5 2.5" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter" style={{ color: colorP }}>
            Configuremos tu negocio
          </h1>
          <p className="text-slate-500 text-sm mt-1">3 pasos · menos de 2 minutos</p>
        </div>

        {/* Barra de progreso */}
        <div className="flex items-center gap-2 mb-8">
          {[1,2,3].map(n => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div className={'w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ' +
                (paso > n ? 'bg-emerald-500 text-black' : paso === n ? 'text-black' : 'bg-white/10 text-slate-500')}
                style={paso === n ? { backgroundColor: colorP } : {}}>
                {paso > n ? '✓' : n}
              </div>
              {n < 3 && <div className={'flex-1 h-0.5 rounded transition-all ' + (paso > n ? 'bg-emerald-500' : 'bg-white/10')} />}
            </div>
          ))}
        </div>

        {/* PASO 1 — Logo y nombre */}
        {paso === 1 && (
          <div className="bg-white/4 border border-white/8 rounded-[2rem] p-6 space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Paso 1 de 3</p>
              <h2 className="text-xl font-black italic uppercase">Tu negocio</h2>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                Nombre del negocio
              </label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Barberia El Flaco"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                URL del logo (opcional)
              </label>
              <div className="flex gap-2">
                <input type="url" value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoPreview(false) }}
                  placeholder="https://..."
                  className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
                {logoUrl && (
                  <button onClick={() => setLogoPreview(true)}
                    className="px-4 py-3 rounded-xl bg-white/10 text-xs font-black uppercase hover:bg-white/15 transition-colors">
                    Ver
                  </button>
                )}
              </div>
              {logoPreview && logoUrl && (
                <div className="mt-3 flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <Image src={logoUrl} alt="logo" width={48} height={48} className="rounded-xl object-cover"
                    onError={() => setLogoPreview(false)} />
                  <p className="text-xs text-slate-400">Logo cargado correctamente</p>
                </div>
              )}
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            <button onClick={guardarPaso1} disabled={loading || !nombre.trim()}
              className="w-full py-4 rounded-2xl font-black italic text-lg text-black disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: colorP }}>
              {loading ? 'Guardando...' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* PASO 2 — Horarios */}
        {paso === 2 && (
          <div className="bg-white/4 border border-white/8 rounded-[2rem] p-6 space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Paso 2 de 3</p>
              <h2 className="text-xl font-black italic uppercase">Horarios</h2>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-3">
                Días que trabajás
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia, i) => (
                  <button key={dia} onClick={() => toggleDia(DIAS_KEYS[i])}
                    className={'px-3 py-2 rounded-xl text-xs font-black uppercase border transition-all ' +
                      (diasActivos.includes(DIAS_KEYS[i])
                        ? 'text-black border-transparent'
                        : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10')}
                    style={diasActivos.includes(DIAS_KEYS[i]) ? { backgroundColor: colorP } : {}}>
                    {dia.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Apertura</label>
                <input type="time" value={horaApertura} onChange={e => setHoraApertura(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Cierre</label>
                <input type="time" value={horaCierre} onChange={e => setHoraCierre(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">
                WhatsApp del negocio (recomendado)
              </label>
              <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="Ej: 5491112345678"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
              <p className="text-[10px] text-slate-600 mt-1">Con código de país, sin + ni espacios</p>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPaso(1)}
                className="px-6 py-4 rounded-2xl font-black uppercase text-sm border border-white/10 text-slate-400 hover:bg-white/5 transition-colors">
                Volver
              </button>
              <button onClick={guardarPaso2} disabled={loading || diasActivos.length === 0}
                className="flex-1 py-4 rounded-2xl font-black italic text-lg text-black disabled:opacity-50 transition-all hover:opacity-90"
                style={{ backgroundColor: colorP }}>
                {loading ? 'Guardando...' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* PASO 3 — Primer servicio */}
        {paso === 3 && (
          <div className="bg-white/4 border border-white/8 rounded-[2rem] p-6 space-y-5">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Paso 3 de 3</p>
              <h2 className="text-xl font-black italic uppercase">Tu primer servicio</h2>
              <p className="text-slate-500 text-xs mt-1">Podés agregar más desde el panel después</p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Nombre</label>
              <input type="text" value={servicioNombre} onChange={e => setServicioNombre(e.target.value)}
                placeholder="Ej: Corte de cabello"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/25 transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Precio $</label>
                <input type="number" value={servicioPrecio} onChange={e => setServicioPrecio(e.target.value)}
                  placeholder="5000" min="0"
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Minutos</label>
                <select value={servicioDuracion} onChange={e => setServicioDuracion(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none">
                  {[15,20,30,45,60,90,120].map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPaso(2)}
                className="px-6 py-4 rounded-2xl font-black uppercase text-sm border border-white/10 text-slate-400 hover:bg-white/5 transition-colors">
                Volver
              </button>
              <button onClick={guardarPaso3} disabled={loading}
                className="flex-1 py-4 rounded-2xl font-black italic text-lg text-black disabled:opacity-50 transition-all hover:opacity-90"
                style={{ backgroundColor: colorP }}>
                {loading ? 'Finalizando...' : '¡Listo! Entrar al panel →'}
              </button>
            </div>
            <button onClick={() => guardarPaso3()}
              className="w-full text-slate-600 hover:text-slate-400 text-xs font-black uppercase transition-colors text-center">
              Saltar este paso
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
