
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializa Resend con tu API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Definir los tipos para una mayor seguridad y claridad
interface NegocioInfo {
  nombre: string;
}

interface TurnoParaRecordatorio {
  id: string;
  fecha: string;
  hora: string;
  cliente_email: string;
  negocio: NegocioInfo | null; // El negocio puede ser un objeto o nulo
}

export async function GET(request: Request) {
  // Proteger la ruta del Cron Job
  const authToken = (request.headers.get('authorization') || '').split('Bearer ').at(1);
  if (authToken !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Calcular el rango de fechas para "mañana"
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrowStr = dayAfterTomorrow.toISOString().split('T')[0];

    // 3. Obtener los turnos de mañana desde Supabase
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('id, fecha, hora, cliente_email, negocio:negocio_id(nombre)')
      .gte('fecha', tomorrowStr)
      .lt('fecha', dayAfterTomorrowStr)
      .eq('estado', 'confirmado')
      .returns<TurnoParaRecordatorio[]>(); // 2. Aplicar el tipo explícito a la respuesta

    if (error) throw new Error(`Error consultando turnos: ${error.message}`);

    if (!turnos || turnos.length === 0) {
      return NextResponse.json({ message: 'No hay turnos para mañana. No se enviaron recordatorios.' });
    }

    // 4. Enviar un correo de recordatorio por cada turno
    for (const turno of turnos) {
      // 3. El código ahora es seguro gracias a los tipos
      if (!turno.cliente_email || !turno.negocio) continue;

      await resend.emails.send({
        from: 'recordatorios@reservas-saas.com', // Reemplaza con tu dominio verificado en Resend
        to: [turno.cliente_email],
        subject: `Recordatorio de tu turno mañana en ${turno.negocio.nombre}`,
        html: `
          <h1>¡No lo olvides!</h1>
          <p>Hola, solo queríamos recordarte de tu turno mañana.</p>
          <ul>
            <li><strong>Negocio:</strong> ${turno.negocio.nombre}</li>
            <li><strong>Día:</strong> ${new Date(turno.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</li>
            <li><strong>Hora:</strong> ${turno.hora}</li>
          </ul>
          <p>¡Te esperamos!</p>
        `
      });
    }

    return NextResponse.json({ message: `Se enviaron ${turnos.length} recordatorios exitosamente.` });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`Error en el Cron Job de recordatorios:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
