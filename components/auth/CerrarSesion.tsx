import { useRouter } from 'next/navigation'

export default function CerrarSesion() {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return <button onClick={handleLogout}>Cerrar sesión</button>
}
