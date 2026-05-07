'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { SocialIcons } from './social-icons'

export function Footer() {
  const t = useTranslations('Footer')
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white/5">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <SocialIcons />
        <div className="mt-8 flex justify-center space-x-6 md:mt-0">
          <Link
            href="/terminos"
            className="text-sm leading-6 text-slate-400 hover:text-white"
          >
            {t('terms')}
          </Link>
          <Link
            href="/privacidad"
            className="text-sm leading-6 text-slate-400 hover:text-white"
          >
            {t('privacy')}
          </Link>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <p className="text-center text-sm leading-6 text-slate-500">
            {t('copyright', { year })}
          </p>
        </div>
      </div>
    </footer>
  )
}
