'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { brandConfig } from '@/config/brand'

export default function TermsPage() {
  const t = useTranslations('TermsPage')
  const appName = brandConfig.appName
  const updatedAt = 'April 9, 2026' // Example date

  const sections = [
    'serviceObject',
    'accountRegistration',
    'billing',
    'acceptableUse',
    'liabilityLimitation',
    'intellectualProperty',
  ]

  return (
    <main className="min-h-screen bg-[#020617] text-white px-6 py-12 md:px-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors"
        >
          {t('backToHome')}
        </Link>

        <h1 className="mt-8 text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
          {t('title')}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-slate-500">
          {t('lastUpdated', { updatedAt })}
        </p>

        <div className="mt-10 space-y-6 text-slate-200">
          {sections.map((section) => (
            <section
              key={section}
              className="rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <h2 className="text-xl font-black uppercase italic text-white">
                {t(`sections.${section}.title`)}
              </h2>
              <p className="mt-3 text-sm leading-relaxed">
                {t(`sections.${section}.content`, { appName })}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
