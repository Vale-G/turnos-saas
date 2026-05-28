
'use client'
import { User } from '@supabase/supabase-js';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AuthSelectorProps {
  user: User | null;
  loading: boolean;
  onConfirm: (nombre: string, tel: string, pagarSena: boolean, correo: string) => void;
  requiereSena: boolean; // <-- Propiedad añadida
}

export function AuthSelector({ user, loading, onConfirm, requiereSena }: AuthSelectorProps) {
  const [nombre, setNombre] = useState('');
  const [tel, setTel] = useState('');
  const [pagarSena, setPagarSena] = useState(requiereSena);

  const cliente = useMemo(() => ({
    nombre: user?.user_metadata?.full_name ?? nombre,
    correo: user?.email ?? '',
    tel: user?.user_metadata?.phone ?? tel,
  }), [user, nombre, tel]);

  const handleSubmit = () => {
    if (!cliente.nombre || !cliente.tel) {
      toast.warning('Por favor, completa tu nombre y teléfono.');
      return;
    }
    onConfirm(cliente.nombre, cliente.tel, pagarSena, cliente.correo);
  };

  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-4">Confirma tu Reserva</h3>
      {!user && (
        <div className="space-y-4 mb-6">
          <p className="text-gray-400">Ingresa tus datos para continuar.</p>
          <div>
            <Label htmlFor="nombre-invitado" className="text-gray-300">Nombre completo</Label>
            <Input 
              id="nombre-invitado" 
              type="text" 
              value={nombre} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)} 
              placeholder="Juan Pérez"
              className="bg-gray-900 border-gray-600"
            />
          </div>
          <div>
            <Label htmlFor="tel-invitado" className="text-gray-300">Teléfono</Label>
            <Input 
              id="tel-invitado" 
              type="tel" 
              value={tel} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTel(e.target.value)} 
              placeholder="1122334455"
              className="bg-gray-900 border-gray-600"
            />
          </div>
        </div>
      )}
      {user && (
        <div className="mb-4 text-center">
          <p className="text-gray-300">Confirmarás la reserva como:</p>
          <p className="font-bold text-lg text-white">{cliente.nombre} ({cliente.correo})</p>
        </div>
      )}

      {requiereSena && (
        <div className="flex items-center space-x-2 my-4 bg-gray-900 p-3 rounded-md">
          <Checkbox 
            id="pagar-sena" 
            checked={pagarSena} 
            onCheckedChange={(checked: boolean | 'indeterminate') => setPagarSena(checked === true)} 
          />
          <Label htmlFor="pagar-sena" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Pagar la seña ahora para confirmar
          </Label>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading} className="w-full text-lg py-3">
        {loading ? 'Confirmando...' : 'Confirmar Reserva'}
      </Button>
    </div>
  );
}
