// components/booking/CalendarioPublico.tsx
'use client'

import { useState, useMemo } from 'react'
import { Staff, Servicio } from '@/types/database.types'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'

interface HorarioDisponible {
  hora: string
  disponible: boolean
}

interface CalendarioPublicoProps {
  servicioSeleccionado: Servicio | null
  staffSeleccionado: Staff | null
  horariosOcupados: string[] // Array de ISO timestamps
  onSeleccionarFecha: (fecha: Date, hora: string) => void
  colorPrimario?: string
  horaApertura?: number // Default 9
  horaCierre?: number    // Default 20
}

export default function CalendarioPublico({
  servicioSeleccionado,
  staffSeleccionado,
  horariosOcupados,
  onSeleccionarFecha,
  colorPrimario = '#10b981',
  horaApertura = 9,
  horaCierre = 20
}: CalendarioPublicoProps) {
  const [mesActual, setMesActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null)

  // Generar días del mes
  const diasDelMes = useMemo(() => {
    const inicio = startOfMonth(mesActual)
    const fin = endOfMonth(mesActual)
    return eachDayOfInterval({ start: inicio, end: fin })
  }, [mesActual])

  // Generar horarios disponibles del día seleccionado
  const horariosDelDia = useMemo(() => {
    if (!diaSeleccionado || !servicioSeleccionado) return []

    const slots: HorarioDisponible[] = []
    const duracion = servicioSeleccionado.duracion_minutos
    
    for (let hora = horaApertura; hora < horaCierre; hora++) {
      for (let minuto = 0; minuto < 60; minuto += 30) {
        const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`
        
        // Crear fecha completa para verificar si está ocupada
        const fechaCompleta = new Date(diaSeleccionado)
        fechaCompleta.setHours(hora, minuto, 0, 0)
        
        // Verificar si está en el pasado
        const esPasado = isBefore(fechaCompleta, new Date())
        
        // Verificar si está ocupada
        const estaOcupada = horariosOcupados.some(ocupado => {
          const fechaOcupada = new Date(ocupado)
          return isSameDay(fechaOcupada, diaSeleccionado) && 
                 format(fechaOcupada, 'HH:mm') === horaStr
        })
        
        slots.push({
          hora: horaStr,
          disponible: !esPasado && !estaOcupada
        })
      }
    }
    
    return slots
  }, [diaSeleccionado, servicioSeleccionado, horariosOcupados, horaApertura, horaCierre])

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    setMesActual(prev => {
      const nuevoMes = new Date(prev)
      nuevoMes.setMonth(prev.getMonth() + (direccion === 'siguiente' ? 1 : -1))
      return nuevoMes
    })
    setDiaSeleccionado(null)
  }

  const seleccionarDia = (dia: Date) => {
    // No permitir seleccionar días pasados
    if (isBefore(startOfDay(dia), startOfDay(new Date()))) return
    setDiaSeleccionado(dia)
  }

  const seleccionarHorario = (hora: string) => {
    if (!diaSeleccionado) return
    onSeleccionarFecha(diaSeleccionado, hora)
  }

  // Calcular días de la semana que aparecen antes del mes
  const diasVaciosInicio = startOfMonth(mesActual).getDay() === 0 ? 6 : startOfMonth(mesActual).getDay() - 1

  return (
    <div className="space-y-8">
      
      {/* ===== CALENDARIO MENSUAL ===== */}
      <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 p-8">
        
        {/* Header del mes */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => cambiarMes('anterior')}
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all font-black text-xl"
          >
            ←
          </button>
          
          <h3 className="text-white font-black text-3xl uppercase italic tracking-tight">
            {format(mesActual, 'MMMM yyyy', { locale: es })}
          </h3>
          
          <button
            onClick={() => cambiarMes('siguiente')}
            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all font-black text-xl"
          >
            →
          </button>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((dia, idx) => (
            <div key={idx} className="text-center text-[10px] font-black text-slate-600 uppercase tracking-wider">
              {dia}
            </div>
          ))}
        </div>

        {/* Grid de días */}
        <div className="grid grid-cols-7 gap-3">
          {/* Días vacíos al inicio */}
          {Array.from({ length: diasVaciosInicio }).map((_, idx) => (
            <div key={`empty-${idx}`} />
          ))}
          
          {/* Días del mes */}
          {diasDelMes.map((dia) => {
            const esPasado = isBefore(startOfDay(dia), startOfDay(new Date()))
            const esHoy = isToday(dia)
            const estaSeleccionado = diaSeleccionado && isSameDay(dia, diaSeleccionado)
            
            return (
              <button
                key={dia.toISOString()}
                onClick={() => seleccionarDia(dia)}
                disabled={esPasado}
                className={`
                  aspect-square rounded-2xl font-black text-lg transition-all
                  ${esPasado ? 'text-slate-700 cursor-not-allowed' : 'hover:scale-110'}
                  ${esHoy && !estaSeleccionado ? 'ring-2 ring-white/20' : ''}
                  ${estaSeleccionado 
                    ? 'text-black shadow-2xl scale-110' 
                    : esPasado 
                      ? 'text-slate-700' 
                      : 'text-white hover:bg-white/5'
                  }
                `}
                style={estaSeleccionado ? { backgroundColor: colorPrimario } : {}}
              >
                {format(dia, 'd')}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== SELECTOR DE HORARIOS ===== */}
      {diaSeleccionado && (
        <div className="bg-[#0f172a] rounded-[3rem] border border-white/5 p-8 animate-in fade-in slide-in-from-bottom-4">
          <h4 className="text-white font-black text-2xl mb-6 uppercase italic tracking-tight">
            Horarios disponibles - {format(diaSeleccionado, "d 'de' MMMM", { locale: es })}
          </h4>
          
          {horariosDelDia.filter(h => h.disponible).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm font-bold">
                😔 No hay horarios disponibles para este día
              </p>
              <p className="text-slate-600 text-xs mt-2">
                Por favor selecciona otro día
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {horariosDelDia.map(({ hora, disponible }) => (
                <button
                  key={hora}
                  onClick={() => disponible && seleccionarHorario(hora)}
                  disabled={!disponible}
                  className={`
                    py-4 rounded-2xl font-black text-sm transition-all
                    ${disponible
                      ? 'bg-white/5 hover:bg-white/10 text-white hover:scale-105 active:scale-95'
                      : 'bg-white/[0.02] text-slate-700 cursor-not-allowed'
                    }
                  `}
                >
                  {hora}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instrucciones */}
      {!diaSeleccionado && (
        <div className="text-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
            👆 Selecciona un día para ver los horarios disponibles
          </p>
        </div>
      )}
    </div>
  )
}
