import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl';

// Centralized i18n configuration
export const i18n = {
  defaultLocale: 'es',
  locales: ['en', 'es'],
} as const;

export type Locale = (typeof i18n)['locales'][number];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!i18n.locales.includes(locale as any)) {
    notFound();
  }

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
