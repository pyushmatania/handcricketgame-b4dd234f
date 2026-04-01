
-- Add invite_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Generate invite codes for existing profiles
UPDATE public.profiles SET invite_code = upper(substr(md5(random()::text || id::text), 1, 8)) WHERE invite_code IS NULL;

-- Make invite_code NOT NULL with a default
ALTER TABLE public.profiles ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(random()::text), 1, 8));
ALTER TABLE public.profiles ALTER COLUMN invite_code SET NOT NULL;

-- Friend requests table
CREATE TABLE public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests FOR SELECT TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests sent to them"
  ON public.friend_requests FOR UPDATE TO authenticated
  USING (auth.uid() = to_user_id);

-- Friends table (confirmed friendships, bidirectional)
CREATE TABLE public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON public.friends FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "System can insert friendships"
  ON public.friends FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to accept friend request and create bidirectional friendship
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req record;
BEGIN
  SELECT * INTO req FROM public.friend_requests WHERE id = request_id AND to_user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;

  UPDATE public.friend_requests SET status = 'accepted', updated_at = now() WHERE id = request_id;

  INSERT INTO public.friends (user_id, friend_id) VALUES (req.from_user_id, req.to_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.friends (user_id, friend_id) VALUES (req.to_user_id, req.from_user_id) ON CONFLICT DO NOTHING;
END;
$$;
