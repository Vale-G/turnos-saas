'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const TEMAS = [
  { id: 'emerald', nombre: 'Esmeralda', color: '#10b981' },
  { id: 'rose', nombre: 'Rosa', color: '#f43f5e' },
  { id: 'blue', nombre: 'Azul', color: '#3b82f6' },
  { id: 'amber', nombre: 'Ámbar', color: '#f59e0b' },
]

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export default function AjustesNegocio() {
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [senaPorcentaje, setSenaPorcentaje] = useState(0)
  const [requiereSena, setRequiereSena] = useState(false)
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
  const router = useRouter()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('Negocio').select('*').eq('owner_id', user.id).single()

      if (data) {
        setNombre(data.nombre || '')
        setWhatsapp(data.whatsapp || '')
        setDescripcion(data.descripcion || '')
        setTema(data.tema || 'emerald')
        setLogoUrl(data.logo_url || '')
        setDiasLaborales(data.dias_laborales || [1,2,3,4,5])
        if (data.hora_apertura) setHoraApertura(data.hora_apertura.slice(0,5))
        if (data.hora_cierre) setHoraCierre(data.hora_cierre.slice(0,5))
      }
      setLoading(false)
    }
    cargarDatos()
  }, [])

  const guardarAjustes = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('Negocio')
      .update({ 
        nombre, whatsapp, descripcion, tema, 
        logo_url: logoUrl, hora_apertura: horaApertura, 
        hora_cierre: horaCierre, dias_laborales: diasLaborales 
      })
      .eq('owner_id', user?.id)

    if (error) alert(error.message)
    else alert("¡Ajustes actualizados!")
    setGuardando(false)
  }

  const toggleDia = (index: number) => {
    setDiasLaborales(prev => 
      prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]
    )
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setSubiendoLogo(true)
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage.from('logos').upload(fileName, logoFile)
    if (error) {
      alert('Error subiendo logo: ' + error.message)
    } else {
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName)
      setLogoUrl(publicUrl)
    }
    setSubiendoLogo(false)
  }

  const colorActual = TEMAS.find(t => t.id === tema)?.color || '#10b981'

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-black uppercase italic">Cargando...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/dashboard')} className="text-slate-500 text-[10px] font-black uppercase mb-4 hover:text-white transition-colors">← PANEL</button>
        <h1 className="text-5xl font-black uppercase italic mb-8" style={{ color: colorActual }}>Ajustes</h1>

        <form onSubmit={guardarAjustes} className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-2 block">Días de Atención</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`w-9 h-9 rounded-xl font-black text-[10px] border transition-all ${diasLaborales.includes(i) ? 'bg-white text-black border-white' : 'bg-black text-slate-600 border-white/10'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['apertura', 'cierre'].map((tipo) => (
                <div key={tipo}>
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-2 mb-2 block">
                    {tipo === 'apertura' ? 'Abre a las:' : 'Cierra a las:'}
                  </label>
                  <select 
                    value={tipo === 'apertura' ? horaApertura : horaCierre}
                    onChange={(e) => tipo === 'apertura' ? setHoraApertura(e.target.value) : setHoraCierre(e.target.value)}
                    className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none text-xl font-black italic appearance-none text-center cursor-pointer hover:border-white/30 transition-all"
                    style={{ color: colorActual }}
                  >
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
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">WhatsApp de Turnos</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-white/20" />
            </div>
          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6 flex flex-col justify-between">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">Tema Visual</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMAS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTema(t.id)} className={`flex items-center gap-3 p-3 rounded-xl border ${tema === t.id ? 'border-white bg-white/5' : 'border-white/10'} transition-all`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></div>
                    <span className="text-[9px] font-black uppercase">{t.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">Descripción del Negocio</label>
              <textarea 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none h-24 text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2 block mb-2">Logo del Negocio</label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="w-full bg-black border border-white/10 p-4 rounded-2xl outline-none focus:border-white/20" />
              <button type="button" onClick={handleLogoUpload} disabled={subiendoLogo || !logoFile} className="mt-2 w-full bg-slate-700 text-white font-black uppercase py-2 rounded-2xl hover:bg-slate-600 transition-all">
                {subiendoLogo ? 'SUBIENDO...' : 'SUBIR LOGO'}
              </button>
              {logoUrl && <Image src={logoUrl} alt="Logo" width={48} height={48} className="mt-2 rounded-xl object-cover" />}
            </div>

            <button type="submit" disabled={guardando} className="w-full text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] transition-all" style={{ backgroundColor: colorActual }}>
              {guardando ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}