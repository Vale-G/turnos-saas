export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adminrol: {
        Row: {
          created_at: string
          email: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      bloquehorario: {
        Row: {
          created_at: string
          dia_semana: number | null
          fecha: string | null
          hora_fin: string
          hora_inicio: string
          id: string
          motivo: string | null
          negocio_id: string
          recurrente: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_semana?: number | null
          fecha?: string | null
          hora_fin: string
          hora_inicio: string
          id?: string
          motivo?: string | null
          negocio_id: string
          recurrente?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number | null
          fecha?: string | null
          hora_fin?: string
          hora_inicio?: string
          id?: string
          motivo?: string | null
          negocio_id?: string
          recurrente?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloquehorario_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueo: {
        Row: {
          created_at: string | null
          descripcion: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id: string
          negocio_id: string | null
          staff_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          fecha: string
          hora_fin: string
          hora_inicio: string
          id?: string
          negocio_id?: string | null
          staff_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          hora_fin?: string
          hora_inicio?: string
          id?: string
          negocio_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bloqueo_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueo_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      clientenota: {
        Row: {
          bloqueado: boolean
          cliente_id: string
          cliente_nombre: string | null
          created_at: string
          id: string
          negocio_id: string
          nota: string | null
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          cliente_id: string
          cliente_nombre?: string | null
          created_at?: string
          id?: string
          negocio_id: string
          nota?: string | null
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          cliente_id?: string
          cliente_nombre?: string | null
          created_at?: string
          id?: string
          negocio_id?: string
          nota?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientenota_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      config: {
        Row: {
          clave: string
          created_at: string
          descripcion: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          clave: string
          created_at?: string
          descripcion?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          clave?: string
          created_at?: string
          descripcion?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      gasto: {
        Row: {
          concepto: string
          created_at: string | null
          fecha: string
          id: string
          monto: number
          negocio_id: string | null
        }
        Insert: {
          concepto: string
          created_at?: string | null
          fecha?: string
          id?: string
          monto: number
          negocio_id?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string | null
          fecha?: string
          id?: string
          monto?: number
          negocio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gasto_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_negra: {
        Row: {
          creado_en: string
          email: string | null
          id: string
          identidad: string | null
          motivo: string | null
          negocio_id: string
          nombre: string | null
          telefono: string | null
          usuario_id: string | null
        }
        Insert: {
          creado_en?: string
          email?: string | null
          id?: string
          identidad?: string | null
          motivo?: string | null
          negocio_id: string
          nombre?: string | null
          telefono?: string | null
          usuario_id?: string | null
        }
        Update: {
          creado_en?: string
          email?: string | null
          id?: string
          identidad?: string | null
          motivo?: string | null
          negocio_id?: string
          nombre?: string | null
          telefono?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_negra_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          dias_laborales: number[] | null
          email_contacto: string | null
          hora_apertura: string | null
          hora_cierre: string | null
          id: string
          logo_url: string | null
          moneda: string
          mp_access_token: string | null
          nombre: string
          onboarding_completo: boolean
          owner_id: string
          slug: string
          suscripcion_tipo: string
          tema: string | null
          trial_hasta: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          dias_laborales?: number[] | null
          email_contacto?: string | null
          hora_apertura?: string | null
          hora_cierre?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string
          mp_access_token?: string | null
          nombre: string
          onboarding_completo?: boolean
          owner_id: string
          slug: string
          suscripcion_tipo?: string
          tema?: string | null
          trial_hasta?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          dias_laborales?: number[] | null
          email_contacto?: string | null
          hora_apertura?: string | null
          hora_cierre?: string | null
          id?: string
          logo_url?: string | null
          moneda?: string
          mp_access_token?: string | null
          nombre?: string
          onboarding_completo?: boolean
          owner_id?: string
          slug?: string
          suscripcion_tipo?: string
          tema?: string | null
          trial_hasta?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      negocios: {
        Row: {
          config_brand: Json | null
          creado_at: string | null
          id: string
          moneda: string | null
          nombre: string
          owner_id: string
          slug: string
          timezone: string | null
        }
        Insert: {
          config_brand?: Json | null
          creado_at?: string | null
          id?: string
          moneda?: string | null
          nombre: string
          owner_id: string
          slug: string
          timezone?: string | null
        }
        Update: {
          config_brand?: Json | null
          creado_at?: string | null
          id?: string
          moneda?: string | null
          nombre?: string
          owner_id?: string
          slug?: string
          timezone?: string | null
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string | null
          role: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nombre?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string | null
          role?: string | null
        }
        Relationships: []
      }
      servicio: {
        Row: {
          created_at: string
          duracion: number
          id: string
          negocio_id: string
          nombre: string
          precio: number
          seña_tipo: string | null
          seña_valor: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duracion?: number
          id?: string
          negocio_id: string
          nombre: string
          precio?: number
          seña_tipo?: string | null
          seña_valor?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duracion?: number
          id?: string
          negocio_id?: string
          nombre?: string
          precio?: number
          seña_tipo?: string | null
          seña_valor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicio_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          activo: boolean
          avatar_url: string | null
          created_at: string
          id: string
          negocio_id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          negocio_id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          negocio_id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripcion: {
        Row: {
          created_at: string
          estado: string
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: string
          monto: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          negocio_id: string
          plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          negocio_id: string
          plan: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: string
          monto?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          negocio_id?: string
          plan?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripcion_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      turno: {
        Row: {
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          created_at: string
          estado: string
          fecha: string
          hora: string
          id: string
          monto_sena: number | null
          mp_preference_id: string | null
          negocio_id: string
          pago_estado: string | null
          pago_id: string | null
          pago_tipo: string | null
          requiere_sena: boolean
          sena_pagada: boolean
          servicio_id: string | null
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          created_at?: string
          estado?: string
          fecha: string
          hora: string
          id?: string
          monto_sena?: number | null
          mp_preference_id?: string | null
          negocio_id: string
          pago_estado?: string | null
          pago_id?: string | null
          pago_tipo?: string | null
          requiere_sena?: boolean
          sena_pagada?: boolean
          servicio_id?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          hora?: string
          id?: string
          monto_sena?: number | null
          mp_preference_id?: string | null
          negocio_id?: string
          pago_estado?: string | null
          pago_id?: string | null
          pago_tipo?: string | null
          requiere_sena?: boolean
          sena_pagada?: boolean
          servicio_id?: string | null
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turno_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          cliente_email: string | null
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          creado_at: string | null
          estado: string | null
          fecha_hora_utc: string
          id: string
          moneda: string | null
          negocio_id: string | null
          precio_final: number | null
          servicio_nombre: string | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_at?: string | null
          estado?: string | null
          fecha_hora_utc: string
          id?: string
          moneda?: string | null
          negocio_id?: string | null
          precio_final?: number | null
          servicio_nombre?: string | null
        }
        Update: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_at?: string | null
          estado?: string | null
          fecha_hora_utc?: string
          id?: string
          moneda?: string | null
          negocio_id?: string | null
          precio_final?: number | null
          servicio_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event: {
        Row: {
          event_key: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
        }
        Insert: {
          event_key: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          received_at?: string
        }
        Update: {
          event_key?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_negocio_id_for_user: { Args: never; Returns: string }
      registrar_movimiento_stock: {
        Args: {
          p_cantidad: number
          p_ip_address?: string
          p_motivo?: string
          p_negocio_id: string
          p_producto_id: string
          p_tipo: string
          p_turno_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
