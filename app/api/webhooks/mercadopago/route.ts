
import { mercadoPagoClient } from '@/lib/mercadopago';
import { createServerClient } from '@supabase/ssr';
import { Payment } from 'mercadopago';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  
  if (body.type !== 'payment') {
    return NextResponse.json({ status: 'ignored', reason: 'Not a payment notification' });
  }

  const paymentId = body.data.id;

  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID no encontrado en la notificación' }, { status: 400 });
  }

  try {
    const payment = await new Payment(mercadoPagoClient).get({ id: paymentId });

    if (!payment || !payment.external_reference) {
      return NextResponse.json({ status: 'ignored', reason: 'Missing external reference' });
    }

    const turnoId = payment.external_reference; 
    const paymentStatus = payment.status; 

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    let nuevoEstadoTurno: 'confirmado' | 'fallido' | null = null;

    if (paymentStatus === 'approved') {
      nuevoEstadoTurno = 'confirmado';
    } else if (['rejected', 'cancelled', 'refunded'].includes(paymentStatus!)) {
      nuevoEstadoTurno = 'fallido';
    }

    if (nuevoEstadoTurno) {
      // --- CAMBIO CLAVE: Actualizar la tabla 'turnos' en lugar de 'reservas' ---
      const { error } = await supabase
        .from('turnos')
        .update({ estado: nuevoEstadoTurno })
        .eq('id', turnoId);

      if (error) {
        console.error(`Error al actualizar turno ${turnoId} a ${nuevoEstadoTurno}:`, error);
        return NextResponse.json({ error: 'Error al actualizar la base de datos' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`Error procesando webhook de MercadoPago para paymentId ${paymentId}:`, errorMessage);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
