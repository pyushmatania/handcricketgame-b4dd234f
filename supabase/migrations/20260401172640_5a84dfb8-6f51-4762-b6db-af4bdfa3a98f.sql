
-- Add target_guest_id for friend-specific invites
ALTER TABLE public.multiplayer_games ADD COLUMN IF NOT EXISTS target_guest_id uuid;

-- Create match_invites table for real-time notifications
CREATE TABLE public.match_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their invites" ON public.match_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create invites" ON public.match_invites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update invites sent to them" ON public.match_invites
  FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);

-- Enable realtime for match_invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_invites;
