CREATE POLICY "Authenticated can read appointments for availability"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  status IN ('pending', 'confirmed')
  AND profile_id IN (
    SELECT id FROM profiles WHERE slug IS NOT NULL
  )
);