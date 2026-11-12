'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { toast } from 'sonner'
import Image from 'next/image'
import { BUSINESS_TYPES, VISUAL_MODES, VISUAL_STYLES, getAppearance } from '@/lib/personalization.mjs'

const TEMAS_DISPONIBLES = [
  { id: 'emerald', color: '#10b981', nombre: 'Esmeralda' },
  { id: 'rose', color: '#f43f5e', nombre: 'Rosa' },
  { id: 'amber', color: '#fbbf24', nombre: 'Dorado' },
  { id: 'blue', color: '#3b82f6', nombre: 'Azul' },
  { id: 'violet', color: '#8b5cf6', nombre: 'Violeta' },
  { id: 'white', color: '#ffffff', nombre: 'Blanco' },
]

const DIAS_SEMANA = [
  { id: 1, letra: 'L' },
  { id: 2, letra: 'M' },
  { id: 3, letra: 'X' },
  { id: 4, letra: 'J' },
  { id: 5, letra: 'V' },
  { id: 6, letra: 'S' },
  { id: 0, letra: 'D' },
]

type NegocioAjustes = {
  id: string; nombre: string; slug: string; tema: string | null; whatsapp: string | null
  hora_apertura: string | null; hora_cierre: string | null; dias_laborales: number[] | null
  logo_url: string | null; email_contacto: string | null
  rubro: string | null; estilo_visual: string | null; modo_visual: string | null
}

