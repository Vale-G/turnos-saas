
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
import { toast } from 'sonner'
import { AuthSelector } from './components/AuthSelector'

export default function ReservaPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { slug } = useParams();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  const router = useRouter();

  // ... (el resto de los estados no cambia)

  useEffect(() => {
     async function fetchData() {
      setLoading(true)
      const { data: negocioData } = await supabase
        .from('negocio')
        .select('*')
        .eq('slug', slugValue)
        .single<INegocio>()

      if (negocioData) {
        setNegocio(negocioData)
        // ... (el resto de la carga de datos)
      }
      setLoading(false)
    }

    fetchData()
  }, [slugValue, sel.fecha, supabase]);

  // ... (el resto del componente no cambia)

  return (<div>...</div>); // El JSX se mantiene igual
}
