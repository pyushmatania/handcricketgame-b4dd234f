
-- Weekly challenges table
CREATE TABLE public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  target_value integer NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  reward_label text DEFAULT 'Champion',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Track user progress on weekly challenges
CREATE TABLE public.challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Achievement reactions (emoji reactions on record breaks)
CREATE TABLE public.achievement_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_break_id uuid NOT NULL REFERENCES public.record_breaks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(record_break_id, user_id)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_reactions ENABLE ROW LEVEL SECURITY;

-- Weekly challenges are readable by all authenticated
CREATE POLICY "Anyone can view weekly challenges"
  ON public.weekly_challenges FOR SELECT
  TO authenticated
  USING (true);

-- Challenge progress policies
CREATE POLICY "Users can view own and friends progress"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IN (SELECT friend_id FROM public.friends WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own progress"
  ON public.challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.challenge_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Achievement reactions policies
CREATE POLICY "Users can view reactions on their record breaks"
  ON public.achievement_reactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    record_break_id IN (
      SELECT id FROM public.record_breaks 
      WHERE broken_by = auth.uid() OR record_holder = auth.uid()
    )
  );

CREATE POLICY "Users can insert reactions"
  ON public.achievement_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.achievement_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
