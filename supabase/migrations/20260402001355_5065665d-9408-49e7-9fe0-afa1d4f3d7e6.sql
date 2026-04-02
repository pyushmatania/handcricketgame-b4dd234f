ALTER TABLE public.multiplayer_games
  ADD COLUMN IF NOT EXISTS game_type text,
  ADD COLUMN IF NOT EXISTS room_code text,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS phase_started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS turn_deadline_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS turn_number integer,
  ADD COLUMN IF NOT EXISTS innings_number integer,
  ADD COLUMN IF NOT EXISTS host_move_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS guest_move_submitted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS round_result_payload jsonb,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;

UPDATE public.multiplayer_games
SET
  game_type = COALESCE(game_type, 'ar'),
  room_code = COALESCE(room_code, upper(substr(md5(random()::text), 1, 8))),
  turn_number = COALESCE(turn_number, current_turn, 1),
  innings_number = COALESCE(innings_number, innings, 1),
  phase = COALESCE(
    phase,
    CASE
      WHEN status = 'waiting' THEN 'waiting_for_guest'
      WHEN status = 'toss' THEN 'toss'
      WHEN status = 'playing' THEN 'pre_round_countdown'
      WHEN status = 'finished' THEN 'match_finished'
      WHEN status = 'abandoned' THEN 'abandoned'
      WHEN status = 'cancelled' THEN 'abandoned'
      ELSE 'waiting_for_guest'
    END
  )
WHERE
  game_type IS NULL
  OR room_code IS NULL
  OR turn_number IS NULL
  OR innings_number IS NULL
  OR phase IS NULL;

ALTER TABLE public.multiplayer_games
  ALTER COLUMN game_type SET DEFAULT 'ar',
  ALTER COLUMN game_type SET NOT NULL,
  ALTER COLUMN room_code SET DEFAULT upper(substr(md5(random()::text), 1, 8)),
  ALTER COLUMN room_code SET NOT NULL,
  ALTER COLUMN phase SET DEFAULT 'waiting_for_guest',
  ALTER COLUMN turn_number SET DEFAULT 1,
  ALTER COLUMN turn_number SET NOT NULL,
  ALTER COLUMN innings_number SET DEFAULT 1,
  ALTER COLUMN innings_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS multiplayer_games_room_code_uidx
ON public.multiplayer_games (room_code);

ALTER TABLE public.match_invites
  ADD COLUMN IF NOT EXISTS game_type text,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS declined_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

UPDATE public.match_invites mi
SET
  game_type = COALESCE(mi.game_type, mg.game_type, 'ar'),
  expires_at = COALESCE(mi.expires_at, mi.created_at + interval '5 minutes')
FROM public.multiplayer_games mg
WHERE mg.id = mi.game_id
  AND (mi.game_type IS NULL OR mi.expires_at IS NULL);

UPDATE public.match_invites
SET
  game_type = COALESCE(game_type, 'ar'),
  expires_at = COALESCE(expires_at, created_at + interval '5 minutes')
WHERE game_type IS NULL OR expires_at IS NULL;

ALTER TABLE public.match_invites
  ALTER COLUMN game_type SET DEFAULT 'ar',
  ALTER COLUMN game_type SET NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 minutes'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS match_invites_to_user_status_expires_idx
ON public.match_invites (to_user_id, status, expires_at DESC);