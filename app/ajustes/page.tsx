'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getNegocioDelUsuario } from '@/lib/getnegocio'
 
const TEMAS = [
  { id: 'emerald', nombre: 'Esmeralda', color: '#10b981' },
  { id: 'rose',    nombre: 'Rosa',      color: '#f43f5e' },
  { id: 'blue',    nombre: 'Azul',      color: '#3b82f6' },
  { id: 'amber',   nombre: 'Ámbar',     color: '#f59e0b' },
  { id: 'violet',  nombre: 'Violeta',   color: '#8b5cf6' },
  { id: 'cyan',    nombre: 'Cian',      color: '#06b6d4' },
]
 
const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
 
export default function AjustesNegocio() {
  const [negocioId, setNegocioId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tema, setTema] = useState('emerald')
  const [logoUrl, setLogoUrl] = useState('')
  const [horaApertura, setHoraApertura] = useState('09:00')
  const [horaCierre, setHoraCierre] = useState('18:00')
  const [diasLaborales, setDiasLaborales] = useState<number[]>([1, 2, 3, 4, 5])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [subiendoLogo, setSubiendoLogo] = useState(false)
  // FIX: estado para feedback del logo
  const [logoMsg, setLogoMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()
 
  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
 
      const data = await getNegocioDelUsuario(user.id)

      if (data) {
        setNegocioId(data.id)
        setNombre(data.nombre || '')
        setWhatsapp(data.whatsapp || '')
        setDescripcion(data.descripcion || '')
        setTema(data.tema || 'emerald')
        // FIX: carga logo_url correctamente
        setLogoUrl(data.logo_url || '')
        setDiasLaborales(data.dias_laborales || [1, 2, 3, 4, 5])
        if (data.hora_apertura) setHoraApertura(data.hora_apertura.slice(0, 5))
        if (data.hora_cierre) setHoraCierre(data.hora_cierre.slice(0, 5))
      }
      setLoading(false)
    }
    cargarDatos()
  }, [router])
 
  const guardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!negocioId) return
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
 
    const { error } = await supabase
      .from('negocio')
      .update({
        nombre,
        whatsapp,
        descripcion,
        tema,
        logo_url: logoUrl,          // FIX: siempre guarda logo_url actualizado
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
        dias_laborales: diasLaborales,
      })
      .eq('id', negocioId)
 
    if (error) alert(error.message)
    else alert('¡Ajustes actualizados!')
    setGuardando(false)
  }
 
  const toggleDia = (index: number) => {
    setDiasLaborales(prev =>
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    )
  }
 
  // FIX: upload de logo con feedback claro y manejo de errores
  const handleLogoUpload = async () => {
    if (!logoFile) return
    setSubiendoLogo(true)
    setLogoMsg(null)
 
    const ext = logoFile.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`
 
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, logoFile, { upsert: true })
 
    if (uploadError) {
      setLogoMsg({ tipo: 'error', texto: 'Error al subir: ' + uploadError.message })
      setSubiendoLogo(false)
      return
    }
 
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName)
 
    setLogoUrl(publicUrl)
    setLogoMsg({ tipo: 'ok', texto: 'Logo listo. Guardá los ajustes para confirmar.' })
    setSubiendoLogo(false)
  }
 
  const colorActual = TEMAS.find(t => t.id === tema)?.color || '#10b981'
 
  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase italic">
      Cargando...
    </div>
  )
 
  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')}
          className="text-slate-500 text-[10px] font-black uppercase mb-4 hover:text-white transition-colors">
          ← PANEL
        </button>
        <h1 className="text-5xl font-black uppercase italic mb-8" style={{ color: colorActual }}>
          Ajustes
        </h1>
 
        <form onSubmit={guardarAjustes}
          className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
 
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
 
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-2 block">
                Nombre del negocio
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-white/20"
              />
            </div>
 
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-2 block">
                Días de Atención
              </label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`w-9 h-9 rounded-xl font-black text-[10px] border transition-all ${
                      diasLaborales.includes(i)
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-slate-600 border-white/10'
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
 
            <div className="grid grid-cols-2 gap-4">
              {(['apertura', 'cierre'] as const).map((tipo) => (
                <div key={tipo}>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-2 block">
                    {tipo === 'apertura' ? 'Abre a las:' : 'Cierra a las:'}
                  </label>
                  <select
                    value={tipo === 'apertura' ? horaApertura : horaCierre}
                    onChange={e =>
                      tipo === 'apertura'
                        ? setHoraApertura(e.target.value)
                        : setHoraCierre(e.target.value)
                    }
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none text-xl font-black italic appearance-none text-center cursor-pointer hover:border-white/30 transition-all"
                    style={{ color: colorActual }}>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                        {i.toString().padStart(2, '0')}:00 HS
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
 
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">
                WhatsApp de Turnos
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Ej: 5491112345678"
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-white/20"
              />
              <p className="text-[10px] text-slate-600 mt-1 ml-2">Con código de país, sin + ni espacios</p>
            </div>
          </div>
 
          {/* COLUMNA DERECHA */}
          <div className="space-y-6 flex flex-col justify-between">
 
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">
                Tema Visual
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TEMAS.map(t => (
                  <button key={t.id} type="button" onClick={() => setTema(t.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      tema === t.id ? 'border-white bg-white/5' : 'border-white/10'
                    }`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-[9px] font-black uppercase">{t.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
 
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">
                Descripción del Negocio
              </label>
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none h-24 text-sm"
              />
            </div>
 
            {/* FIX: sección de logo mejorada con feedback */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">
                Logo del Negocio
              </label>
 
              {/* Preview del logo actual */}
              {logoUrl && (
                <div className="mb-3 flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <Image
                    src={logoUrl}
                    alt="Logo actual"
                    width={48}
                    height={48}
                    unoptimized
                    className="rounded-xl object-contain bg-white/5"
                    onError={() => setLogoMsg({ tipo: 'error', texto: 'No se puede mostrar la imagen. Verificá que el bucket "logos" sea público en Supabase Storage.' })}
                  />
                  <div>
                    <p className="text-xs font-black text-white">Logo actual</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 break-all">{logoUrl.split('/').pop()}</p>
                  </div>
                </div>
              )}
 
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  setLogoFile(e.target.files?.[0] || null)
                  setLogoMsg(null)
                }}
                className="w-full bg-black border border-white/10 p-3 rounded-2xl outline-none text-sm text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
 
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={subiendoLogo || !logoFile}
                className="mt-2 w-full bg-slate-800 text-white font-black uppercase py-3 rounded-2xl hover:bg-slate-700 transition-all disabled:opacity-40 text-sm">
                {subiendoLogo ? 'SUBIENDO...' : 'SUBIR LOGO'}
              </button>
 
              {/* Feedback de la subida */}
              {logoMsg && (
                <p className={`mt-2 text-xs px-3 py-2 rounded-xl font-bold ${
                  logoMsg.tipo === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {logoMsg.texto}
                </p>
              )}
            </div>
 
            <button
              type="submit"
              disabled={guardando}
              className="w-full text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
              style={{ backgroundColor: colorActual }}>
              {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>
 
        {/* Aviso sobre el bucket si no hay logo */}
        {!logoUrl && (
          <div className="mt-4 p-4 rounded-2xl border border-white/5 bg-white/2">
            <p className="text-[10px] font-black uppercase text-slate-600 mb-1">Si el logo no carga</p>
            <p className="text-[10px] text-slate-700">
              Verificá en Supabase {'>'} Storage {'>'} logos {'>'} Policies que exista una policy pública de SELECT para el rol anon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
