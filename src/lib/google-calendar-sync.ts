import { supabase } from "@/integrations/supabase/client";

/**
 * Push an appointment to Google Calendar (fire-and-forget).
 * Silently skips if Google Calendar is not connected.
 */
export async function pushToGoogleCalendar(appointment: {
  summary: string;
  description?: string;
  starts_at: string;
  ends_at: string;
}) {
  try {
    const { error } = await supabase.functions.invoke("google-calendar-sync", {
      body: {
        action: "push",
        appointment: {
          summary: appointment.summary,
          description: appointment.description || "",
          starts_at: appointment.starts_at,
          ends_at: appointment.ends_at,
        },
      },
    });
    // Silently ignore — user may not have Google Calendar connected
    if (error) {
      console.log("Google Calendar sync skipped:", error.message);
    }
  } catch {
    // Non-critical — don't block the main flow
    console.log("Google Calendar sync not available");
  }
}
