import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres el asistente inteligente de Nube Service Now, una plataforma de gestión de turnos para prestadores de servicios independientes (peluqueros, barberos, manicuristas, kinesiólogos, etc.).

Tu rol principal es ayudar al prestador a gestionar su calendario y negocio de forma conversacional.

## Capacidades:
1. **Consultar agenda**: Puedes ver las citas de hoy, mañana, esta semana o cualquier fecha.
2. **Información de clientes**: Puedes buscar datos de clientes, historial de visitas y montos gastados.
3. **Resumen de negocio**: Puedes dar KPIs como ingresos del mes, tasa de asistencia, clientes activos.
4. **Sugerencias proactivas**: Si detectas huecos en la agenda, sugiere acciones. Si hay no-shows frecuentes, recomienda políticas de anticipo.
5. **Resolución de conflictos**: Si hay superposición de turnos, avisa y sugiere alternativas.

## Datos del contexto del prestador:
{{CONTEXT}}

## Reglas:
- Responde siempre en español de México (tú, tienes, etc.)
- Sé conciso pero cálido, como un asistente personal eficiente
- Usa emojis con moderación (máximo 2 por mensaje)
- Cuando des horarios, usa formato 24hs (ej: 14:30)
- Si te preguntan algo que no puedes hacer (como modificar citas directamente), explica qué debería hacer el prestador
- No inventes datos. Si no tienes info, dilo claramente
- Formatea las respuestas con markdown cuando sea útil (listas, negritas)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user context from Supabase
    const authHeader = req.headers.get("Authorization");
    let contextStr = "Sin datos de contexto disponibles.";

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
          const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

          const [todayAppts, weekAppts, clients, services, monthPayments] = await Promise.all([
            supabase.from("appointments").select("*, clients(full_name, phone), services(name, duration_minutes)")
              .eq("profile_id", profile.id).gte("starts_at", todayStart).lte("starts_at", todayEnd).order("starts_at"),
            supabase.from("appointments").select("*, clients(full_name), services(name)")
              .eq("profile_id", profile.id).gte("starts_at", todayStart).lte("starts_at", weekEnd).order("starts_at"),
            supabase.from("clients").select("*").eq("profile_id", profile.id),
            supabase.from("services").select("*").eq("profile_id", profile.id).eq("is_active", true),
            supabase.from("payments").select("amount, status").eq("profile_id", profile.id)
              .gte("created_at", monthStart).lte("created_at", monthEnd).eq("status", "completed"),
          ]);

          const revenue = (monthPayments.data || []).reduce((s, p) => s + Number(p.amount), 0);

          contextStr = `
Negocio: ${profile.business_name} (${profile.service_type || "Sin tipo"})
Dueño: ${profile.owner_name}
Horario: ${profile.start_time} a ${profile.end_time}
Días laborales: ${(profile.work_days || []).join(", ")}
Ubicación: ${profile.location || "No especificada"}
Requiere anticipo: ${profile.requires_deposit ? `Sí (${profile.deposit_percent}%)` : "No"}

Fecha y hora actual: ${now.toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}

Citas de hoy (${todayAppts.data?.length || 0}):
${(todayAppts.data || []).map((a: any) => `- ${new Date(a.starts_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} | ${a.clients?.full_name} | ${a.services?.name} | Estado: ${a.status}`).join("\n") || "Sin citas hoy"}

Citas esta semana: ${weekAppts.data?.length || 0}
Clientes registrados: ${clients.data?.length || 0}
Servicios activos: ${(services.data || []).map((s: any) => `${s.name} ($${s.price}, ${s.duration_minutes}min)`).join(", ") || "Ninguno"}
Ingresos del mes: $${revenue}`;
        }
      }
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{{CONTEXT}}", contextStr);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Inténtalo de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Recargá tu workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
