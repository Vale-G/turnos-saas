This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Turnly: pasos de seguridad y APIs públicas

### 1) SQL que tenés que ejecutar
Aplicá las migrations nuevas en tu proyecto Supabase (incluye policy pública sólo para negocios activos):

```bash
supabase db push
```

Si preferís SQL manual en el editor de Supabase, ejecutá al menos:

```sql
drop policy if exists negocio_public_read_active on public.negocio;
create policy negocio_public_read_active on public.negocio
for select
using (slug is not null and activo = true);
```

### 2) Variables de entorno recomendadas

```env
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
ALLOWED_PUBLIC_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com
SUPERADMIN_EMAILS=admin1@dominio.com,admin2@dominio.com
MP_WEBHOOK_SECRET=...
MP_ACCESS_TOKEN=...
```

### 3) Integraciones API públicas

#### Crear turno público
`POST /api/public-turno`

Body JSON:

```json
{
  "negocio_id": "uuid",
  "servicio_id": "uuid",
  "staff_id": "uuid",
  "fecha": "2026-03-29",
  "hora": "10:30",
  "cliente_nombre": "Juan Pérez"
}
```

#### Consultar ocupados por staff/fecha
`POST /api/public-turno/availability`

Body JSON:

```json
{
  "negocio_id": "uuid",
  "staff_id": "uuid",
  "fecha": "2026-03-29"
}
```

Respuesta JSON:

```json
{
  "fecha": "2026-03-29",
  "staff_id": "uuid",
  "ocupados": ["10:00", "10:30", "11:00"]
}
```
