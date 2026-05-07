import { brandConfig } from '@/config/brand'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export function Header() {
  return (
    <header className="p-4 flex justify-between items-center">
      <Link href="/" className="font-bold text-lg">
        {brandConfig.appName}
      </Link>
      {brandConfig.themeMode === 'with-toggle' && <ThemeToggle />}
    </header>
  )
}
