'use client'
import { supabase } from '@/lib/supabase'

export default function RegistroPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback` 
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10">
      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md text-center">
        <h1 className="text-3xl font-black text-white mb-2 uppercase italic">Crear Cuenta</h1>
        <p className="text-slate-400 mb-8">Unite a la plataforma y gestioná tu negocio</p>
        
        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-lg"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
          Registrarse con Google
        </button>

        <p className="mt-6 text-slate-500 text-sm">
          ¿Ya tenés cuenta? <a href="/login" className="text-emerald-400 hover:underline">Iniciá sesión</a>
        </p>
      </div>
    </div>
  )
}
