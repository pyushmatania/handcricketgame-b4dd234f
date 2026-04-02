import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PlayerAvatar from "./PlayerAvatar";
import { fetchPvpGamesBetweenUsers, computePvpRecord, type PvpGame } from "@/hooks/usePvpStats";

interface NodeProfile {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  avatar_index?: number;
  wins: number;
  losses: number;
  total_matches: number;
}

interface Edge {
  from: string;
  to: string;
  games: number;
  fromWins: number;
  toWins: number;
  draws: number;
}

interface Props {
  onSelectFriend?: (friendId: string) => void;
}

export default function FriendsNetworkGraph({ onSelectFriend }: Props) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<NodeProfile[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  useEffect(() => {
    if (!user) return;
    loadNetwork();
  }, [user?.id]);

  const loadNetwork = async () => {
    if (!user) return;
    setLoading(true);

    // Get friends
    const { data: friendRows } = await supabase.from("friends").select("friend_id").eq("user_id", user.id);
    if (!friendRows || !friendRows.length) { setLoading(false); return; }
    const friendIds = friendRows.map((f: any) => f.friend_id);
    const allIds = [user.id, ...friendIds];

    // Get profiles
    const { data: profileData } = await supabase.from("profiles")
      .select("user_id, display_name, avatar_url, avatar_index, wins, losses, total_matches")
      .in("user_id", allIds);

    if (profileData) setProfiles(profileData as unknown as NodeProfile[]);

    // Get all PvP games between these users
    const games = await fetchPvpGamesBetweenUsers(allIds);

    // Build edges
    const edgeMap: Record<string, { games: PvpGame[]; from: string; to: string }> = {};
    for (const g of games) {
      if (!g.guest_id) continue;
      const key = [g.host_id, g.guest_id].sort().join(":");
      if (!edgeMap[key]) {
        edgeMap[key] = { games: [], from: [g.host_id, g.guest_id].sort()[0], to: [g.host_id, g.guest_id].sort()[1] };
      }
      edgeMap[key].games.push(g);
    }

    const computedEdges: Edge[] = Object.values(edgeMap).map(e => {
      let fromWins = 0, toWins = 0, draws = 0;
      for (const g of e.games) {
        if (g.winner_id === e.from) fromWins++;
        else if (g.winner_id === e.to) toWins++;
        else draws++;
      }
      return { from: e.from, to: e.to, games: e.games.length, fromWins, toWins, draws };
    });

    setEdges(computedEdges);
    setLoading(false);
  };

  // Position nodes in a circle
  const nodePositions = useMemo(() => {
    const count = profiles.length;
    if (count === 0) return {};
    const cx = 150, cy = 130, radius = count <= 3 ? 70 : Math.min(110, 50 + count * 10);
    const positions: Record<string, { x: number; y: number }> = {};
    
    // Put current user at center if 4+ nodes
    if (count >= 4 && user) {
      positions[user.id] = { x: cx, y: cy };
      const others = profiles.filter(p => p.user_id !== user.id);
      others.forEach((p, i) => {
        const angle = (2 * Math.PI / others.length) * i - Math.PI / 2;
        positions[p.user_id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
      });
    } else {
      profiles.forEach((p, i) => {
        const angle = (2 * Math.PI / count) * i - Math.PI / 2;
        positions[p.user_id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
      });
    }
    return positions;
  }, [profiles, user]);

  const getProfileName = (id: string) => profiles.find(p => p.user_id === id)?.display_name || "?";

  if (loading) {
    return (
      <div className="glass-premium rounded-xl p-8 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto" />
        <p className="text-[10px] text-muted-foreground mt-3 font-display">Building network...</p>
      </div>
    );
  }

  if (profiles.length < 2) {
    return (
      <div className="glass-premium rounded-xl p-8 text-center">
        <span className="text-3xl block mb-2">🕸️</span>
        <p className="font-display text-sm font-bold text-foreground">Not enough friends</p>
        <p className="text-[9px] text-muted-foreground mt-1">Add friends and play PvP matches to see the network</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-4 rounded-full bg-primary" />
        <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">FRIENDS NETWORK</span>
        <span className="text-[7px] text-muted-foreground/50 font-display">{profiles.length} players • {edges.length} rivalries</span>
      </div>

      {/* SVG Network */}
      <div className="glass-premium rounded-2xl p-3 border border-primary/10 relative">
        <svg viewBox="0 0 300 260" className="w-full" style={{ height: "240px" }}>
          {/* Edges */}
          {edges.map((e) => {
            const from = nodePositions[e.from];
            const to = nodePositions[e.to];
            if (!from || !to) return null;
            const thickness = Math.min(3, 0.5 + e.games * 0.5);
            const isSelected = selectedEdge && selectedEdge.from === e.from && selectedEdge.to === e.to;
            return (
              <g key={`${e.from}-${e.to}`} onClick={() => setSelectedEdge(isSelected ? null : e)} style={{ cursor: "pointer" }}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={isSelected ? "hsl(217 91% 60% / 0.6)" : "hsl(217 91% 60% / 0.15)"}
                  strokeWidth={isSelected ? thickness + 1 : thickness} strokeLinecap="round" />
                {/* Game count badge */}
                <circle cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2} r="8"
                  fill={isSelected ? "hsl(217 91% 60% / 0.3)" : "hsl(217 91% 60% / 0.1)"} />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 + 3}
                  textAnchor="middle" fontSize="7" fontWeight="bold"
                  fill={isSelected ? "hsl(217 91% 60%)" : "hsl(217 91% 60% / 0.5)"}>
                  {e.games}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {profiles.map((p) => {
            const pos = nodePositions[p.user_id];
            if (!pos) return null;
            const isMe = p.user_id === user?.id;
            const nodeEdges = edges.filter(e => e.from === p.user_id || e.to === p.user_id);
            const totalPvpGames = nodeEdges.reduce((s, e) => s + e.games, 0);
            return (
              <g key={p.user_id}
                onClick={() => !isMe && onSelectFriend?.(p.user_id)}
                style={{ cursor: isMe ? "default" : "pointer" }}>
                {/* Glow for active players */}
                {totalPvpGames > 3 && (
                  <circle cx={pos.x} cy={pos.y} r="22" fill="none"
                    stroke={isMe ? "hsl(45 93% 58% / 0.15)" : "hsl(217 91% 60% / 0.1)"}
                    strokeWidth="1" />
                )}
                <circle cx={pos.x} cy={pos.y} r="16"
                  fill={isMe ? "hsl(45 93% 58% / 0.15)" : "hsl(217 91% 60% / 0.08)"}
                  stroke={isMe ? "hsl(45 93% 58% / 0.4)" : "hsl(217 91% 60% / 0.2)"}
                  strokeWidth="1.5" />
                <text x={pos.x} y={pos.y + 3} textAnchor="middle" fontSize="12">
                  {isMe ? "👤" : "🏏"}
                </text>
                {/* Name label */}
                <text x={pos.x} y={pos.y + 28} textAnchor="middle"
                  fontSize="7" fontWeight="bold"
                  fill={isMe ? "hsl(45 93% 58%)" : "hsl(0 0% 80%)"}>
                  {isMe ? "YOU" : p.display_name.slice(0, 10)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected edge details */}
      <AnimatePresence>
        {selectedEdge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="glass-premium rounded-xl p-3 border border-primary/15"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-center flex-1">
                <span className="font-display text-sm font-black text-neon-green block">{selectedEdge.fromWins}</span>
                <span className="text-[6px] font-display text-muted-foreground tracking-widest">{getProfileName(selectedEdge.from).slice(0, 10)}</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[8px] font-display text-muted-foreground tracking-widest block">RIVALRY</span>
                <span className="font-display text-xs font-bold text-foreground">{selectedEdge.games} games</span>
                {selectedEdge.draws > 0 && <span className="text-[7px] text-secondary font-display block">{selectedEdge.draws} draws</span>}
              </div>
              <div className="text-center flex-1">
                <span className="font-display text-sm font-black text-out-red block">{selectedEdge.toWins}</span>
                <span className="text-[6px] font-display text-muted-foreground tracking-widest">{getProfileName(selectedEdge.to).slice(0, 10)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-muted/30">
              <div className="bg-neon-green/60 rounded-l-full" style={{ width: `${selectedEdge.games > 0 ? (selectedEdge.fromWins / selectedEdge.games) * 100 : 50}%` }} />
              <div className="bg-out-red/60 rounded-r-full flex-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All rivalries list */}
      {edges.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-accent" />
            <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">ALL RIVALRIES ({edges.length})</span>
          </div>
          <div className="space-y-1.5">
            {edges.sort((a, b) => b.games - a.games).map((e) => (
              <motion.div key={`${e.from}-${e.to}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEdge(selectedEdge?.from === e.from && selectedEdge?.to === e.to ? null : e)}
                className={`glass-card rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer ${
                  selectedEdge?.from === e.from && selectedEdge?.to === e.to ? "border border-primary/20" : ""
                }`}>
                <span className="font-display text-[9px] font-bold text-foreground flex-1 truncate">{getProfileName(e.from)}</span>
                <div className="flex items-center gap-1">
                  <span className="font-display text-[10px] font-black text-neon-green">{e.fromWins}</span>
                  <span className="text-[7px] text-muted-foreground">-</span>
                  <span className="font-display text-[10px] font-black text-out-red">{e.toWins}</span>
                </div>
                <span className="text-[7px] text-muted-foreground font-display">({e.games})</span>
                <span className="font-display text-[9px] font-bold text-foreground flex-1 truncate text-right">{getProfileName(e.to)}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {edges.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center">
          <span className="text-2xl block mb-2">🏏</span>
          <p className="text-[10px] text-muted-foreground font-display">No PvP matches between friends yet</p>
          <p className="text-[8px] text-muted-foreground/60 mt-1">Challenge friends to see rivalries here!</p>
        </div>
      )}
    </div>
  );
}
