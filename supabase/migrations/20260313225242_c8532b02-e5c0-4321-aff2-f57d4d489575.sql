
CREATE OR REPLACE FUNCTION public.notify_on_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_name text;
  service_name text;
  appt_date text;
  appt_time text;
BEGIN
  SELECT full_name INTO client_name FROM public.clients WHERE id = NEW.client_id;
  SELECT name INTO service_name FROM public.services WHERE id = NEW.service_id;
  
  appt_date := to_char(NEW.starts_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY');
  appt_time := to_char(NEW.starts_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI');

  INSERT INTO public.notifications (profile_id, title, message, type, appointment_id)
  VALUES (
    NEW.profile_id,
    'Nueva reserva recibida',
    client_name || ' reservó ' || service_name || ' para el ' || appt_date || ' a las ' || appt_time || 'hs.',
    'new_booking',
    NEW.id
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_booking_notify
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_booking();
