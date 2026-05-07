import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { senaSchema } from '@/lib/validations/sena';
import { createSenaPreference } from '@/lib/services/sena.service';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = senaSchema.parse(body);

    const supabase = createSupabaseServerClient();
    const origin = req.headers.get('origin') ?? env.NEXT_PUBLIC_SITE_URL ?? 'https://turnly.app';

    const result = await createSenaPreference(supabase, validatedData, origin);

    return NextResponse.json(result);

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    // Check if it's a custom SenaError
    if (err instanceof Error && 'status' in err) {
      return NextResponse.json({ error: err.message }, { status: err.status as number });
    }
    // Generic server error
    console.error('[Turnly] Error en ruta /api/sena:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
