
'use client'

import { Calendar } from "@/components/ui/calendar";
import { INegocio, IStaff, IHorarioBloqueado } from "@/lib/types";
import { add, format, parse } from "date-fns";
import { useMemo, useState } from "react";

interface FechaProps {
    barberos: IStaff[];
    barberoSel: IStaff | null;
    onBarberoSelect: (barbero: IStaff) => void;
    negocio: INegocio;
    servicioDuracion: number;
    bloqueos: IHorarioBloqueado[];
    fechaSel: Date | undefined;
    horaSel: string;
    onFechaSelect: (fecha: Date | undefined) => void; 
    onHoraSelect: (hora: string) => void;
    onConfirmarPaso: () => void; 
    onVolver: () => void;
}

export function SelectorFecha(props: FechaProps) {
    const { 
        barberos, barberoSel, onBarberoSelect, negocio, servicioDuracion, 
        bloqueos, fechaSel, horaSel, onFechaSelect, onHoraSelect, onConfirmarPaso, onVolver
    } = props;

    const [mesCalendario, setMesCalendario] = useState(new Date());

    const diasDeshabilitados = useMemo(() => {
        const dias = [0, 1, 2, 3, 4, 5, 6].filter(d => !negocio.dias_laborales.includes(d));
        return dias.map(d => ({ dayOfWeek: d }));
    }, [negocio.dias_laborales]);

    const horarios = useMemo(() => {
        if (!fechaSel || !barberoSel) return [];

        const horariosGenerados = [];
        const inicio = parse(negocio.hora_apertura, 'HH:mm:ss', new Date());
        const fin = parse(negocio.hora_cierre, 'HH:mm:ss', new Date());
        let actual = inicio;

        while (actual < fin) {
            horariosGenerados.push(format(actual, 'HH:mm'));
            actual = add(actual, { minutes: 15 }); // Asumimos intervalos de 15 min
        }
        return horariosGenerados;

    }, [fechaSel, barberoSel, negocio.hora_apertura, negocio.hora_cierre]);

    return (
        <div>
            {/* Selección de Barbero */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3">2. Elige un Barbero</h3>
                <div className="flex gap-4">
                    {barberos.map(b => (
                        <button key={b.id} onClick={() => onBarberoSelect(b)} className={`px-4 py-2 rounded-md ${barberoSel?.id === b.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                            {b.nombre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Selección de Fecha y Hora */}
            {barberoSel && (
                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-3">3. Elige Fecha</h3>
                        <Calendar 
                            mode="single"
                            selected={fechaSel}
                            onSelect={onFechaSelect}
                            disabled={diasDeshabilitados}
                            month={mesCalendario}
                            onMonthChange={setMesCalendario}
                            fromDate={new Date()}
                            className="bg-gray-800 rounded-md"
                        />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-3">4. Elige Horario</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {horarios.map(h => (
                                <button key={h} onClick={() => onHoraSelect(h)} className={`p-2 rounded-md text-center ${horaSel === h ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-8 flex justify-between">
                <button onClick={onVolver} className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded-md">Volver</button>
                <button onClick={onConfirmarPaso} disabled={!fechaSel || !horaSel} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 px-6 py-2 rounded-md">Siguiente</button>
            </div>
        </div>
    )
}
