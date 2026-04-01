
CREATE TABLE public.season_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  season_start date NOT NULL,
  season_end date NOT NULL,
  season_label text NOT NULL,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  total_matches integer NOT NULL DEFAULT 0,
  high_score integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  abandons integer NOT NULL DEFAULT 0,
  rank integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season snapshots"
  ON public.season_snapshots FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert season snapshots"
  ON public.season_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_season_snapshots_user ON public.season_snapshots(user_id);
CREATE INDEX idx_season_snapshots_season ON public.season_snapshots(season_start);
