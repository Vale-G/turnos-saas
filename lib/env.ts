
export const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN!,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL!,
    NODE_ENV: process.env.NODE_ENV,
} as const;

const requiredEnvVars: (keyof typeof env)[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'MP_ACCESS_TOKEN',
    'NEXT_PUBLIC_SITE_URL',
];

const missing = requiredEnvVars.filter((key) => !env[key]);

if (missing.length > 0) {
    throw new Error(
      `[Turnly] Variables de entorno faltantes: ${missing.join(', ')}`
    );
}
