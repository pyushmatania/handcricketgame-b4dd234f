CREATE OR REPLACE FUNCTION public.claim_multiplayer_game(p_game_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_game public.multiplayer_games%ROWTYPE;
  v_joined_game_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_game
  FROM public.multiplayer_games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.host_id = v_user_id OR v_game.guest_id = v_user_id THEN
    RETURN v_game.id;
  END IF;

  IF v_game.status <> 'waiting' THEN
    RAISE EXCEPTION 'Game no longer joinable';
  END IF;

  IF v_game.guest_id IS NOT NULL THEN
    RAISE EXCEPTION 'Game already full';
  END IF;

  IF v_game.target_guest_id IS NOT NULL AND v_game.target_guest_id <> v_user_id THEN
    RAISE EXCEPTION 'This match invite is for another player';
  END IF;

  UPDATE public.multiplayer_games
  SET guest_id = v_user_id,
      status = 'toss',
      phase = 'toss',
      started_at = COALESCE(started_at, now()),
      phase_started_at = COALESCE(phase_started_at, now()),
      updated_at = now()
  WHERE id = p_game_id
    AND guest_id IS NULL
    AND status = 'waiting'
  RETURNING id INTO v_joined_game_id;

  IF v_joined_game_id IS NULL THEN
    RAISE EXCEPTION 'Unable to claim room';
  END IF;

  RETURN v_joined_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_multiplayer_game(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_multiplayer_game(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_match_invite(p_invite_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite public.match_invites%ROWTYPE;
  v_game_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.match_invites
  WHERE id = p_invite_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.to_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Not allowed to accept this invite';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite already handled';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  v_game_id := public.claim_multiplayer_game(v_invite.game_id);

  UPDATE public.match_invites
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = p_invite_id
    AND status = 'pending';

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_match_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_match_invite(uuid) TO authenticated;