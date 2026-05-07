
import { mercadoPagoClient } from '@/lib/mercadopago';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Preference } from 'mercadopago';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { negocioId, plan, precio } = await req.json();

    if (!negocioId || !plan || !precio) {
        return NextResponse.json({ error: 'Faltan datos para la suscripción.' }, { status: 400 });
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Acceso no autorizado.' }, { status: 401 });
    }

    // Verificación de propiedad: Asegurar que el usuario es dueño del negocio
    const { data: negocio, error: negocioError } = await supabase
        .from('negocio')
        .select('owner_id')
        .eq('id', negocioId)
        .single();

    if (negocioError || !negocio) {
        return NextResponse.json({ error: 'Negocio no encontrado.' }, { status: 404 });
    }

    if (negocio.owner_id !== user.id) {
        return NextResponse.json({ error: 'No tienes permiso para realizar esta acción.' }, { status: 403 });
    }

    const preferenceData = {
        items: [
            {
                id: `${negocioId}-${plan}`,
                title: `Suscripción Turnly - Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
                quantity: 1,
                unit_price: precio,
                currency_id: 'ARS', 
            },
        ],
        back_urls: {
            success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?suscripcion=exito`,
            failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?suscripcion=fallo`,
            pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?suscripcion=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/suscripcion/webhook`,
        external_reference: negocioId,
    };

    try {
        const client = new Preference(mercadoPagoClient);
        const result = await client.create({ body: preferenceData });

        return NextResponse.json({ checkoutUrl: result.init_point }, { status: 200 });

    } catch (error) {
        console.error('Error al crear preferencia de MercadoPago:', error);
        return NextResponse.json({ error: 'No se pudo iniciar el proceso de pago.' }, { status: 500 });
    }
}
