import { MetadataRoute } from 'next'
import { brandConfig } from '@/config/brand'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brandConfig.appName,
    short_name: brandConfig.appName,
    description: `${brandConfig.appName}: software de gestión y reservas.`,
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: brandConfig.brandColor,
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
