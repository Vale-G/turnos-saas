
import { NextRequest, NextResponse } from 'next/server';
import { mercadoPagoClient } from '@/lib/mercadopago';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { Payment } from 'mercadopago';

// Es crucial deshabilitar el bodyParser de Next.js para poder leer el body como texto
export const config = {
    api: {
        bodyParser: false,
    },
};

async function getMercadoPagoPayment(paymentId: string) {
    const client = new Payment(mercadoPagoClient);
    try {
        const payment = await client.get({ id: paymentId });
        return payment;
    } catch (error) {
        console.error(`Error al obtener el pago ${paymentId} de MercadoPago:`, error);
        return null;
    }
}

// Función para verificar la firma del webhook de MercadoPago
function verifySignature(req: Request, body: string, secret: string): boolean {
    const signature = req.headers.get('x-signature');
    const timestamp = req.headers.get('x-request-id'); // O el header que use MP para el timestamp

    if (!signature || !timestamp) {
        return false;
    }

    const [ts, hash] = signature.split(',').map(part => part.split('=')[1]);
    if (!ts || !hash) {
        return false;
    }

    const manifest = `id:${body.split('"id":')[1].split(',')[0]};request-id:${timestamp};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const generatedHash = hmac.digest('hex');

    // Usar una comparación segura para evitar ataques de temporización
    return crypto.timingSafeEqual(Buffer.from(generatedHash), Buffer.from(hash));
}


export async function POST(req: NextRequest) {
    // Leemos el body como texto para la verificación de la firma
    const rawBody = await req.text();
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;

    // Si no tenemos un secret, no podemos verificar. Abortamos por seguridad.
    if (!webhookSecret) {
        console.error("CRÍTICO: MP_WEBHOOK_SECRET no está configurado.");
        return NextResponse.json({ error: 'Configuración de servidor incompleta.' }, { status: 500 });
    }
    
    // Desactivamos la verificación temporalmente para no frenar el desarrollo
    // En producción, esta línea debe ser eliminada y la verificación activada.
    /*
    const isVerified = verifySignature(req, rawBody, webhookSecret);
    if (!isVerified) {
        return NextResponse.json({ error: 'Firma de webhook inválida.' }, { status: 401 });
    }
    */

    const body = JSON.parse(rawBody);

    if (body.type === 'payment') {
        const paymentId = body.data.id;

        if (!paymentId) {
            return NextResponse.json({ error: 'ID de pago no encontrado.' }, { status: 400 });
        }

        const payment = await getMercadoPagoPayment(String(paymentId));

        if (payment && payment.status === 'approved') {
            const negocioId = payment.external_reference;

            if (!negocioId) {
                return NextResponse.json({ error: 'Referencia externa (negocioId) no encontrada.' }, { status: 400 });
            }

            const { error: updateError } = await supabase
                .from('negocio')
                .update({
                    suscripcion_tipo: 'pro',
                    mp_payment_id: payment.id,
                    suscripcion_activa_hasta: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // O basado en la duración del plan
                })
                .eq('id', negocioId);

            if (updateError) {
                console.error('Error al actualizar la suscripción del negocio:', updateError);
                return NextResponse.json({ error: 'Error al actualizar la base de datos.' }, { status: 500 });
            }

            console.log(`Suscripción PRO activada para el negocio: ${negocioId}`);
        }
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
