
-- Record breaks table - stores memorable moments when friends break records
CREATE TABLE public.record_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type text NOT NULL,
  broken_by uuid NOT NULL,
  record_holder uuid NOT NULL,
  old_value integer NOT NULL,
  new_value integer NOT NULL,
  broken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.record_breaks ENABLE ROW LEVEL SECURITY;

-- Both the record breaker and holder can see the record
CREATE POLICY "Users can view their record breaks"
  ON public.record_breaks FOR SELECT
  TO authenticated
  USING (auth.uid() = broken_by OR auth.uid() = record_holder);

-- System inserts record breaks (from client after match)
CREATE POLICY "Authenticated users can insert record breaks"
  ON public.record_breaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = broken_by);

-- Allow friends to view each other's matches for detailed stats
CREATE POLICY "Friends can view friend matches"
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT friend_id FROM public.friends WHERE user_id = auth.uid()
    )
  );
