import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's auth context
    const client = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? '',
      Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the auth context
    const { data: { user } } = await client.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Get the request body
    const { nombre, slug, whatsapp, tema, apertura, cierre } = await req.json()

    // Validate incoming data (basic validation)
    if (!nombre || !slug || !apertura || !cierre) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    
    // --- Start Transaction-like block ---

    // 1. Get trial days from config
    let diasTrial = 30
    const { data: config } = await client
      .from('config')
      .select('valor')
      .eq('clave', 'dias_trial')
      .maybeSingle()
    if (config?.valor) diasTrial = Number(config.valor)

    const trialHasta = new Date()
    trialHasta.setDate(trialHasta.getDate() + diasTrial)

    // 2. Insert into 'negocio' table
    const { data: negocioData, error: negocioError } = await client
      .from('negocio')
      .insert({
        owner_id: user.id,
        nombre,
        slug,
        whatsapp: whatsapp || null,
        tema,
        hora_apertura: apertura + ':00',
        hora_cierre: cierre + ':00',
        suscripcion_tipo: 'trial',
        trial_hasta: trialHasta.toISOString().split('T')[0],
        onboarding_completo: true,
        activo: true
      })
      .select('id')
      .single()

    if (negocioError) {
      console.error('Error creating negocio:', negocioError)
      throw negocioError
    }

    // 3. Insert into 'adminrol' table
    const { error: adminrolError } = await client
      .from('adminrol')
      .insert({ 
        user_id: user.id, 
        role: 'owner', 
        negocio_id: negocioData.id 
      })

    if (adminrolError) {
      console.error('Error creating adminrol:', adminrolError)
      throw adminrolError
    }

    // --- End Transaction-like block ---

    return new Response(JSON.stringify({ message: 'Negocio creado con éxito' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})