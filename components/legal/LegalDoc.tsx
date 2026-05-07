import { appConfig } from '@/app.config'
import { useTranslations } from 'next-intl'

interface LegalDocProps {
  doc: 'termsAndConditions' | 'privacyPolicy'
}

export const LegalDoc = ({ doc }: LegalDocProps) => {
  const t = useTranslations('Legal')

  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t(`${doc}.title`)}
        </h1>
        <div className="mt-10 max-w-2xl">
          <div
            dangerouslySetInnerHTML={{
              __html: t.raw(`${doc}.content`, { appName: appConfig.name }),
            }}
          />
        </div>
      </div>
    </div>
  )
}
