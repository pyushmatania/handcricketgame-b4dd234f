-- Expand multiplayer schema for explicit game routing and room-code joins
ALTER TABLE public.multiplayer_games
  DROP CONSTRAINT IF EXISTS multiplayer_games_status_check;

ALTER TABLE public.multiplayer_games
  ADD CONSTRAINT multiplayer_games_status_check
  CHECK (status IN ('waiting', 'toss', 'playing', 'finished', 'abandoned', 'cancelled'));

ALTER TABLE public.multiplayer_games
  ADD COLUMN IF NOT EXISTS game_type text,
  ADD COLUMN IF NOT EXISTS room_code text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

UPDATE public.multiplayer_games
SET game_type = COALESCE(game_type, 'ar');

UPDATE public.multiplayer_games
SET room_code = COALESCE(room_code, upper(substr(replace(id::text, '-', ''), 1, 8)));

ALTER TABLE public.multiplayer_games
  ALTER COLUMN game_type SET DEFAULT 'ar',
  ALTER COLUMN game_type SET NOT NULL,
  ADD CONSTRAINT multiplayer_games_game_type_check CHECK (game_type IN ('ar', 'tap', 'tournament'));

ALTER TABLE public.multiplayer_games
  ALTER COLUMN room_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_games_room_code ON public.multiplayer_games(room_code);
CREATE INDEX IF NOT EXISTS idx_mp_games_game_type ON public.multiplayer_games(game_type);
