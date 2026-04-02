import { supabase } from "@/integrations/supabase/client";

export type MultiplayerGameType = "ar" | "tap" | "tournament";

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export const generateRoomCode = (): string =>
  Math.random().toString(36).slice(2, 10).toUpperCase();

const getErrorText = (error: PostgrestLikeError | null | undefined): string =>
  [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" ").toLowerCase();

export function formatPostgrestError(error: PostgrestLikeError | null | undefined): string {
  if (!error) return "Unknown backend error.";

  const parts = [
    error.code ? `code=${error.code}` : null,
    error.message ? `message=${error.message}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);

  return parts.join(" | ") || "Unknown backend error.";
}

export function logPostgrestError(
  context: string,
  error: PostgrestLikeError | null | undefined,
  extra?: Record<string, unknown>
) {
  console.error(context, {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
    extra: extra ?? null,
    error,
  });
}

export function mapCreateRoomError(error: any): string {
  const msg = getErrorText(error);
  if (error?.code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Room creation failed (policy issue).";
  }
  if (error?.code === "PGRST204" || error?.code === "42703" || msg.includes("schema cache") || msg.includes("does not exist")) {
    return "Room creation failed (schema mismatch).";
  }
  if (msg.includes("room_code") || error?.code === "23502" || error?.code === "23505") {
    return "Room code generation failed. Please retry.";
  }
  if (msg.includes("host_id") || msg.includes("invalid input syntax for type uuid") || error?.code === "22P02") {
    return "Room creation failed (invalid user).";
  }
  if (msg.includes("game_type") || error?.code === "23514") return "Invalid game mode selected.";
  return "Failed to create battle room.";
}

export function mapInviteInsertError(error: any): string {
  const msg = getErrorText(error);

  if (error?.code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Invite failed (policy issue)";
  }
  if (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    error?.code === "23502" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("column")
  ) {
    return "Invite failed (schema mismatch)";
  }
  if (
    error?.code === "22P02" ||
    error?.code === "23503" ||
    msg.includes("invalid input syntax for type uuid") ||
    msg.includes("from_user_id") ||
    msg.includes("to_user_id")
  ) {
    return "Invite failed (invalid user)";
  }

  return "Invite failed (unknown backend error)";
}

export function mapJoinRoomError(error: any): string {
  const msg = getErrorText(error);

  if (error?.code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Join failed (policy issue).";
  }
  if (msg.includes("not authenticated")) {
    return "Join failed (not signed in).";
  }
  if (msg.includes("already full") || msg.includes("another player")) {
    return "Join failed (room already taken).";
  }
  if (msg.includes("not found") || msg.includes("no longer joinable") || msg.includes("expired")) {
    return "Join failed (match expired).";
  }

  return "Join failed (unknown backend error).";
}

export function mapAcceptInviteError(error: any): string {
  const msg = getErrorText(error);

  if (error?.code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    return "Invite failed (policy issue).";
  }
  if (msg.includes("not authenticated")) {
    return "Invite failed (not signed in).";
  }
  if (msg.includes("already handled")) {
    return "Invite already handled.";
  }
  if (msg.includes("already full") || msg.includes("another player")) {
    return "Invite failed (room already taken).";
  }
  if (msg.includes("expired") || msg.includes("not found") || msg.includes("no longer joinable")) {
    return "Invite failed (match expired).";
  }

  return "Invite accept failed.";
}

export async function claimMultiplayerGame(gameId: string) {
  return await (supabase as any).rpc("claim_multiplayer_game", { p_game_id: gameId });
}

export async function acceptMatchInvite(inviteId: string) {
  return await (supabase as any).rpc("accept_match_invite", { p_invite_id: inviteId });
}

export async function createMultiplayerRoom(hostId: string, gameType: MultiplayerGameType, targetGuestId?: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const roomCode = generateRoomCode();
    const payload = {
      host_id: hostId,
      game_type: gameType,
      room_code: roomCode,
      ...(targetGuestId ? { target_guest_id: targetGuestId } : {}),
      host_reserve_ms: 10000,
      guest_reserve_ms: 10000,
    } as any;

    const { data, error } = await supabase
      .from("multiplayer_games")
      .insert(payload)
      .select()
      .single();

    if (!error && data) return { data, error: null };

    if (error?.code !== "23505") {
      logPostgrestError("multiplayer room insert failed", error, {
        attempt: attempt + 1,
        payload,
      });
      return { data: null, error };
    }

    console.warn("multiplayer room insert collision", {
      attempt: attempt + 1,
      roomCode,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  return { data: null, error: { message: "Could not allocate a unique room code." } };
}
