'use client' // Esto le dice a Next.js que esta página es interactiva (tiene botones y escritura)

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegistroNegocio() {
  // Aquí creamos las "cajitas" para guardar lo que escriba el usuario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [slug, setSlug] = useState('') 
  const [loading, setLoading] = useState(false)
  
  const router = useRouter() // Esto sirve para mandar al usuario a otra página después

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault() // Evita que la página se recargue sola
    setLoading(true)

    // PARTE 1: Crear la cuenta de usuario (Email y Contraseña)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (authError) {
      alert("Error: " + authError.message)
      setLoading(false)
      return
    }

    // PARTE 2: Guardar los datos de la peluquería en la tabla "Negocio"
    if (authData.user) {
      const { error: dbError } = await supabase
        .from('Negocio')
        .insert([{
          id: authData.user.id, // Vinculamos la cuenta con el negocio
          nombre: nombreNegocio,
          slug: slug.toLowerCase().trim().replace(/\s+/g, '-'), // Convierte "Mi Barber" en "mi-barber"
          suscripcion_tipo: 'normal'
        }])

      if (dbError) {
        alert("Error al guardar negocio: " + dbError.message)
      } else {
        alert("¡Cuenta creada! Ahora vamos al panel.")
        router.push('/dashboard') // Lo enviamos a su panel de control
      }
    }
    setLoading(false)
  }

  // PARTE 3: Lo que el usuario ve (El formulario)
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-black uppercase italic text-emerald-500 mb-8 text-center tracking-tighter">
          Crear mi <span className="text-white">Plataforma</span>
        </h1>

        <form onSubmit={handleRegistro} className="space-y-4">
          {/* Nombre del negocio */}
          <input 
            type="text" 
            placeholder="Nombre de tu negocio (ej: Barbucho)" 
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none transition-all"
            onChange={(e) => setNombreNegocio(e.target.value)}
            required
          />

          {/* URL del negocio */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="tu-nombre-aqui" 
              className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none font-mono text-emerald-400"
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <span className="absolute right-4 top-4 text-[10px] text-slate-600 font-bold uppercase">URL</span>
          </div>

          <hr className="border-slate-800 my-6" />

          {/* Datos de acceso */}
          <input 
            type="email" 
            placeholder="Email de acceso" 
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Contraseña segura" 
            className="w-full bg-black/50 border border-slate-800 p-4 rounded-2xl focus:border-emerald-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-black uppercase italic py-5 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}