import { supabase } from "@/integrations/supabase/client";

export type MultiplayerGameType = "ar" | "tap" | "tournament";

export const generateRoomCode = (): string =>
  Math.random().toString(36).slice(2, 10).toUpperCase();

export function mapCreateRoomError(error: any): string {
  const msg = String(error?.message || "");
  if (error?.code === "42501") return "Permission denied while creating room.";
  if (msg.includes("room_code") || error?.code === "23502") return "Room code generation failed. Please retry.";
  if (msg.includes("game_type") || error?.code === "23514") return "Invalid game mode selected.";
  return "Failed to create battle room.";
}

export async function createMultiplayerRoom(hostId: string, gameType: MultiplayerGameType, targetGuestId?: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const roomCode = generateRoomCode();
    const { data, error } = await supabase
      .from("multiplayer_games")
      .insert({
        host_id: hostId,
        game_type: gameType,
        room_code: roomCode,
        ...(targetGuestId ? { target_guest_id: targetGuestId } : {}),
        host_reserve_ms: 10000,
        guest_reserve_ms: 10000,
      } as any)
      .select()
      .single();

    if (!error && data) return { data, error: null };

    if (error?.code !== "23505") {
      console.error("createMultiplayerRoom failed", error);
      return { data: null, error };
    }
  }

  return { data: null, error: { message: "Could not allocate a unique room code." } };
}
