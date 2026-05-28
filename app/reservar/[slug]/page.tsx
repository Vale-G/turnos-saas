
'use client'

import { createBrowserClient } from '@supabase/ssr';
import { getOAuthRedirectUrl } from '@/lib/supabase';
import { getThemeColor } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils';
import { reservaInvitadoSchema, strictPhoneSchema } from '@/lib/validation';
import { INegocio, IServicio, IStaff, IHorarioBloqueado } from '@/lib/types';
import { User } from '@supabase/supabase-js';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AuthSelector } from './components/AuthSelector';

export default function ReservaPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { slug } = useParams();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const router = useRouter();

  // --- ESTADOS RESTAURADOS ---
  const [negocio, setNegocio] = useState<INegocio | null>(null);
  const [servicios, setServicios] = useState<IServicio[]>([]);
  const [staffList, setStaffList] = useState<IStaff[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [bloqueos, setBloqueos] = useState<IHorarioBloqueado[]>([]);
  const [loading, setLoading] = useState(true);
  const [paso, setPaso] = useState(1);
  const [sel, setSel] = useState<{
    servicio: IServicio | null;
    barbero: IStaff | null;
    fecha: string;
    hora: string;
  }>({ servicio: null, barbero: null, fecha: '', hora: '' });
  const [user, setUser] = useState<User | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const colorP = getThemeColor(negocio?.tema);
  const monedaLocal = negocio?.moneda || 'ARS';

  const handleFinal = async (nombre: string, tel: string, pagarSena: boolean, correo: string) => {
    // Lógica para finalizar la reserva (a implementar)
  };

  const montoSenaCalculado = useMemo(() => {
    if (!sel.servicio) return 0;
    if (sel.servicio.seña_tipo === 'fijo') return sel.servicio.seña_valor;
    if (sel.servicio.seña_tipo === 'porcentual') {
      return (sel.servicio.precio * sel.servicio.seña_valor) / 100;
    }
    return 0;
  }, [sel.servicio]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const { data: negocioData, error: negocioError } = await supabase
          .from('negocio')
          .select('*')
          .eq('slug', slugValue)
          .single<INegocio>();

        if (negocioError || !negocioData) {
          toast.error('El negocio no existe o no se pudo cargar.');
          console.error(negocioError);
          setNegocio(null);
        } else {
          setNegocio(negocioData);
          const { data: serviciosData } = await supabase.from('servicios').select('*').eq('negocio_id', negocioData.id);
          setServicios(serviciosData || []);
          const { data: staffData } = await supabase.from('staff').select('*').eq('negocio_id', negocioData.id);
          setStaffList(staffData || []);
        }
      } catch (error) {
        toast.error('Ocurrió un error inesperado al cargar los datos.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slugValue, supabase]);

  // El resto del useEffect para horarios y bloqueos se mantiene...

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20">
      {/* ... Placeholder para el resto del JSX ... */}
      <div className="max-w-md mx-auto px-6 relative z-10">
        {paso === 1 && <div>Paso 1: Selección de Servicio</div>}
        {paso === 2 && <div>Paso 2: Selección de Fecha y Hora</div>}
        {paso === 3 && (
          <div className="space-y-8 animate-in zoom-in-95">
            <button
              onClick={() => setPaso(2)}
              className="text-[10px] font-black uppercase text-slate-600 hover:text-white"
            >
              ← Volver
            </button>
            <div className="bg-white/4 border border-white/5 rounded-[4rem] p-10">
              <div>Ticket de reserva</div>
              <AuthSelector
                user={user}
                colorP={colorP}
                loading={confirmando}
                onConfirm={handleFinal}
                slug={slugValue}
                montoSena={montoSenaCalculado}
                monedaLocal={monedaLocal}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
