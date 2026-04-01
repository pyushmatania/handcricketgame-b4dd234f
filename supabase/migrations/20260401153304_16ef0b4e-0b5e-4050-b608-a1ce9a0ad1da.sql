-- Multiplayer games table
CREATE TABLE public.multiplayer_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  host_score INTEGER NOT NULL DEFAULT 0,
  guest_score INTEGER NOT NULL DEFAULT 0,
  host_move TEXT,
  guest_move TEXT,
  current_turn INTEGER NOT NULL DEFAULT 1,
  innings INTEGER NOT NULL DEFAULT 1,
  host_batting BOOLEAN NOT NULL DEFAULT true,
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.multiplayer_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view games"
  ON public.multiplayer_games FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create games"
  ON public.multiplayer_games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Players can update their games"
  ON public.multiplayer_games FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE TRIGGER update_multiplayer_games_updated_at
  BEFORE UPDATE ON public.multiplayer_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mp_games_status ON public.multiplayer_games(status);
CREATE INDEX idx_mp_games_host ON public.multiplayer_games(host_id);
CREATE INDEX idx_mp_games_guest ON public.multiplayer_games(guest_id);

-- Enable realtime for multiplayer_games
ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_games;