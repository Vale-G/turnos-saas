import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/agenda', destination: '/turnos?vista=semana', permanent: false },
      { source: '/mis-reservas', destination: '/mis-turnos', permanent: false },
      { source: '/politica-de-privacidad', destination: '/privacidad', permanent: false },
      { source: '/legal/politica-de-privacidad', destination: '/privacidad', permanent: false },
      { source: '/terminos-y-condiciones', destination: '/terminos', permanent: false },
      { source: '/legal/terminos-y-condiciones', destination: '/terminos', permanent: false },
    ]
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    ] }]
  },
};

export default nextConfig;
