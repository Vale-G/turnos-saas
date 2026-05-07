
// --- INTERFACES DE LA BASE DE DATOS ---

export interface INegocio {
    id: string;
    created_at: string;
    nombre: string;
    slug: string;
    logo_url: string | null;
    owner_id: string;
    tema: string;
    hora_apertura: string; // "HH:mm:ss"
    hora_cierre: string; // "HH:mm:ss"
    dias_laborales: number[]; // Array de números (0-6)
    suscripcion_tipo: 'free' | 'pro';
    email_contacto: string | null;
    moneda: string;
    timezone: string;
    // Campos de branding
    banner_url?: string | null;
    mensaje_bienvenida?: string | null;
    // Campos de suscripción
    mp_payment_id?: string | null;
    suscripcion_activa_hasta?: string | null;
}

export interface IServicio {
    id: string;
    created_at: string;
    nombre: string;
    descripcion: string | null;
    duracion: number;
    precio: number;
    negocio_id: string;
    seña_tipo: 'ninguno' | 'fijo' | 'porcentual';
    seña_valor: number;
}

export interface IStaff {
    id: string;
    created_at: string;
    nombre: string;
    negocio_id: string;
    activo: boolean;
}

export interface ITurno {
    id: string;
    created_at: string;
    fecha: string; // "YYYY-MM-DD"
    hora: string; // "HH:mm:ss"
    negocio_id: string;
    servicio_id: string;
    staff_id: string;
    cliente_id: string | null;
    cliente_nombre: string;
    cliente_email: string;
    cliente_telefono: string;
    estado: 'pendiente' | 'confirmado' | 'cancelado' | 'completado';
    recordatorio_enviado: string | null; // timestamp
}

export interface IHorarioBloqueado {
    id: number;
    created_at: string;
    negocio_id: string;
    start_time: string; // ISO 8601 timestamp
    end_time: string; // ISO 8601 timestamp
    motivo: string | null;
}

export interface IPerfil {
    user_id: string;
    telefono: string | null;
}
