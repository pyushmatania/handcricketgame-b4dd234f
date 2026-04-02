
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS login_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date date,
ADD COLUMN IF NOT EXISTS best_login_streak integer NOT NULL DEFAULT 0;
