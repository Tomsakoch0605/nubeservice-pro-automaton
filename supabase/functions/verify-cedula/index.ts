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

    // Try scraping the SEP verification page with the cédula number
    const sepUrl = `https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action`;

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: sepUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000,
        actions: [
          { type: 'wait', milliseconds: 1000 },
          { type: 'click', selector: 'input[name="cedula"], #idCedula, input[type="text"]' },
          { type: 'write', text: cleanCedula },
          { type: 'click', selector: 'button[type="submit"], input[type="submit"], .btn-primary, #btnBuscar' },
          { type: 'wait', milliseconds: 3000 },
          { type: 'screenshot' },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', JSON.stringify(data));

      // Fallback: return a manual verification link
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

    console.log('Scrape completed');

    // Analyze the scraped content for verification results
    const markdown = data?.data?.markdown || data?.markdown || '';
    const html = data?.data?.html || data?.html || '';
    const screenshot = data?.data?.screenshot || data?.screenshot || null;
    const content = (markdown + ' ' + html).toLowerCase();

    // Look for indicators of a valid cédula
    const hasResults = content.includes('nombre') && (content.includes('institución') || content.includes('profesión') || content.includes('carrera'));
    const noResults = content.includes('no se encontraron') || content.includes('sin resultados') || content.includes('no existe');

    let result: any = {
      success: true,
      cedula: cleanCedula,
      verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
    };

    if (noResults) {
      result.verified = false;
      result.message = 'No se encontró la cédula profesional en el registro de la SEP.';
    } else if (hasResults) {
      result.verified = true;
      result.message = 'La cédula profesional fue encontrada en el registro de la SEP.';

      // Try to extract professional info from the content
      const nameMatch = markdown.match(/nombre[:\s]*([^\n|]+)/i);
      const professionMatch = markdown.match(/(?:profesión|carrera)[:\s]*([^\n|]+)/i);
      const institutionMatch = markdown.match(/(?:institución|escuela)[:\s]*([^\n|]+)/i);

      if (nameMatch) result.holderName = nameMatch[1].trim();
      if (professionMatch) result.profession = professionMatch[1].trim();
      if (institutionMatch) result.institution = institutionMatch[1].trim();
    } else {
      // Couldn't determine — provide fallback
      result.verified = null;
      result.fallback = true;
      result.message = 'No se pudo determinar el resultado. Verifica manualmente.';
    }

    if (screenshot) {
      result.screenshot = screenshot;
    }

    return new Response(
      JSON.stringify(result),
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
