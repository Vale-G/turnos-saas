'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Mandamos a todo el mundo al login por defecto
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
    </div>
  )
}