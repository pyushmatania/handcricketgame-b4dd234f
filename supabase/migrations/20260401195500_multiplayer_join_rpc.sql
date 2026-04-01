-- Atomic join RPC for strict two-player multiplayer rooms
ALTER TABLE public.multiplayer_games
  DROP CONSTRAINT IF EXISTS multiplayer_games_distinct_players_check;

ALTER TABLE public.multiplayer_games
  ADD CONSTRAINT multiplayer_games_distinct_players_check
  CHECK (guest_id IS NULL OR guest_id <> host_id);

CREATE OR REPLACE FUNCTION public.join_multiplayer_room(p_game_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  g public.multiplayer_games%ROWTYPE;
  joined public.multiplayer_games%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthenticated');
  END IF;

  SELECT * INTO g FROM public.multiplayer_games WHERE id = p_game_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF g.status IN ('finished', 'abandoned', 'cancelled') THEN
    RETURN jsonb_build_object('status', 'closed', 'game', to_jsonb(g));
  END IF;

  IF g.host_id = uid THEN
    RETURN jsonb_build_object('status', 'host', 'game', to_jsonb(g));
  END IF;

  IF g.guest_id IS NULL THEN
    UPDATE public.multiplayer_games
      SET guest_id = uid,
          status = CASE WHEN status = 'waiting' THEN 'toss' ELSE status END,
          started_at = COALESCE(started_at, now())
    WHERE id = p_game_id AND guest_id IS NULL
    RETURNING * INTO joined;

    IF FOUND THEN
      RETURN jsonb_build_object('status', 'joined', 'game', to_jsonb(joined));
    END IF;

    SELECT * INTO g FROM public.multiplayer_games WHERE id = p_game_id;
  END IF;

  IF g.guest_id = uid THEN
    RETURN jsonb_build_object('status', 'rejoined', 'game', to_jsonb(g));
  END IF;

  RETURN jsonb_build_object('status', 'full', 'game', to_jsonb(g));
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_multiplayer_room(uuid) TO authenticated;
