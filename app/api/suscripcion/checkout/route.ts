
import { createServerClient } from '@supabase/auth-helpers-nextjs'; // <-- CORREGIDO
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { mercadoPagoClient } from '@/lib/mercadopago';
import { Preference } from 'mercadopago';

export async function POST(req: Request) {
    const { negocioId, ...preferenceData } = await req.json();

    if (!negocioId) {
        return NextResponse.json({ error: 'ID de negocio no proporcionado' }, { status: 400 });
    }

    const supabase = createServerClient({ cookies }); // <-- CORREGIDO
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 401 });
    }

    const { data: negocio, error: fetchError } = await supabase
        .from('negocio')
        .select('user_id')
        .eq('id', negocioId)
        .single();

    if (fetchError || !negocio) {
        return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    if (negocio.user_id !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para realizar esta acción' }, { status: 403 });
    }

    try {
        const preference = new Preference(mercadoPagoClient);
        const result = await preference.create({ body: preferenceData });

        return NextResponse.json({ id: result.id });
    } catch (error) {
        console.error('Error al crear la preferencia de MercadoPago:', error);
        return NextResponse.json({ error: 'No se pudo crear la preferencia de pago' }, { status: 500 });
    }
}
