CREATE POLICY "Public can read appointments for availability"
ON public.appointments
FOR SELECT
TO anon
USING (
  status IN ('pending', 'confirmed')
  AND profile_id IN (
    SELECT id FROM profiles WHERE slug IS NOT NULL
  )
);