'use client'

import { supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

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

function maskToken(token: string) {
  if (!token) return ''
  const last4 = token.slice(-4)
  return `************${last4}`
}

export default function AjustesPage() {
  const [negocio, setNegocio] = useState<any>(null)
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
  const [diasLaborales, setDiasLaborales] = useState<number[]>([
    1, 2, 3, 4, 5, 6,
  ])
  const [logoUrl, setLogoUrl] = useState('')
  const [mpToken, setMpToken] = useState('')
  const [mpTokenMaskedValue, setMpTokenMaskedValue] = useState('')
  const [mpTokenEditado, setMpTokenEditado] = useState(false)
  const [emailContacto, setEmailContacto] = useState('')

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: adm } = await supabase
        .from('adminrol')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      let nId = adm?.negocio_id
      if (!nId) {
        const { data: n } = await supabase
          .from('negocio')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        nId = n?.id
      }

      if (nId) {
        const { data: neg } = await supabase
          .from('negocio')
          .select('*')
          .eq('id', nId)
          .single()
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

          const tokenEnmascarado = neg.mp_access_token
            ? maskToken(neg.mp_access_token)
            : ''
          setMpToken(tokenEnmascarado)
          setMpTokenMaskedValue(tokenEnmascarado)
          setMpTokenEditado(false)

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
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file)
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

    const updatePayload: Record<string, any> = {
      nombre,
      slug,
      tema,
      whatsapp,
      hora_apertura: apertura + ':00',
      hora_cierre: cierre + ':00',
      dias_laborales: diasLaborales,
      logo_url: logoUrl,
      email_contacto: emailContacto,
    }

    if (mpTokenEditado) {
      if (!mpToken.trim()) {
        setGuardando(false)
        return toast.error(
          'El Access Token no puede estar vacío si decidís modificarlo'
        )
      }
      updatePayload.mp_access_token = mpToken.trim()
    }

    const { error } = await supabase
      .from('negocio')
      .update(updatePayload)
      .eq('id', negocio.id)

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
            <h2 className="text-xl font-black uppercase italic mb-6">
              1. Identidad de Marca
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 flex items-center gap-6 bg-black/50 border border-white/10 p-6 rounded-3xl">
                <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo Local"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">🖼️</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                    Logo del Local
                  </label>
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
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Nombre del Local
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Link de Reservas (/reservar/...)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
                    )
                  }
                  required
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">
                  Color Principal
                </label>
                <div className="flex flex-wrap gap-4">
                  {TEMAS_DISPONIBLES.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTema(t.id)}
                      className={`w-12 h-12 rounded-full border-4 transition-all ${
                        tema === t.id
                          ? 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                          : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: t.color,
                        borderColor: tema === t.id ? 'white' : 'transparent',
                      }}
                      title={t.nombre}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem]">
            <h2 className="text-xl font-black uppercase italic mb-6">
              2. Horarios y Días Laborales
            </h2>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase text-slate-400 mb-4 block">
                ¿Qué días abrís?
              </label>
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
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Apertura
                </label>
                <input
                  type="time"
                  value={apertura}
                  onChange={(e) => setApertura(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none focus:border-white/30 [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Cierre
                </label>
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
            <h2 className="text-xl font-black uppercase italic mb-6">
              3. Contacto y Pagos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  WhatsApp de Contacto
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Email para Avisos
                </label>
                <input
                  type="email"
                  value={emailContacto}
                  onChange={(e) => setEmailContacto(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-black uppercase outline-none focus:border-white/30"
                />
              </div>
            </div>
            <div className="relative overflow-hidden bg-blue-500/10 border border-blue-500/20 p-6 rounded-3xl mt-4">
              <h3 className="text-sm font-black uppercase italic mb-4 text-blue-400">
                MercadoPago
              </h3>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                  Access Token (Producción)
                </label>
                <input
                  type="password"
                  value={mpToken}
                  onChange={(e) => {
                    const value = e.target.value
                    setMpToken(value)
                    setMpTokenEditado(value !== mpTokenMaskedValue)
                  }}
                  placeholder="APP_USR-..."
                  className="w-full bg-black/50 border border-white/10 p-5 rounded-2xl text-xs font-mono outline-none focus:border-blue-500/50"
                />
              </div>
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
