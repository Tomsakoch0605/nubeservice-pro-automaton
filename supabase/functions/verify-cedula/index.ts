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

    const cleanCedula = cedula.replace(/\D/g, '');
    if (cleanCedula.length < 5 || cleanCedula.length > 12) {
      return new Response(
        JSON.stringify({ success: false, error: 'El número de cédula debe tener entre 5 y 12 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying cédula:', cleanCedula);

    // Use the SEP's public Solr-based search API directly
    const solrUrl = `https://search.sep.gob.mx/solr/cedulasCore/select?fl=*,score&q=numCedula:${cleanCedula}&start=0&rows=10&wt=json&indent=on`;

    const response = await fetch(solrUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error('SEP API error, status:', response.status);
      return fallbackResponse(cleanCedula);
    }

    const data = await response.json();
    const docs = data?.response?.docs || [];
    const numFound = data?.response?.numFound || 0;

    console.log('SEP API results found:', numFound);

    if (numFound === 0 || docs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          verified: false,
          cedula: cleanCedula,
          message: 'No se encontró la cédula profesional en el registro de la SEP.',
          verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Found! Extract info from the first matching record
    const record = docs[0];
    const result: Record<string, unknown> = {
      success: true,
      verified: true,
      cedula: cleanCedula,
      message: 'La cédula profesional fue verificada exitosamente en el registro de la SEP.',
      verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
    };

    if (record.nombre) {
      const fullName = [record.nombre, record.paterno, record.materno]
        .filter(Boolean)
        .join(' ');
      result.holderName = fullName;
    }
    if (record.titulo) result.profession = record.titulo;
    if (record.insAcreditworthy || record.desins) result.institution = record.desins || record.insAcreditworthy;
    if (record.anioReg) result.year = record.anioReg;
    if (record.tipo) result.type = record.tipo;

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying cédula:', error);
    return fallbackResponse('');
  }
});

function fallbackResponse(cleanCedula: string) {
  return new Response(
    JSON.stringify({
      success: true,
      verified: null,
      fallback: true,
      cedula: cleanCedula,
      message: 'No se pudo verificar automáticamente. Puedes verificar manualmente en el portal de la SEP.',
      verificationUrl: 'https://cedulaprofesional.sep.gob.mx/',
    }),
    { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version', 'Content-Type': 'application/json' } }
  );
}
