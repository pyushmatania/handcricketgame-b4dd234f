
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS abandons integer NOT NULL DEFAULT 0;

ALTER TABLE public.multiplayer_games ADD COLUMN IF NOT EXISTS host_reserve_ms integer NOT NULL DEFAULT 10000;
ALTER TABLE public.multiplayer_games ADD COLUMN IF NOT EXISTS guest_reserve_ms integer NOT NULL DEFAULT 10000;
ALTER TABLE public.multiplayer_games ADD COLUMN IF NOT EXISTS abandoned_by uuid DEFAULT NULL;
