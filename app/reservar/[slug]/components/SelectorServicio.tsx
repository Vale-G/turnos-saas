
import { IServicio } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  servicios: IServicio[];
  seleccionado: IServicio | null;
  onSelect: (servicio: IServicio) => void;
  moneda: string;
}

export function SelectorServicio({ servicios, seleccionado, onSelect, moneda }: Props) {
  if (!servicios || servicios.length === 0) {
    return (
      <div className="my-4 p-4 text-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">No hay servicios disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div className="my-4">
      <h2 className="text-xl font-bold mb-4">1. Elige un servicio</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servicios.map(servicio => (
          <button
            key={servicio.id}
            onClick={() => onSelect(servicio)}
            className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${
              seleccionado?.id === servicio.id
                ? 'bg-blue-600 border-blue-500 shadow-lg'
                : 'bg-gray-800 border-gray-700 hover:border-blue-600'
            }`}
          >
            <h3 className="font-bold text-lg">{servicio.nombre}</h3>
            <p className="text-gray-300">{servicio.duracion} min</p>
            <p className="text-xl font-semibold mt-2">{formatCurrency(servicio.precio, moneda)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
