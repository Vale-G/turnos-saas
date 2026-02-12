'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Supabase client — usa las variables de entorno del proyecto
// ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storageKey: 'plataforma-saas-auth-token',
    },
  }
);

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────
interface Negocio {
  id: string;
  nombre: string;
  slug: string;
  dueno_id: string;
  plan: string;
  estado_plan: string;
  color_primario: string;
  telefono: string;
  direccion: string;
  logo_url: string | null;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// ─────────────────────────────────────────────────────────────
// Componente Toast
// ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl
            border backdrop-blur-xl min-w-[300px] max-w-[380px]
            animate-[slideInRight_0.35s_cubic-bezier(0.16,1,0.3,1)_both]
            ${toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
              : toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/30 text-red-100'
              : 'bg-slate-900/90 border-slate-700/50 text-slate-100'
            }
          `}
        >
          <span className="text-xl flex-shrink-0">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity ml-2 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook para toasts
// ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function getContrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const { toasts, addToast, removeToast } = useToast();

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [colorPrimario, setColorPrimario] = useState('#f97316');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Cargar datos del negocio ──────────────────────────────
  useEffect(() => {
    async function cargarNegocio() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          addToast('No hay sesión activa. Redirigiendo…', 'error');
          setTimeout(() => { window.location.href = '/login'; }, 2000);
          return;
        }

        const userId = session.user.id;

        // Verificar perfil y obtener negocio_id
        const { data: perfil, error: perfilError } = await supabase
          .from('perfiles')
          .select('id, rol, negocio_id')
          .eq('id', userId)
          .single();

        if (perfilError || !perfil) {
          addToast('No se encontró tu perfil de usuario.', 'error');
          setLoading(false);
          return;
        }

        // Obtener negocio verificando que el dueno_id coincide con el usuario
        const { data: negocioData, error: negocioError } = await supabase
          .from('Negocio')
          .select('*')
          .eq('dueno_id', userId)
          .single();

        if (negocioError || !negocioData) {
          addToast('No se encontró un negocio asociado a tu cuenta.', 'error');
          setLoading(false);
          return;
        }

        setNegocio(negocioData);
        setNombre(negocioData.nombre ?? '');
        setColorPrimario(negocioData.color_primario ?? '#f97316');
        setTelefono(negocioData.telefono ?? '');
        setDireccion(negocioData.direccion ?? '');
        setLogoUrl(negocioData.logo_url ?? null);
      } catch (err) {
        console.error('Error al cargar negocio:', err);
        addToast('Error inesperado al cargar los datos.', 'error');
      } finally {
        setLoading(false);
      }
    }

    cargarNegocio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Subir logo ────────────────────────────────────────────
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !negocio) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      addToast('Formato no válido. Usa JPG, PNG, WEBP o SVG.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('El archivo es muy grande. Máximo 2MB.', 'error');
      return;
    }

    // Preview inmediato
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${negocio.id}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicData.publicUrl);
      addToast('Logo subido correctamente.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al subir el logo.';
      addToast(message, 'error');
      setPreviewUrl(null);
    } finally {
      setUploadingLogo(false);
    }
  }

  // ── Guardar cambios ───────────────────────────────────────
  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!negocio) return;

    if (!nombre.trim()) {
      addToast('El nombre del negocio es obligatorio.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        addToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'error');
        return;
      }

      // Doble verificación: el negocio pertenece al usuario autenticado
      if (negocio.dueno_id !== session.user.id) {
        addToast('No tienes permisos para editar este negocio.', 'error');
        return;
      }

      const updates = {
        nombre: nombre.trim(),
        color_primario: colorPrimario,
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      };

      const { error } = await supabase
        .from('Negocio')
        .update(updates)
        .eq('id', negocio.id)
        .eq('dueno_id', session.user.id); // Seguridad adicional en la query

      if (error) throw error;

      setNegocio((prev) => prev ? { ...prev, ...updates } : null);
      addToast('¡Cambios guardados exitosamente!', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      addToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Estado de carga
  // ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">
            Cargando configuración…
          </p>
        </div>
      </div>
    );
  }

  if (!negocio) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-5xl">⚠️</div>
          <p className="text-slate-300 font-semibold text-lg">No se encontró el negocio</p>
          <p className="text-slate-500 text-sm">Verifica tu sesión o contacta soporte.</p>
        </div>
      </div>
    );
  }

  const logoDisplayUrl = previewUrl ?? logoUrl;
  const contrastColor = getContrastColor(colorPrimario);
  const rgbValue = hexToRgb(colorPrimario);

  return (
    <>
      {/* Keyframe styles inyectados en el head via style tag */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .card-glow {
          box-shadow: 0 0 0 1px rgba(${rgbValue}, 0.08),
                      0 8px 32px rgba(0, 0, 0, 0.4);
        }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 6px; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 99px; }
      `}</style>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="min-h-screen bg-[#020617] text-white">
        {/* Fondo atmosférico */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% -10%, rgba(${rgbValue}, 0.07) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 80% 110%, rgba(${rgbValue}, 0.04) 0%, transparent 50%)
            `,
            transition: 'background 0.6s ease',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

          {/* ── Header ──────────────────────────────────────── */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-1"
                  style={{ color: colorPrimario }}>
                  Panel de administración
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Configuración del Negocio
                </h1>
                <p className="text-slate-400 mt-1.5 text-sm">
                  Personaliza la identidad de{' '}
                  <span className="font-semibold text-slate-200">{negocio.nombre}</span>
                </p>
              </div>

              {/* Badges de plan */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  {negocio.plan ?? 'Free'}
                </span>
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase border ${
                    negocio.estado_plan === 'activo'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}
                >
                  {negocio.estado_plan ?? 'inactivo'}
                </span>
              </div>
            </div>

            {/* Separador con color dinámico */}
            <div className="mt-6 h-px w-full rounded-full"
              style={{ background: `linear-gradient(90deg, rgba(${rgbValue},0.5) 0%, rgba(${rgbValue},0.1) 40%, transparent 100%)` }} />
          </div>

          <form onSubmit={handleGuardar} className="space-y-6">

            {/* ── Fila superior: Logo + Identidad ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Card: Logo */}
              <div
                className="animate-fade-in-up bg-slate-900 rounded-2xl p-6 border border-slate-800 card-glow flex flex-col items-center gap-5"
                style={{ animationDelay: '80ms' }}
              >
                <div className="w-full">
                  <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-4">
                    Logo del local
                  </h2>

                  {/* Vista previa logo */}
                  <div
                    className="relative w-full aspect-square max-w-[160px] mx-auto rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden group cursor-pointer transition-all duration-300 hover:border-slate-500"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderColor: logoDisplayUrl ? `rgba(${rgbValue}, 0.3)` : undefined }}
                  >
                    {uploadingLogo ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-7 h-7 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                        <span className="text-xs text-slate-400">Subiendo…</span>
                      </div>
                    ) : logoDisplayUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoDisplayUrl}
                          alt="Logo del negocio"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">Cambiar</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-slate-300 transition-colors">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-center leading-tight px-2">
                          Haz clic para subir
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="mt-4 w-full py-2.5 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-200 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingLogo ? 'Subiendo…' : 'Seleccionar imagen'}
                  </button>

                  <p className="text-center text-[11px] text-slate-600 mt-2">
                    JPG, PNG, WEBP o SVG · Máx 2MB
                  </p>
                </div>

                {/* Slug read-only */}
                <div className="w-full pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-500 mb-1 font-medium">URL del negocio</p>
                  <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-3 py-2 border border-slate-800">
                    <span className="text-slate-600 text-xs">@</span>
                    <span className="text-slate-300 text-xs font-mono truncate">{negocio.slug}</span>
                  </div>
                </div>
              </div>

              {/* Card: Información del negocio */}
              <div
                className="animate-fade-in-up lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 card-glow"
                style={{ animationDelay: '120ms' }}
              >
                <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-5">
                  Información del local
                </h2>

                <div className="space-y-5">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Nombre del local
                      <span className="text-red-400 ml-0.5">*</span>
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="ej: Barbería Don Carlos"
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm font-medium outline-none transition-all duration-200 focus:border-slate-500 focus:ring-1 focus:ring-white/5 hover:border-slate-600"
                    />
                  </div>

                  {/* Teléfono + Dirección en grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Teléfono
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                          📞
                        </span>
                        <input
                          type="tel"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+54 11 1234-5678"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all duration-200 focus:border-slate-500 focus:ring-1 focus:ring-white/5 hover:border-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Dirección
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                          📍
                        </span>
                        <input
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Av. Corrientes 1234, CABA"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-slate-600 text-sm outline-none transition-all duration-200 focus:border-slate-500 focus:ring-1 focus:ring-white/5 hover:border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card: Color primario ─────────────────────── */}
            <div
              className="animate-fade-in-up bg-slate-900 rounded-2xl p-6 border border-slate-800 card-glow"
              style={{ animationDelay: '160ms' }}
            >
              <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-slate-400 mb-5">
                Color primario de marca
              </h2>

              <div className="flex flex-col lg:flex-row gap-8">
                {/* Selector de color */}
                <div className="flex items-start gap-5">
                  <div className="relative">
                    <input
                      type="color"
                      value={colorPrimario}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="w-20 h-20 rounded-2xl cursor-pointer border-2 border-slate-700 bg-transparent"
                      style={{ borderColor: `rgba(${rgbValue}, 0.4)` }}
                    />
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke={contrastColor} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.829L11.828 15.828a4 4 0 01-1.414.943l-3.536.707.707-3.536a4 4 0 01.943-1.414z" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-white font-bold text-2xl font-mono tracking-wide">
                      {colorPrimario.toUpperCase()}
                    </p>
                    <p className="text-slate-500 text-xs font-mono">
                      rgb({rgbValue})
                    </p>
                    <div className="flex gap-1.5 mt-2">
                      {['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#f59e0b'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColorPrimario(c)}
                          title={c}
                          className="w-6 h-6 rounded-lg border-2 transition-transform hover:scale-110 focus:outline-none"
                          style={{
                            backgroundColor: c,
                            borderColor: colorPrimario === c ? 'white' : 'transparent',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Separador vertical */}
                <div className="hidden lg:block w-px bg-slate-800 mx-2" />

                {/* Vista previa de UI */}
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-widest">
                    Vista previa del sistema
                  </p>

                  <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
                    {/* Botones */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Primario */}
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-95"
                        style={{ backgroundColor: colorPrimario, color: contrastColor }}
                      >
                        Reservar turno
                      </button>

                      {/* Outline */}
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 border-2 hover:brightness-110"
                        style={{ borderColor: colorPrimario, color: colorPrimario }}
                      >
                        Ver servicios
                      </button>

                      {/* Ghost */}
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                        style={{ color: colorPrimario, backgroundColor: `rgba(${rgbValue}, 0.1)` }}
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Badge y progress */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: `rgba(${rgbValue}, 0.15)`, color: colorPrimario }}
                      >
                        ● Disponible
                      </span>

                      <div className="flex-1 min-w-[100px]">
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: '65%', backgroundColor: colorPrimario }}
                          />
                        </div>
                      </div>

                      {/* Switch */}
                      <div
                        className="w-10 h-5 rounded-full flex items-center px-0.5 transition-all duration-300 cursor-pointer"
                        style={{ backgroundColor: colorPrimario }}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm ml-auto" />
                      </div>
                    </div>

                    {/* Fila de info */}
                    <div
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                      style={{ backgroundColor: `rgba(${rgbValue}, 0.06)`, borderLeft: `3px solid ${colorPrimario}` }}
                    >
                      <span style={{ color: colorPrimario }}>●</span>
                      <span className="text-slate-300">
                        Próximo turno: <strong className="text-white">Juan Pérez</strong> a las 15:30h
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Footer: Botón guardar ────────────────────── */}
            <div
              className="animate-fade-in-up flex items-center justify-between pt-2"
              style={{ animationDelay: '200ms' }}
            >
              <p className="text-slate-600 text-xs">
                Los cambios se aplicarán de inmediato en todo el sistema.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="relative inline-flex items-center gap-3 px-7 py-3.5 rounded-xl font-bold text-sm tracking-wide overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                style={{
                  backgroundColor: colorPrimario,
                  color: contrastColor,
                  boxShadow: `0 4px 24px rgba(${rgbValue}, 0.35)`,
                }}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
}