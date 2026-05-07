
'use client'

import { getOAuthRedirectUrl, supabase } from '@/lib/supabase'
import { getThemeColor } from '@/lib/theme'
import { formatCurrency } from '@/lib/utils'
import { reservaInvitadoSchema, strictPhoneSchema } from '@/lib/validation'
import { INegocio, IServicio, IStaff, IHorarioBloqueado } from '@/lib/types'
import { User } from '@supabase/supabase-js'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AuthSelector } from './components/AuthSelector'

// ... (funciones auxiliares sin cambios)

export default function ReservaPage() {
  const { slug } = useParams()
  const slugValue = Array.isArray(slug) ? slug[0] : slug
  const router = useRouter()

  // --- ESTADOS RESTAURADOS ---
  const [negocio, setNegocio] = useState<INegocio | null>(null)
  const [servicios, setServicios] = useState<IServicio[]>([])
  const [staffList, setStaffList] = useState<IStaff[]>([])
  const [ocupados, setOcupados] = useState<string[]>([])
  const [bloqueos, setBloqueos] = useState<IHorarioBloqueado[]>([])
  const [loading, setLoading] = useState(true)
  const [paso, setPaso] = useState(1)
  const [sel, setSel] = useState<{
    servicio: IServicio | null;
    barbero: IStaff | null;
    fecha: string;
    hora: string;
  }>({ servicio: null, barbero: null, fecha: '', hora: '' })
  const [user, setUser] = useState<User | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const colorP = getThemeColor(negocio?.tema)
  const monedaLocal = negocio?.moneda || 'ARS'

  // ... (el resto de la lógica de carga, cálculo de horarios, etc. permanece igual)
  const handleFinal = async (nombre: string, tel: string, pagarSena: boolean, correo: string) => {
    // ... (la implementación de handleFinal permanece igual)
  }

    const montoSenaCalculado = useMemo(() => {
        if (!sel.servicio) return 0
        if (sel.servicio.seña_tipo === 'fijo') return sel.servicio.seña_valor
        if (sel.servicio.seña_tipo === 'porcentual') {
            return (sel.servicio.precio * sel.servicio.seña_valor) / 100
        }
        return 0
    }, [sel.servicio])


  useEffect(() => {
    // ... (la implementación de useEffect permanece igual)
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
  }, [slugValue, sel.fecha])

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20">
        {/* ... JSX del banner, header, etc. ... */}

        <div className="max-w-md mx-auto px-6 relative z-10">
            {
                // ... Lógica de renderizado para paso 1 y 2 ... 
            }
            {paso === 3 && (
                <div className="space-y-8 animate-in zoom-in-95">
                    <button
                      onClick={() => setPaso(2)}
                      className="text-[10px] font-black uppercase text-slate-600 hover:text-white"
                    >
                      ← Volver
                    </button>
                    <div className="bg-white/4 border border-white/5 rounded-[4rem] p-10">
                        {/* ... Ticket de Reserva ... */}

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
            {/* ... resto del JSX y modales ... */}
        </div>
    </div>
  )
}
