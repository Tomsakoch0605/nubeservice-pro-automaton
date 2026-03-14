const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function fallbackResponse(cleanCedula: string, customMessage?: string) {
  return new Response(
    JSON.stringify({
      success: true,
      verified: null,
      fallback: true,
      cedula: cleanCedula,
      message: customMessage || 'No se pudo verificar automáticamente. Puedes verificar manualmente en el portal de la SEP.',
      verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cedula } = await req.json();

    if (!cedula || typeof cedula !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'El número de cédula es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanCedula = cedula.replace(/\D/g, '');
    if (cleanCedula.length < 5 || cleanCedula.length > 12) {
      return new Response(
        JSON.stringify({ success: false, error: 'El número de cédula debe tener entre 5 y 12 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying cédula:', cleanCedula);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return fallbackResponse(cleanCedula, 'Servicio de verificación no configurado');
    }

    // Use Firecrawl search to find public records of this cédula number
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `"cédula profesional" "${cleanCedula}" SEP México`,
        limit: 5,
        lang: 'es',
        country: 'mx',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Firecrawl search error:', JSON.stringify(errorData));
      return fallbackResponse(cleanCedula);
    }

    const data = await response.json();
    const results = data?.data || [];
    console.log('Search results:', results.length);

    // Analyze search results for cédula info
    let found = false;
    let holderName = '';
    let profession = '';
    let institution = '';

    for (const result of results) {
      const text = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`;
      
      if (text.includes(cleanCedula)) {
        found = true;

        const nameMatch = text.match(/nombre[:\s]*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
        const profMatch = text.match(/(?:profesión|carrera|título|licenciatura|ingeniería|maestría|doctorado)[:\s]*([^\n,;|]+)/i);
        const instMatch = text.match(/(?:institución|universidad|escuela|instituto)[:\s]*([^\n,;|]+)/i);

        if (nameMatch) holderName = nameMatch[1].trim();
        if (profMatch) profession = profMatch[1].trim();
        if (instMatch) institution = instMatch[1].trim();
        break;
      }
    }

    if (found) {
      const resultData: Record<string, unknown> = {
        success: true,
        verified: true,
        cedula: cleanCedula,
        message: 'Se encontraron registros públicos de esta cédula profesional.',
        verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
      };
      if (holderName) resultData.holderName = holderName;
      if (profession) resultData.profession = profession;
      if (institution) resultData.institution = institution;

      return new Response(
        JSON.stringify(resultData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verified: null,
        fallback: true,
        cedula: cleanCedula,
        message: 'No se encontraron registros públicos. Esto no significa que la cédula sea inválida. Verifica directamente en el portal de la SEP.',
        verificationUrl: 'https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying cédula:', error);
    return fallbackResponse('');
  }
});
