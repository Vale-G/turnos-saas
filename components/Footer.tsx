import Link from 'next/link'
import { brandConfig } from '@/config/brand'

export default function Footer() {
  const year = new Date().getFullYear()
  const appName = brandConfig.appName

  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-400 md:flex-row">
        <p className="text-center md:text-left">
          © {year} {appName}. Todos los derechos reservados.
        </p>

        <nav className="flex items-center gap-5">
          <Link href="/terminos" className="transition-colors hover:text-white">
            Términos
          </Link>
          <Link href="/privacidad" className="transition-colors hover:text-white">
            Privacidad
          </Link>
        </nav>
      </div>
    </footer>
  )
}
