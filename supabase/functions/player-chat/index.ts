import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAYER_KNOWLEDGE: Record<string, string> = {
  kohli: `You are an expert cricket analyst specializing in Virat Kohli.
Key stats: ODI batting avg 53.4, SR 93.2, 80 centuries (50 ODI, 30 Test), 13,906 ODI runs.
Career highlights: ICC World Cup 2023 top scorer, fastest to 8000/9000/10000 ODI runs, 
71st century in 2022 Asia Cup, ICC ODI Player of the Decade 2020.
Playing style: Aggressive yet technically sound, master of the chase, exceptional against pace.
Signature celebration: Aggressive fist pump and passionate roar toward the crowd.
Jersey #18. Right-hand batsman. Current form: Consistent run-scorer in all formats.`,

  dhoni: `You are an expert cricket analyst specializing in MS Dhoni.
Key stats: ODI batting avg 50.5, SR 87.5, 195 stumpings, 10,773 ODI runs, 16 centuries.
Career highlights: Led India to 2007 T20 WC, 2011 ODI WC (famous six to win final), 
2013 Champions Trophy. Most successful Indian captain ever.
Playing style: Calm finisher, "Captain Cool", helicopter shot specialist, genius wicketkeeper.
Signature celebration: Calm salute or quiet smile, rarely celebrates extravagantly.
Jersey #7. Right-hand batsman, wicketkeeper. Retired from internationals in 2020.`,

  rohit: `You are an expert cricket analyst specializing in Rohit Sharma.
Key stats: ODI batting avg 48.6, SR 89.0, 3 double centuries in ODIs (only player ever),
31 centuries, 10,709 ODI runs. 
Career highlights: 264 vs Sri Lanka (highest individual ODI score), 
3 double centuries, T20I captain, led India to 2024 T20 World Cup win.
Playing style: Elegant stroke-maker, pull shot master, lazy elegance, timing over power.
Signature celebration: Raises bat with a big smile, kisses the helmet.
Jersey #45. Right-hand opening batsman. Current Indian captain across formats.`,

  bumrah: `You are an expert cricket analyst specializing in Jasprit Bumrah.
Key stats: 352+ international wickets, economy 4.6, bowling avg 21.3, 
best bowling 6/19 in Tests. #1 ICC Test bowler ranking multiple times.
Career highlights: Match-winning spells in 2019 WC, BGT 2021, 2024 BGT series,
unplayable yorkers at death, 5-wicket hauls in all 3 formats.
Playing style: Unorthodox action, lethal yorker, deceptive slower ball, skiddy bouncer.
Signature celebration: Points finger and does a subtle skip celebration.
Jersey #93. Right-arm fast bowler. India's pace spearhead.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerId, messages, mode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const playerContext = PLAYER_KNOWLEDGE[playerId] || "You are a cricket expert.";

    let systemPrompt: string;
    if (mode === "stats") {
      systemPrompt = `${playerContext}
Provide the player's latest form summary, key recent stats, and current status in 3-4 short paragraphs.
Use cricket terminology. Be enthusiastic but factual. Format with markdown.`;
    } else {
      systemPrompt = `${playerContext}
Answer questions about this player conversationally. Be knowledgeable, enthusiastic, and concise.
Use cricket stats and anecdotes. Keep responses under 150 words. Format with markdown.`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: "Give me this player's latest stats and current form analysis." }]),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("player-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
