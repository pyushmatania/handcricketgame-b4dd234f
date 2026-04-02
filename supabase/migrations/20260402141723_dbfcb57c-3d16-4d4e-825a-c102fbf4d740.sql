ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sixes integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_fours integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_runs integer NOT NULL DEFAULT 0;