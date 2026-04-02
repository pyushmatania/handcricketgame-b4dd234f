import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BallResult {
  runs: number | string;
  userMove: number | string;
  aiMove: number | string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get all matches with innings_data
  const { data: matches, error: matchErr } = await supabase
    .from("matches")
    .select("user_id, innings_data")
    .not("innings_data", "is", null);

  if (matchErr) {
    return new Response(JSON.stringify({ error: matchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Aggregate per user
  const userStats: Record<string, { sixes: number; fours: number; runs: number }> = {};

  for (const match of matches || []) {
    const uid = match.user_id;
    if (!userStats[uid]) userStats[uid] = { sixes: 0, fours: 0, runs: 0 };

    const balls = match.innings_data as BallResult[] | null;
    if (!Array.isArray(balls)) continue;

    for (const ball of balls) {
      const r = typeof ball.runs === "number" ? ball.runs : parseInt(String(ball.runs), 10);
      if (isNaN(r) || r <= 0) continue; // skip OUT, negative (AI batting)
      userStats[uid].runs += r;
      if (r === 6) userStats[uid].sixes++;
      else if (r === 4) userStats[uid].fours++;
    }
  }

  // Update each user's profile
  let updated = 0;
  const errors: string[] = [];

  for (const [userId, stats] of Object.entries(userStats)) {
    const { error } = await supabase
      .from("profiles")
      .update({
        total_sixes: stats.sixes,
        total_fours: stats.fours,
        total_runs: stats.runs,
      })
      .eq("user_id", userId);

    if (error) {
      errors.push(`${userId}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return new Response(
    JSON.stringify({ updated, total_users: Object.keys(userStats).length, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
