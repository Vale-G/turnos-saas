
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// Tipos para la estructura de datos que esperamos de Supabase
interface NegocioInfo {
  nombre: string;
  direccion: string | null;
}

interface ServicioInfo {
  nombre: string;
}

interface TurnoCompleto {
  fecha: string;
  hora: string;
  cliente_email: string;
  negocio: NegocioInfo | null; // Supabase puede devolver un array o un objeto. Lo tratamos como objeto.
  servicio: ServicioInfo | null;
}

const requestSchema = z.object({
  turno_id: z.string().uuid('El ID del turno debe ser un UUID válido'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: validation.error.flatten() }, { status: 400 });
    }
    const { turno_id } = validation.data;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    // CORRECCIÓN: Usamos un enfoque más robusto para los tipos.
    // 1. Quitamos .single() y casteamos el resultado de forma segura.
    const { data, error } = await supabase
      .from('turnos')
      .select('fecha, hora, cliente_email, negocio:negocio_id(nombre, direccion), servicio:servicio_id(nombre)')
      .eq('id', turno_id);
      
    if (error || !data || data.length === 0) {
      throw new Error(`Turno con ID ${turno_id} no encontrado. ${error?.message}`);
    }

    // 2. Afirmamos el tipo del objeto que vamos a usar.
    const turno = data[0] as unknown as TurnoCompleto;

    // El resto del código ya funciona con el tipo correcto
    if (!turno.cliente_email || !turno.negocio || !turno.servicio) {
      return NextResponse.json({ error: 'Faltan datos en el turno para enviar la confirmación.' }, { status: 404 });
    }

    await resend.emails.send({
      from: 'confirmacion@reservas-saas.com', 
      to: [turno.cliente_email],
      subject: `¡Turno Confirmado! Nos vemos en ${turno.negocio.nombre}`,
      html: `
        <h1>¡Tu turno está confirmado!</h1>
        <p>Hola,</p>
        <p>Este es un correo para confirmar tu turno con los siguientes detalles:</p>
        <ul>
          <li><strong>Negocio:</strong> ${turno.negocio.nombre}</li>
          <li><strong>Dirección:</strong> ${turno.negocio.direccion || 'No especificada'}</li>
          <li><strong>Servicio:</strong> ${turno.servicio.nombre}</li>
          <li><strong>Día:</strong> ${new Date(turno.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })}</li>
          <li><strong>Hora:</strong> ${turno.hora}</li>
        </ul>
        <p>Si necesitas cancelar o reprogramar, por favor contacta al negocio.</p>
        <p>¡Te esperamos!</p>
      `
    });

    return NextResponse.json({ message: 'Correo de confirmación enviado exitosamente.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`Error al enviar confirmación:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
