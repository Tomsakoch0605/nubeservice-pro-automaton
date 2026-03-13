CREATE POLICY "Authenticated can view profile by slug"
ON public.profiles
FOR SELECT
TO authenticated
USING (slug IS NOT NULL);