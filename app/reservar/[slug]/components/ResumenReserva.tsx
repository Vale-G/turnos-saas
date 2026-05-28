
import { IServicio, IStaff } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
    servicio: IServicio;
    barbero: IStaff;
    fecha: string;
    hora: string;
    montoSena: number;
    moneda: string;
    onVolver: () => void; // <-- Propiedad añadida
}

export function ResumenReserva({ servicio, barbero, fecha, hora, montoSena, moneda, onVolver }: Props) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h3 className="text-2xl font-bold text-white mb-4">Resumen de tu Reserva</h3>
            <div className="space-y-3 text-gray-300">
                <p><strong>Servicio:</strong> {servicio.nombre}</p>
                <p><strong>Barbero:</strong> {barbero.nombre}</p>
                <p><strong>Fecha y Hora:</strong> {new Date(fecha).toLocaleDateString('es-AR', { timeZone: 'UTC' })} a las {hora}</p>
                <p><strong>Precio Total:</strong> {formatCurrency(servicio.precio, moneda)}</p>
                {montoSena > 0 && (
                    <p className="font-bold text-white"><strong>Seña a Pagar:</strong> {formatCurrency(montoSena, moneda)}</p>
                )}
            </div>
            <button onClick={onVolver} className="mt-4 text-sm text-blue-400 hover:underline">Modificar selección</button>
        </div>
    );
}