export default function AjustesPage() {
  const [negocio, setNegocio] = useState<NegocioAjustes | null>(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [tema, setTema] = useState('emerald')
  const [whatsapp, setWhatsapp] = useState('')
  const [apertura, setApertura] = useState('09:00')
  const [cierre, setCierre] = useState('20:00')
  const [diasLaborales, setDiasLaborales] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [logoUrl, setLogoUrl] = useState('')
  const [mpConnected, setMpConnected] = useState(false)
  const [mpOauth, setMpOauth] = useState(false)
  const [mpAvailable, setMpAvailable] = useState(false)
  const [mpAccountId, setMpAccountId] = useState<string | null>(null)
  const [desconectandoMp, setDesconectandoMp] = useState(false)
  const [emailContacto, setEmailContacto] = useState('')
  const [rubro, setRubro] = useState('general')
  const [estiloVisual, setEstiloVisual] = useState('sereno')
  const [modoVisual, setModoVisual] = useState('oscuro')

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: adm } = await supabase.from('adminrol').select('negocio_id,role').eq('user_id', user.id).maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase.from('negocio').select('id').eq('owner_id', user.id).maybeSingle()
        nId = n?.id
      }

      if (nId) {
        const { data: neg } = await supabase.from('negocio').select('id,nombre,slug,tema,whatsapp,hora_apertura,hora_cierre,dias_laborales,logo_url,email_contacto,rubro,estilo_visual,modo_visual').eq('id', nId).single()
        if (neg) {
          setNegocio(neg)
          setNombre(neg.nombre || '')
          setSlug(neg.slug || '')
          setTema(neg.tema || 'emerald')
          setWhatsapp(neg.whatsapp || '')
          setApertura(neg.hora_apertura?.slice(0, 5) || '09:00')
          setCierre(neg.hora_cierre?.slice(0, 5) || '20:00')
          setDiasLaborales(neg.dias_laborales || [1, 2, 3, 4, 5, 6])
          setLogoUrl(neg.logo_url || '')
          setRubro(neg.rubro || 'general')
          setEstiloVisual(neg.estilo_visual || 'sereno')
          setModoVisual(neg.modo_visual || 'oscuro')

          const credential = await fetch('/api/ajustes/mercadopago', { cache: 'no-store' }).then((response) => response.ok ? response.json() : { connected: false })
          setMpConnected(Boolean(credential.connected))
          setMpOauth(Boolean(credential.oauth))
          setMpAvailable(Boolean(credential.available))
          setMpAccountId(credential.accountId ?? null)

          const mpResult = new URLSearchParams(window.location.search).get('mp')
          if (mpResult === 'connected') toast.success('Mercado Pago quedó conectado correctamente')
          if (mpResult === 'error' || mpResult === 'invalid') toast.error('No se pudo completar la conexión con Mercado Pago')
          if (mpResult === 'not-configured') toast.error('Falta configurar la aplicación de Mercado Pago en Turnly')

          setEmailContacto(neg.email_contacto || '')
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setSubiendoLogo(true)
      if (!e.target.files || e.target.files.length === 0) return
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${negocio?.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file)
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = supabase.storage.from('logos').getPublicUrl(fileName)
      setLogoUrl(publicUrl)
      toast.success('Logo cargado correctamente.')
    } catch {
      toast.error('Error al subir el logo.')
    } finally {
      setSubiendoLogo(false)
    }
  }

  const toggleDia = (id: number) => {
    if (diasLaborales.includes(id)) {
      setDiasLaborales(diasLaborales.filter((d) => d !== id))
    } else {
      setDiasLaborales([...diasLaborales, id].sort())
    }
  }

  const guardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const updatePayload: Record<string, string | number[]> = {
      nombre,
      slug,
      tema,
      whatsapp,
      hora_apertura: apertura + ':00',
      hora_cierre: cierre + ':00',
      dias_laborales: diasLaborales,
      logo_url: logoUrl,
      email_contacto: emailContacto,
      rubro,
      estilo_visual: estiloVisual,
      modo_visual: modoVisual,
    }

    if (!negocio) { setGuardando(false); return }
    const { error } = await supabase.from('negocio').update(updatePayload).eq('id', negocio.id)

    setGuardando(false)
    if (error) return toast.error('Error al guardar ajustes')

    toast.success('Ajustes actualizados correctamente')
    setTimeout(() => window.location.reload(), 1000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-black animate-pulse text-white uppercase tracking-widest text-2xl">
        CARGANDO...
      </div>
    )
  }

  const colorP = getThemeColor(tema)
  const preview = getAppearance({ businessType: rubro, visualStyle: estiloVisual, visualMode: modoVisual })

  async function desconectarMercadoPago() {
    setDesconectandoMp(true)
    const response = await fetch('/api/ajustes/mercadopago', { method: 'DELETE' })
    setDesconectandoMp(false)
    if (!response.ok) return toast.error('No se pudo desconectar Mercado Pago')
    setMpConnected(false)
    setMpOauth(false)
    setMpAccountId(null)
    toast.success('Mercado Pago desconectado')
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mb-4 hover:text-white transition-colors"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">
            Ajustes del <span style={{ color: colorP }}>Local</span>
          </h1>
        </header>

        <form onSubmit={guardarAjustes} className="space-y-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black uppercase italic mb-6">1. Identidad de Marca</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-center gap-6 bg-black/50 border border-white/10 p-6 rounded-3xl">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? <Image src={logoUrl} alt="Logo del negocio" width={96} height={96} unoptimized className="w-full h-full object-cover" /> : <span className="text-3xl">🖼️</span>}
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Logo del Local</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSubirLogo}
                    disabled={subiendoLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase px-6 py-3 rounded-xl cursor-pointer transition-all inline-block border border-white/10"
                  >
                    {subiendoLogo ? 'SUBIENDO...' : 'SELECCIONAR FOTO'}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Nombre del Local</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Link de Reservas (/reservar/...)</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  required
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">Color Principal</label>
                <div className="flex flex-wrap gap-4">
                  {TEMAS_DISPONIBLES.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTema(t.id)}
                      className={`w-12 h-12 rounded-full border-4 transition-all ${
                        tema === t.id ? 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: t.color, borderColor: tema === t.id ? 'white' : 'transparent' }}
                      title={t.nombre}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black uppercase italic mb-2">2. Experiencia de reservas</h2>
            <p className="text-sm text-slate-400 mb-8">Adaptá la página pública al rubro y la personalidad de tu marca.</p>
            <div className="space-y-7">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Rubro</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map((item) => (
                    <button type="button" key={item.id} onClick={() => setRubro(item.id)}
                      className="rounded-2xl border p-4 text-left transition-all"
                      style={{ borderColor: rubro === item.id ? colorP : 'rgba(255,255,255,.1)', background: rubro === item.id ? colorP + '15' : 'rgba(0,0,0,.25)' }}>
                      <span className="block text-sm font-black">{item.name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Estilo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VISUAL_STYLES.map((item) => <button type="button" key={item.id} onClick={() => setEstiloVisual(item.id)}
                      className="border px-4 py-3 text-xs font-black transition-all"
                      style={{ borderRadius: item.radius, borderColor: estiloVisual === item.id ? colorP : 'rgba(255,255,255,.1)', background: estiloVisual === item.id ? colorP + '18' : 'rgba(0,0,0,.25)' }}>{item.name}</button>)}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">Apariencia</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VISUAL_MODES.map((item) => <button type="button" key={item.id} onClick={() => setModoVisual(item.id)}
                      className="rounded-2xl border px-4 py-3 text-xs font-black transition-all"
                      style={{ borderColor: modoVisual === item.id ? colorP : 'rgba(255,255,255,.1)', background: modoVisual === item.id ? colorP + '18' : 'rgba(0,0,0,.25)' }}>{item.name}</button>)}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden border p-5 transition-all" style={{ background: preview.background, color: preview.foreground, borderColor: preview.border, borderRadius: preview.radius }}>
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center font-black text-black" style={{ background: colorP, borderRadius: preview.radius }}>{nombre?.[0] || 'T'}</div>
                  <div><p className="font-black" style={{ letterSpacing: preview.tracking }}>{nombre || 'Tu negocio'}</p><p className="text-xs" style={{ color: preview.muted }}>Vista previa de la reserva</p></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {['Servicio principal', 'Próximo horario'].map((label) => <div key={label} className="border p-4" style={{ background: preview.surface, borderColor: preview.border, borderRadius: preview.radius }}><p className="text-xs" style={{ color: preview.muted }}>{label}</p><p className="mt-1 text-sm font-bold">{label === 'Próximo horario' ? '10:30' : 'Consulta'}</p></div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black uppercase italic mb-6">3. Horarios y Días Laborales</h2>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">¿Qué días abrís?</label>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA.map((d) => (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggleDia(d.id)}
                    className={`w-14 h-14 rounded-2xl font-black text-lg transition-all ${
                      diasLaborales.includes(d.id)
                        ? 'bg-white text-black shadow-lg scale-105'
                        : 'bg-black/50 border border-white/10 text-slate-500 hover:bg-white/5'
                    }`}
                  >
                    {d.letra}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Apertura</label>
                <input
                  type="time"
                  value={apertura}
                  onChange={(e) => setApertura(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-white/30 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Cierre</label>
                <input
                  type="time"
                  value={cierre}
                  onChange={(e) => setCierre(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-white/30 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black uppercase italic mb-6">4. Contacto y Pagos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">WhatsApp de Contacto</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Email para Avisos</label>
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(e) => setEmailContacto(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
            </div>
            <div className="relative overflow-hidden bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl mt-4">
              <h3 className="text-sm font-black uppercase italic mb-2 text-blue-400">Mercado Pago</h3>
              <p className="text-sm text-slate-300 mb-5">
                Vinculá tu cuenta para recibir directamente las señas y cobros de tus clientes. Turnly no recibe ni almacena datos de tarjetas.
              </p>
              {mpConnected ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-black uppercase text-emerald-400">✓ Cuenta conectada</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {mpAccountId ? `Cuenta ${mpAccountId}` : 'Credencial existente'}
                      {!mpOauth && ' · reconectala para activar renovación automática'}
                    </p>
                  </div>
                  <button type="button" onClick={desconectarMercadoPago} disabled={desconectandoMp}
                    className="rounded-2xl border border-rose-500/30 px-5 py-4 text-xs font-black uppercase text-rose-300 hover:bg-rose-500/10 disabled:opacity-50">
                    {desconectandoMp ? 'Desconectando…' : 'Desconectar'}
                  </button>
                </div>
              ) : mpAvailable ? (
                <a href="/api/ajustes/mercadopago/connect"
                  className="inline-flex rounded-2xl bg-[#009ee3] px-6 py-4 text-sm font-black uppercase text-white hover:bg-[#008ed0]">
                  Conectar Mercado Pago
                </a>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  La conexión estará disponible cuando se configure la aplicación OAuth de Turnly.
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-xl text-black shadow-2xl active:scale-95 transition-all"
            style={{ backgroundColor: colorP }}
          >
            {guardando ? 'GUARDANDO...' : 'GUARDAR AJUSTES'}
          </button>
        </form>
      </div>
    </div>
  )
}
