
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
// Crearemos este componente de email en el siguiente paso
// import ReminderEmail from '@/components/emails/reminder-email';

// Asegúrate de que las variables de entorno estén bien configuradas en Vercel
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);

// El token secreto que solo Vercel conoce
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // 1. Seguridad: Verificar el token de autorización
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2. Obtener la fecha de mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${year}-${month}-${day}`;

    // 3. Buscar las citas para mañana (ahora pidiendo el email)
    const { data: citas, error } = await supabase
      .from('citas')
      .select(`
        id,
        fecha,
        hora,
        clientes ( nombre, email ), // <-- CAMBIO AQUÍ: email en lugar de telefono
        servicios ( nombre_servicio ),
        negocios ( nombre )
      `)
      .eq('fecha', tomorrowStr)
      .eq('estado', 'confirmada');

    if (error) {
      console.error('Error al buscar citas:', error);
      throw error;
    }

    if (!citas || citas.length === 0) {
      console.log('No hay citas para mañana. No se enviarán recordatorios.');
      return NextResponse.json({ message: 'No hay citas para mañana.' });
    }

    console.log(`Se encontraron ${citas.length} citas para mañana. Preparando emails...`);

    // 4. Procesar cada cita y enviar email
    for (const cita of citas) {
      const clienteNombre = cita.clientes?.nombre;
      const clienteEmail = cita.clientes?.email;
      const servicioNombre = cita.servicios?.nombre_servicio;
      const negocioNombre = cita.negocios?.nombre;
      const horaFormateada = cita.hora.substring(0, 5);

      if (clienteNombre && clienteEmail && servicioNombre && negocioNombre) {
        const asunto = `Recordatorio de tu cita en ${negocioNombre} mañana`;
        const mensaje = `¡Hola ${clienteNombre}! Te recordamos tu cita para ${servicioNombre} mañana a las ${horaFormateada}. ¡Te esperamos!`;

        try {
          // Usamos Resend para enviar el email
          await resend.emails.send({
            from: 'onboarding@resend.dev', // <-- Dirección especial de prueba de Resend
            to: clienteEmail,
            subject: asunto,
            // En el futuro podemos usar un componente de React para un email más bonito
            html: `<p>${mensaje}</p>` 
          });
          console.log(`Recordatorio enviado a ${clienteEmail}`);
        } catch (emailError) {
          console.error(`Error al enviar email a ${clienteEmail}:`, emailError);
        }

      } else {
        console.warn(`Datos incompletos para la cita ID ${cita.id}. No se puede enviar email.`);
      }
    }

    return NextResponse.json({ message: `Proceso de recordatorios por email completado. ${citas.length} citas procesadas.` });

  } catch (error) {
    console.error('Error en el cron job de recordatorios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
