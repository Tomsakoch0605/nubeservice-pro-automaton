import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get calendar integration using service role
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await adminSupabase
      .from("calendar_integrations")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expired
    let accessToken = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshData = await refreshRes.json();
      if (refreshData.error) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = refreshData.access_token;
      await adminSupabase
        .from("calendar_integrations")
        .update({
          access_token: refreshData.access_token,
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("id", integration.id);
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    if (action === "push") {
      // Push a single appointment to Google Calendar
      const { appointment } = body;
      if (!appointment) {
        return new Response(JSON.stringify({ error: "No appointment data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const event = {
        summary: appointment.summary || "Cita",
        description: appointment.description || "",
        start: { dateTime: appointment.starts_at, timeZone: "America/Mexico_City" },
        end: { dateTime: appointment.ends_at, timeZone: "America/Mexico_City" },
      };

      const calendarId = integration.calendar_id || "primary";
      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      const gcalEvent = await gcalRes.json();
      if (gcalEvent.error) {
        return new Response(JSON.stringify({ error: gcalEvent.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, eventId: gcalEvent.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "pull") {
      // Pull events from Google Calendar
      const calendarId = integration.calendar_id || "primary";
      const now = new Date().toISOString();
      const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const gcalRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${now}&timeMax=${maxDate}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const gcalData = await gcalRes.json();
      if (gcalData.error) {
        return new Response(JSON.stringify({ error: gcalData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update last synced
      await adminSupabase
        .from("calendar_integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", integration.id);

      return new Response(JSON.stringify({ events: gcalData.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
