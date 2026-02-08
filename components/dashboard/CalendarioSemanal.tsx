// components/dashboard/CalendarioSemanal.tsx
'use client'

import { useState, useMemo } from 'react'
import { Turno, Staff, Servicio } from '@/types/database.types'
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface CalendarioSemanalProps {
  turnos: Turno[]
  staff: Staff[]
  onTurnoClick: (turno: Turno) => void
  onSlotClick: (fecha: Date, staffId: string) => void
  colorPrimario?: string
}

export default function CalendarioSemanal({
  turnos,
  staff,
  onTurnoClick,
  onSlotClick,
  colorPrimario = '#10b981'
}: CalendarioSemanalProps) {
  const [semanaActual, setSemanaActual] = useState(new Date())
  
  // Calcular días de la semana
  const diasSemana = useMemo(() => {
    const inicio = startOfWeek(semanaActual, { weekStartsOn: 1 }) // Lunes
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
  }, [semanaActual])
  
  // Horarios de 9 AM a 8 PM (cada 30 min)
  const horarios = useMemo(() => {
    const slots = []
    for (let hora = 9; hora <= 20; hora++) {
      slots.push(`${hora.toString().padStart(2, '0')}:00`)
      if (hora < 20) slots.push(`${hora.toString().padStart(2, '0')}:30`)
    }
    return slots
  }, [])
  
  // Obtener turnos de un slot específico
  const getTurnosEnSlot = (fecha: Date, staffId: string, hora: string) => {
    return turnos.filter(turno => {
      const turnoFecha = parseISO(turno.hora_inicio)
      const turnoHora = format(turnoFecha, 'HH:mm')
      return (
        isSameDay(turnoFecha, fecha) &&
        turno.staff_id === staffId &&
        turnoHora === hora
      )
    })
  }
  
  // Obtener color por estado
  const getColorEstado = (estado: Turno['estado']) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200'
      case 'confirmado': return 'bg-green-500/20 border-green-500/40 text-green-200'
      case 'finalizado': return 'bg-slate-700/50 border-slate-600/40 text-slate-400'
      case 'cancelado': return 'bg-red-500/20 border-red-500/40 text-red-300'
      default: return 'bg-slate-700/50'
    }
  }
  
  const cambiarSemana = (direccion: 'anterior' | 'siguiente') => {
    setSemanaActual(prev => addDays(prev, direccion === 'siguiente' ? 7 : -7))
  }
  
  const irAHoy = () => {
    setSemanaActual(new Date())
  }

  return (
    <div className="flex flex-col h-full bg-[#0f172a] rounded-[3rem] border border-white/5 overflow-hidden">
      
      {/* Header: Navegación de semana */}
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => cambiarSemana('anterior')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            ←
          </button>
          <h3 className="text-white font-black text-xl">
            {format(diasSemana[0], 'd MMM', { locale: es })} - {format(diasSemana[6], 'd MMM yyyy', { locale: es })}
          </h3>
          <button
            onClick={() => cambiarSemana('siguiente')}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            →
          </button>
        </div>
        
        <button
          onClick={irAHoy}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider transition-colors"
          style={{ color: colorPrimario }}
        >
          Hoy
        </button>
      </div>

      {/* Grid del calendario */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[100px_repeat(7,1fr)] min-w-max">
          
          {/* Header de columnas (días) */}
          <div className="sticky top-0 bg-[#0f172a] z-20 border-b border-white/5 p-4" />
          {diasSemana.map((dia, idx) => (
            <div
              key={idx}
              className={`sticky top-0 bg-[#0f172a] z-20 border-b border-white/5 p-4 text-center ${
                isSameDay(dia, new Date()) ? 'bg-white/5' : ''
              }`}
            >
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {format(dia, 'EEE', { locale: es })}
              </p>
              <p className={`text-2xl font-black mt-1 ${
                isSameDay(dia, new Date()) ? 'text-white' : 'text-slate-400'
              }`}>
                {format(dia, 'd')}
              </p>
            </div>
          ))}

          {/* Filas por cada miembro del staff */}
          {staff.filter(s => s.activo).map(miembroStaff => (
            <>
              {horarios.map((hora, horaIdx) => (
                <>
                  {/* Columna de horario (solo una vez por fila) */}
                  {miembroStaff === staff.filter(s => s.activo)[0] && (
                    <div
                      key={`hora-${hora}`}
                      className="sticky left-0 bg-[#0f172a] z-10 border-r border-b border-white/5 p-3 flex items-center justify-end"
                    >
                      <span className="text-[10px] font-black text-slate-600 uppercase">
                        {hora}
                      </span>
                    </div>
                  )}
                  
                  {/* Celdas de cada día */}
                  {miembroStaff === staff.filter(s => s.activo)[0] && diasSemana.map((dia, diaIdx) => {
                    const turnosEnSlot = getTurnosEnSlot(dia, miembroStaff.id, hora)
                    const hayTurno = turnosEnSlot.length > 0
                    
                    return (
                      <div
                        key={`${miembroStaff.id}-${diaIdx}-${horaIdx}`}
                        onClick={() => {
                          if (hayTurno) {
                            onTurnoClick(turnosEnSlot[0])
                          } else {
                            const fecha = new Date(dia)
                            const [h, m] = hora.split(':')
                            fecha.setHours(parseInt(h), parseInt(m))
                            onSlotClick(fecha, miembroStaff.id)
                          }
                        }}
                        className={`border-r border-b border-white/5 p-2 min-h-[60px] cursor-pointer transition-all hover:bg-white/5 ${
                          isSameDay(dia, new Date()) ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {hayTurno && (
                          <div
                            className={`p-3 rounded-xl border text-xs h-full ${getColorEstado(turnosEnSlot[0].estado)}`}
                          >
                            <p className="font-black leading-tight">
                              {turnosEnSlot[0].nombre_cliente}
                            </p>
                            <p className="text-[10px] opacity-70 mt-1">
                              {turnosEnSlot[0].Servicio?.nombre}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
              
              {/* Separador entre staff members */}
              {staff.filter(s => s.activo).indexOf(miembroStaff) < staff.filter(s => s.activo).length - 1 && (
                <>
                  <div className="col-span-8 border-t-2 border-white/10 bg-[#020617]">
                    <div className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm">
                        👤
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                        {staff.filter(s => s.activo)[staff.filter(s => s.activo).indexOf(miembroStaff) + 1]?.nombre}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="border-t border-white/5 p-6 flex items-center justify-center gap-8 bg-[#020617]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/40" />
          <span className="text-[10px] font-black text-slate-500 uppercase">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/40" />
          <span className="text-[10px] font-black text-slate-500 uppercase">Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600/40" />
          <span className="text-[10px] font-black text-slate-500 uppercase">Finalizado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40" />
          <span className="text-[10px] font-black text-slate-500 uppercase">Cancelado</span>
        </div>
      </div>
    </div>
  )
}
