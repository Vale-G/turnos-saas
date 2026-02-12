'use client'
import { supabase } from '@/lib/supabase'

export default function RecoverPage() {
  const handleGoogleLogin = async () => {
    // Esto dispara el login de Google y te manda al dashboard al terminar
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : '' 
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10">
      <div className="w-24 h-24 bg-gradient-to-br from-[#10b981] to-emerald-600 rounded-full flex items-center justify-center mb-8 shadow-2xl">
        <span className="text-5xl">🔐</span>
      </div>
      <h1 className="text-4xl font-black text-white mb-2 italic uppercase">Recuperar Acceso</h1>
      <p className="text-slate-500 mb-8 font-bold">ENTRÁ PARA RECUPERAR TU ROL DE SUPERADMIN</p>
      
      <div className="space-y-4 w-full max-w-xs">
        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-3"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
          Entrar con Google
        </button>
      </div>
    </div>
  )
}