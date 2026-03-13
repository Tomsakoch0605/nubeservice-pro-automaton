import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate tomorrow's date range
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

    // Fetch tomorrow's appointments that haven't been reminded yet
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, starts_at, status, profile_id, clients(full_name), services(name)")
      .in("status", ["pending", "confirmed"])
      .eq("reminder_sent", false)
      .gte("starts_at", tomorrowStart.toISOString())
      .lte("starts_at", tomorrowEnd.toISOString());

    if (apptError) {
      throw new Error(`Error fetching appointments: ${apptError.message}`);
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to remind", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group appointments by profile_id
    const byProfile: Record<string, typeof appointments> = {};
    for (const appt of appointments) {
      if (!byProfile[appt.profile_id]) byProfile[appt.profile_id] = [];
      byProfile[appt.profile_id].push(appt);
    }

    let notificationsCreated = 0;
    const appointmentIds: string[] = [];

    for (const [profileId, profileAppts] of Object.entries(byProfile)) {
      // Create individual notifications for each appointment
      for (const appt of profileAppts) {
        const clientName = (appt.clients as any)?.full_name || "Cliente";
        const serviceName = (appt.services as any)?.name || "Servicio";
        const time = new Date(appt.starts_at).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Argentina/Buenos_Aires",
        });

        const { error: notifError } = await supabase.from("notifications").insert({
          profile_id: profileId,
          title: "Recordatorio de cita mañana",
          message: `${clientName} — ${serviceName} a las ${time}`,
          type: "reminder",
          appointment_id: appt.id,
        });

        if (!notifError) {
          notificationsCreated++;
          appointmentIds.push(appt.id);
        }
      }

      // Create a summary notification
      if (profileAppts.length > 1) {
        await supabase.from("notifications").insert({
          profile_id: profileId,
          title: "Resumen de mañana",
          message: `Tenés ${profileAppts.length} citas programadas para mañana.`,
          type: "summary",
        });
        notificationsCreated++;
      }
    }

    // Mark appointments as reminded
    if (appointmentIds.length > 0) {
      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .in("id", appointmentIds);
    }

    return new Response(
      JSON.stringify({
        message: "Reminders sent",
        notificationsCreated,
        appointmentsProcessed: appointmentIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
