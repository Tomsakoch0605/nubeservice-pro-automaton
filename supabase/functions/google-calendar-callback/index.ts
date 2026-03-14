import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(redirectHtml("Error: " + error, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHtml("Faltan parámetros", false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { profileId } = JSON.parse(atob(stateParam));

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-calendar-callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return new Response(redirectHtml("Error de Google: " + tokens.error_description, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Use service role to write tokens
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabase
      .from("calendar_integrations")
      .upsert({
        profile_id: profileId,
        provider: "google",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        is_active: true,
      }, { onConflict: "profile_id,provider" });

    if (upsertError) {
      return new Response(redirectHtml("Error al guardar: " + upsertError.message, false), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response(redirectHtml("¡Google Calendar conectado exitosamente!", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    return new Response(redirectHtml("Error: " + err.message, false), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function redirectHtml(message: string, success: boolean) {
  return `<!DOCTYPE html>
<html>
<head><title>Google Calendar</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#f9fafb;">
  <div style="text-align:center;max-width:400px;">
    <h2 style="color:${success ? '#16a34a' : '#dc2626'}">${message}</h2>
    <p>Puedes cerrar esta ventana.</p>
    <script>
      setTimeout(() => {
        if (window.opener) { window.opener.postMessage({ type: 'google-calendar-connected', success: ${success} }, '*'); window.close(); }
      }, 2000);
    </script>
  </div>
</body>
</html>`;
}
