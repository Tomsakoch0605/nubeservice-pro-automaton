
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cedula_profesional text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rfc text DEFAULT NULL;
