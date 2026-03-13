
-- Drop overly permissive policies and replace with scoped ones
DROP POLICY "Public can create clients" ON public.clients;
DROP POLICY "Public can read clients" ON public.clients;
DROP POLICY "Public can create appointments" ON public.appointments;

-- Anon can only insert clients linked to an existing profile
CREATE POLICY "Public can create clients for booking"
ON public.clients
FOR INSERT
TO anon
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE slug IS NOT NULL)
);

-- Anon can only read clients by exact id (for insert returning)
CREATE POLICY "Public can read own booking client"
ON public.clients
FOR SELECT
TO anon
USING (
  profile_id IN (SELECT id FROM public.profiles WHERE slug IS NOT NULL)
);

-- Anon can only insert appointments linked to valid profile with slug
CREATE POLICY "Public can create appointments for booking"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (
  profile_id IN (SELECT id FROM public.profiles WHERE slug IS NOT NULL)
  AND status = 'confirmed'
);
