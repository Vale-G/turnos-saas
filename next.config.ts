
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

// Generate a strict Content Security Policy
// https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' *.stripe.com *.mercadopago.com *.vercel.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: *.stripe.com *.mercadolibre.com;
    font-src 'self';
    connect-src 'self' *.stripe.com *.mercadopago.com;
    frame-src 'self' *.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
`;

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Asynchronously configure headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Set the Content Security Policy
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
          // Prevent XSS attacks by disabling the built-in XSS auditor
          { key: 'X-XSS-Protection', value: '0' },
          // Prevent clickjacking attacks
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Enforce HTTPS
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Control how much information is sent when navigating to other sites
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          // Control which browser features can be used
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
