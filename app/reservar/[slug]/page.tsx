
'use client'

import { createBrowserClient } from '@supabase/ssr';
import { INegocio, IServicio, IStaff } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { PageLoader } from './components/LoadingSkeleton';
import { SelectorServicio } from './components/SelectorServicio';
import { SelectorFecha } from './components/SelectorFecha';
import { ResumenReserva } from './components/ResumenReserva';
import { AuthSelector } from './components/AuthSelector';

export default function ReservaPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { slug } = useParams();
  const router = useRouter();

  // Estados del componente
  const [negocio, setNegocio] = useState<INegocio | null>(null);
  const [servicios, setServicios] = useState<IServicio[]>([]);
  const [staffList, setStaffList] = useState<IStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState(1);
  const [sel, setSel] = useState<{ servicio: IServicio | null; barbero: IStaff | null; fecha: Date | undefined; hora: string; }>({ servicio: null, barbero: null, fecha: undefined, hora: '' });
  const [user, setUser] = useState<User | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  // Lógica de carga de datos y autenticación
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('negocio').select('*, servicios:servicio(*), staff:staff(*)').eq('slug', slug).single();
        if (error || !data) throw new Error('No se pudo cargar la información del negocio.');
        
        const serviciosConPrecioNumerico = (data.servicios || []).map((servicio: IServicio) => ({
            ...servicio,
            precio: parseFloat(String(servicio.precio)) // Asegurar que el precio sea un número
        }));

        setNegocio(data);
        setServicios(serviciosConPrecioNumerico);
        setStaffList(data.staff || []);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();

    return () => subscription.unsubscribe();
  }, [slug, supabase]);

  const handleConfirmarReserva = async (nombre: string, tel: string, pagarSena: boolean, correo: string) => {
    if (!sel.servicio || !sel.barbero || !sel.fecha || !sel.hora || !negocio) {
        toast.error('Faltan datos para confirmar la reserva.');
        return;
    }

    setConfirmando(true);
    toast.loading('Confirmando tu reserva...');

    try {
      const response = await fetch('/api/reserva/confirmacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: format(sel.fecha, 'yyyy-MM-dd'),
          hora: sel.hora,
          servicio_id: sel.servicio.id,
          negocio_id: negocio.id,
          staff_id: sel.barbero.id,
          cliente_nombre: nombre,
          cliente_email: correo,
          cliente_telefono: tel,
          pagar_sena: pagarSena,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo confirmar la reserva.');
      }
      
      toast.dismiss();

      if (result.payment_url) {
        toast.success('Reserva creada. Redirigiendo al pago de la seña...');
        window.location.href = result.payment_url;
      } else {
        toast.success('¡Reserva confirmada con éxito!');
        router.push(`/reserva/confirmada/${result.turno_id}`);
      }

    } catch (e) {
      toast.dismiss();
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
      toast.error(errorMessage);
      setConfirmando(false);
    }
  };

  const montoSeña = useMemo(() => {
    if (!sel.servicio) return 0;
    const { seña_tipo, seña_valor, precio } = sel.servicio;
    if (seña_tipo === 'fijo') return seña_valor;
    if (seña_tipo === 'porcentual') return (precio * seña_valor) / 100;
    return 0;
  }, [sel.servicio]);

  if (loading) return <PageLoader />;
  if (error) return <div className="text-center p-8 text-red-400">{error}</div>;
  if (!negocio) return <div className="text-center p-8">Negocio no encontrado.</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white">Reservar en {negocio.nombre}</h1>
        <p className="text-gray-400">{negocio.direccion}</p>
      </header>

      {paso === 1 && (
        <SelectorServicio 
          servicios={servicios} 
          seleccionado={sel.servicio}
          onSelect={(s) => { setSel({...sel, servicio: s}); setPaso(2); }}
          moneda={negocio.moneda}
        />
      )}

      {paso === 2 && sel.servicio && (
        <SelectorFecha 
          barberos={staffList}
          barberoSel={sel.barbero}
          onBarberoSelect={(b) => setSel({...sel, barbero: b})}
          fechaSel={sel.fecha}
          horaSel={sel.hora}
          onFechaSelect={(f) => setSel({...sel, fecha: f, hora: ''})}
          onHoraSelect={(h) => setSel({...sel, hora: h})}
          onConfirmarPaso={() => { if (sel.barbero && sel.fecha && sel.hora) setPaso(3); else toast.warning('Debes seleccionar un barbero, fecha y hora.'); }}
          onVolver={() => setPaso(1)}
          negocio={negocio}
          bloqueos={[]}
          servicioDuracion={sel.servicio.duracion}
        />
      )}

      {paso === 3 && sel.servicio && sel.barbero && sel.fecha && sel.hora && (
        <>
          <ResumenReserva 
            servicio={sel.servicio}
            barbero={sel.barbero}
            fecha={format(sel.fecha, 'yyyy-MM-dd')}
            hora={sel.hora}
            montoSena={montoSeña}
            moneda={negocio.moneda}
            onVolver={() => setPaso(2)}
          />
          <AuthSelector 
            onConfirm={handleConfirmarReserva} 
            user={user} 
            loading={confirmando} 
            requiereSena={montoSeña > 0} 
          />
        </>
      )}
    </div>
  );
}
