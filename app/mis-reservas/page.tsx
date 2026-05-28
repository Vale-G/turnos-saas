
'use client'

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { SkeletonLoader } from '../reservar/[slug]/components/LoadingSkeleton'; // Reutilizamos el skeleton

// 1. CORRECCIÓN: Las relaciones de Supabase vienen como arrays
type TurnoConDetalles = {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  negocio: { nombre: string }[] | null;
  servicio: { nombre: string }[] | null;
};

export default function MisReservasPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [turnos, setTurnos] = useState<TurnoConDetalles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndTurnos = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Debes iniciar sesión para ver tus reservas.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('turnos')
        .select('id, fecha, hora, estado, negocio:negocio_id(nombre), servicio:servicio_id(nombre)')
        .eq('cliente_id', user.id)
        .order('fecha', { ascending: false });

      if (fetchError) {
        setError('No pudimos cargar tus reservas. Inténtalo de nuevo.');
        console.error(fetchError);
      } else {
        // El tipo de `data` ahora coincide con `TurnoConDetalles[]`
        setTurnos(data || []);
      }
      setLoading(false);
    };

    fetchUserAndTurnos();
  }, [supabase]);

  const hoy = new Date().toISOString().split('T')[0];
  const proximosTurnos = turnos.filter(t => t.fecha >= hoy);
  const turnosPasados = turnos.filter(t => t.fecha < hoy);

  // 2. CORRECCIÓN: Accedemos al primer elemento del array de la relación
  const renderTurno = (turno: TurnoConDetalles) => (
    <div key={turno.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h3 className="font-bold text-lg text-white">{turno.negocio?.[0]?.nombre || 'Negocio no disponible'}</h3>
      <p className="text-gray-300">Servicio: {turno.servicio?.[0]?.nombre || 'No especificado'}</p>
      <p className="text-gray-300">Fecha: {new Date(turno.fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })} a las {turno.hora}</p>
      <span className={`mt-2 inline-block px-2 py-1 text-xs font-semibold rounded-full ${ 
        turno.estado === 'confirmado' ? 'bg-green-500 text-green-900' : 
        turno.estado === 'pendiente_pago' ? 'bg-yellow-500 text-yellow-900' : 'bg-red-500 text-red-900' 
      }`}>
        {turno.estado.replace('_', ' ')}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8">
      <h1 className="text-4xl font-bold mb-8">Mis Reservas</h1>
      
      {loading && (
        <div className="space-y-4">
          <SkeletonLoader className="h-24 w-full" />
          <SkeletonLoader className="h-24 w-full" />
          <SkeletonLoader className="h-24 w-full" />
        </div>
      )}

      {error && <p className="text-red-400 text-center">{error}</p>}

      {!loading && !error && turnos.length === 0 && (
        <p className="text-gray-400 text-center mt-8">Aún no tienes ninguna reserva registrada.</p>
      )}

      {!loading && !error && turnos.length > 0 && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Próximas Reservas</h2>
            {proximosTurnos.length > 0 ? (
              <div className="space-y-4">{proximosTurnos.map(renderTurno)}</div>
            ) : (
              <p className="text-gray-500">No tienes reservas futuras.</p>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Reservas Pasadas</h2>
            {turnosPasados.length > 0 ? (
              <div className="space-y-4">{turnosPasados.map(renderTurno)}</div>
            ) : (
              <p className="text-gray-500">No tienes un historial de reservas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
