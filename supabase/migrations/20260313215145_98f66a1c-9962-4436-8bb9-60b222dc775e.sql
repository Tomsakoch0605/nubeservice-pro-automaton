
-- Add slug column to profiles
ALTER TABLE public.profiles ADD COLUMN slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_profiles_slug ON public.profiles(slug);

-- Allow public (anon) to read profiles by slug for booking page
CREATE POLICY "Public can view profile by slug"
ON public.profiles
FOR SELECT
TO anon
USING (slug IS NOT NULL);

-- Allow anon to insert clients (for public booking)
CREATE POLICY "Public can create clients"
ON public.clients
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to read clients they just created (needed for insert returning)
CREATE POLICY "Public can read clients"
ON public.clients
FOR SELECT
TO anon
USING (true);

-- Allow anon to insert appointments (for public booking)
CREATE POLICY "Public can create appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (true);
