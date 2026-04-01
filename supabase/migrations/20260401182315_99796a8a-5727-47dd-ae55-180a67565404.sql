
-- Fix: allow guest to join a game when guest_id is NULL and they are the target
DROP POLICY IF EXISTS "Players can update their games" ON public.multiplayer_games;

CREATE POLICY "Players can update their games" ON public.multiplayer_games
FOR UPDATE TO public
USING (
  auth.uid() = host_id 
  OR auth.uid() = guest_id 
  OR (guest_id IS NULL AND (target_guest_id IS NULL OR target_guest_id = auth.uid()))
);
