const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    // Sanitize: only digits
    const cleanCedula = cedula.replace(/\D/g, '');
    if (cleanCedula.length < 5 || cleanCedula.length > 12) {
      return new Response(
        JSON.stringify({ success: false, error: 'El número de cédula debe tener entre 5 y 12 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Servicio de verificación no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying cédula:', cleanCedula);

    // Use Firecrawl search to find SEP records for this cédula
    const searchQuery = `cédula profesional ${cleanCedula} site:cedulaprofesional.sep.gob.mx`;

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        lang: 'es',
        country: 'mx',
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl search error:', JSON.stringify(data));

      // Fallback: try simpler scrape of the SEP main page
      return await fallbackVerification(apiKey, cleanCedula, corsHeaders);
    }

    console.log('Search completed, results:', data?.data?.length || 0);

    // Analyze search results
    const results = data?.data || [];
    let found = false;
    let holderName = '';
    let profession = '';
    let institution = '';

    for (const result of results) {
      const content = (result.markdown || result.description || '').toLowerCase();
      if (content.includes(cleanCedula)) {
        found = true;
        // Try to extract info
        const nameMatch = (result.markdown || '').match(/nombre[:\s]*([^\n|]+)/i);
        const professionMatch = (result.markdown || '').match(/(?:profesión|carrera|título)[:\s]*([^\n|]+)/i);
        const institutionMatch = (result.markdown || '').match(/(?:institución|escuela|universidad)[:\s]*([^\n|]+)/i);

        if (nameMatch) holderName = nameMatch[1].trim();
        if (professionMatch) profession = professionMatch[1].trim();
        if (institutionMatch) institution = institutionMatch[1].trim();
        break;
      }
    }

    if (found) {
      const result: Record<string, unknown> = {
        success: true,
        verified: true,
        cedula: cleanCedula,
        message: 'La cédula profesional fue encontrada en registros de la SEP.',
        verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
      };
      if (holderName) result.holderName = holderName;
      if (profession) result.profession = profession;
      if (institution) result.institution = institution;

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If search didn't find it directly, provide fallback with manual link
    return new Response(
      JSON.stringify({
        success: true,
        verified: null,
        fallback: true,
        cedula: cleanCedula,
        message: 'No se pudo verificar automáticamente. El sitio de la SEP tiene protección anti-bots. Puedes verificar manualmente.',
        verificationUrl: `https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying cédula:', error);
    return new Response(
      JSON.stringify({
        success: true,
        verified: null,
        fallback: true,
        message: 'No se pudo verificar automáticamente. Puedes verificar manualmente.',
        verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fallbackVerification(apiKey: string, cleanCedula: string, corsHeaders: Record<string, string>) {
  try {
    // Try scraping the SEP page directly with increased timeout
    const sepUrl = `https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`;

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: sepUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 10000,
        timeout: 60000,
      }),
    });

    if (!response.ok) {
      console.error('Fallback scrape also failed');
    }
  } catch (e) {
    console.error('Fallback error:', e);
  }

  // Always return fallback with manual verification link
  return new Response(
    JSON.stringify({
      success: true,
      verified: null,
      fallback: true,
      cedula: cleanCedula,
      message: 'El sitio de la SEP no permite verificación automática en este momento. Puedes verificar manualmente haciendo clic en el enlace.',
      verificationUrl: `https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
