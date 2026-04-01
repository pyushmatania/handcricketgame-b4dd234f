
DROP POLICY IF EXISTS "Players can update their games" ON public.multiplayer_games;

CREATE POLICY "Players can update their games" ON public.multiplayer_games
FOR UPDATE TO authenticated
USING (
  auth.uid() = host_id
  OR auth.uid() = guest_id
  OR (guest_id IS NULL AND (target_guest_id IS NULL OR target_guest_id = auth.uid()))
)
WITH CHECK (
  auth.uid() = host_id
  OR auth.uid() = guest_id
  OR (guest_id = auth.uid() AND (target_guest_id IS NULL OR target_guest_id = auth.uid()))
);
