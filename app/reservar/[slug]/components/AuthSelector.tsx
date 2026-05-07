
'use client'

import { useState } from 'react';
import { supabase, getOAuthRedirectUrl } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface AuthSelectorProps {
    user: User | null;
    colorP: string;
    loading: boolean;
    onConfirm: (nombre: string, tel: string, pagarSena: boolean, correo: string) => void;
    slug: string;
    montoSena: number;
    monedaLocal: string;
}

export function AuthSelector({ user, colorP, loading, onConfirm, slug, montoSena, monedaLocal }: AuthSelectorProps) {
    const [modo, setModo] = useState('invitado');
    const [nombre, setNombre] = useState('');
    const [tel, setTel] = useState('');
    const [correo, setCorreo] = useState('');

    const login = () =>
        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: getOAuthRedirectUrl(`/auth/callback?next=/reservar/${slug}`),
            },
        });

    const renderBotones = (accion: (sena: boolean) => void) => (
        <div className="space-y-3 mt-6">
            {montoSena > 0 && (
                <button
                    onClick={() => accion(true)}
                    disabled={loading}
                    className="w-full py-6 rounded-[2.5rem] font-black uppercase italic text-sm text-black hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: colorP }}
                >
                    <span className="flex flex-col">
                        <span>Abonar Seña ({formatCurrency(montoSena, monedaLocal)})</span>
                        <span className="text-[10px] font-bold opacity-70 mt-1">
                            Con MercadoPago
                        </span>
                    </span>
                </button>
            )}
            <button
                onClick={() => accion(false)}
                disabled={loading}
                className="w-full py-5 rounded-[2.5rem] font-black uppercase italic text-xs text-white bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-all"
            >
                {loading ? 'PROCESANDO...' : 'RESERVAR Y PAGAR EN LOCAL'}
            </button>
        </div>
    );

    if (user) return renderBotones((s) => onConfirm('', '', s, ''));

    return (
        <div className="space-y-6">
            <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5">
                <button
                    onClick={() => setModo('invitado')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'invitado' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>
                    Invitado
                </button>
                <button
                    onClick={() => setModo('google')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${modo === 'google' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>
                    Google
                </button>
            </div>
            {modo === 'google' ? (
                <button
                    onClick={login}
                    className="w-full py-5 bg-white text-black font-black uppercase italic rounded-[2rem] hover:scale-105 transition-all">
                    Ingresar con Google
                </button>
            ) : (
                <div className="space-y-4">
                    {/* Campos de input para nombre, tel, correo */}
                    {renderBotones((s) => onConfirm(nombre, tel, s, correo))}
                </div>
            )}
        </div>
    );
}
