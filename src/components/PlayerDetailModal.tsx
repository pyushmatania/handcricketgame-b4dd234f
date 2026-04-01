import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { PLAYER_IMAGES, type PlayerInfo } from "./PlayerCard";

interface PlayerDetailModalProps {
  player: PlayerInfo | null;
  onClose: () => void;
}

type Msg = { role: "user" | "assistant"; content: string };

const CELEBRATIONS: Record<string, string[]> = {
  kohli: ["👊", "🔥", "💪", "😤", "⚡"],
  dhoni: ["🫡", "😌", "🧘", "🏆", "🚁"],
  rohit: ["😊", "🎩", "✨", "💫", "🏏"],
  bumrah: ["👆", "🎯", "💨", "🔥", "⚡"],
};

const HIGHLIGHTS: Record<string, { year: string; event: string; icon: string }[]> = {
  kohli: [
    { year: "2023", event: "ICC World Cup Top Scorer", icon: "🏆" },
    { year: "2022", event: "71st Century — Asia Cup", icon: "💯" },
    { year: "2020", event: "ICC Player of the Decade", icon: "⭐" },
    { year: "2018", event: "Fastest to 10,000 ODI runs", icon: "🚀" },
  ],
  dhoni: [
    { year: "2011", event: "World Cup winning six", icon: "🏆" },
    { year: "2013", event: "Champions Trophy win", icon: "🏅" },
    { year: "2007", event: "T20 World Cup captain", icon: "👑" },
    { year: "2020", event: "International retirement", icon: "🫡" },
  ],
  rohit: [
    { year: "2024", event: "T20 World Cup winning captain", icon: "🏆" },
    { year: "2023", event: "ODI World Cup — 597 runs", icon: "🔥" },
    { year: "2014", event: "264 vs SL — highest ODI score", icon: "🌟" },
    { year: "2017", event: "3rd ODI double century", icon: "💯" },
  ],
  bumrah: [
    { year: "2024", event: "BGT series — 32 wickets", icon: "🔥" },
    { year: "2023", event: "#1 ICC Test bowler ranking", icon: "👑" },
    { year: "2019", event: "World Cup — 18 wickets", icon: "🏆" },
    { year: "2018", event: "5-wicket haul in all formats", icon: "⚡" },
  ],
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/player-chat`;

async function streamPlayerChat({
  playerId,
  messages,
  mode,
  onDelta,
  onDone,
  onError,
}: {
  playerId: string;
  messages: Msg[];
  mode: "stats" | "chat";
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ playerId, messages, mode }),
    });

    if (resp.status === 429) { onError("Rate limited — try again shortly."); return; }
    if (resp.status === 402) { onError("AI credits exhausted."); return; }
    if (!resp.ok || !resp.body) { onError("Failed to get AI response."); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* partial */ }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e.message : "Unknown error");
  }
}

export default function PlayerDetailModal({ player, onClose }: PlayerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "chat">("stats");
  const [aiStats, setAiStats] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load AI stats on open
  useEffect(() => {
    if (!player) return;
    setAiStats("");
    setChatMessages([]);
    setActiveTab("stats");
    setAiLoading(true);

    let statsText = "";
    streamPlayerChat({
      playerId: player.id,
      messages: [{ role: "user", content: "Give me this player's latest stats and current form analysis." }],
      mode: "stats",
      onDelta: (chunk) => { statsText += chunk; setAiStats(statsText); },
      onDone: () => setAiLoading(false),
      onError: (err) => { setAiStats(`⚠️ ${err}`); setAiLoading(false); },
    });

    // Celebration animation
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2000);
  }, [player]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || !player || chatLoading) return;
    const userMsg: Msg = { role: "user", content: chatInput.trim() };
    const allMessages = [...chatMessages, userMsg];
    setChatMessages(allMessages);
    setChatInput("");
    setChatLoading(true);

    let assistantText = "";
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantText } : m));
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });
    };

    await streamPlayerChat({
      playerId: player.id,
      messages: allMessages,
      mode: "chat",
      onDelta: updateAssistant,
      onDone: () => setChatLoading(false),
      onError: (err) => {
        setChatMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err}` }]);
        setChatLoading(false);
      },
    });
  };

  if (!player) return null;

  const celebrations = CELEBRATIONS[player.id] || ["🏏"];
  const highlights = HIGHLIGHTS[player.id] || [];
  const img = PLAYER_IMAGES[player.id];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl overflow-y-auto"
      >
        {/* Background effects */}
        <div className="absolute inset-0 stadium-gradient pointer-events-none" />
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.08) 0%, transparent 60%)" }}
        />

        {/* Celebration particles */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {celebrations.map((emoji, i) => (
                <motion.div
                  key={`cel-${i}`}
                  initial={{ y: "50vh", x: `${20 + i * 15}vw`, opacity: 1, scale: 0.5 }}
                  animate={{
                    y: [null, `${10 + Math.random() * 20}vh`],
                    x: [null, `${10 + i * 18}vw`],
                    opacity: [1, 0],
                    scale: [0.5, 1.5],
                    rotate: [0, Math.random() * 360],
                  }}
                  transition={{ duration: 1.5, delay: i * 0.15 }}
                  className="fixed text-3xl pointer-events-none z-[60]"
                >
                  {emoji}
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        <div className="relative z-10 max-w-lg mx-auto px-4 pb-8">
          {/* Close button */}
          <div className="flex items-center justify-between pt-4 mb-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-xl glass-premium flex items-center justify-center text-sm"
            >
              ←
            </motion.button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
              <span className="text-xs">🤖</span>
              <span className="font-display text-[8px] tracking-[0.2em] text-primary font-bold">AI POWERED</span>
            </div>
          </div>

          {/* Player Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-premium rounded-2xl p-4 mb-4 relative overflow-hidden"
          >
            {/* Jersey number bg */}
            <div className="absolute top-0 right-0 opacity-[0.04]">
              <span className="font-display text-[100px] font-black leading-none">{player.number}</span>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              {/* Player image */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="w-28 h-36 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 flex-shrink-0 relative"
              >
                <img src={img} alt={player.name} className="w-full h-full object-cover object-top" />
                {/* Rating badge */}
                <div className={`absolute top-1.5 left-1.5 w-8 h-8 rounded-lg bg-gradient-to-br ${player.accentColor} flex items-center justify-center`}>
                  <span className="font-display text-[10px] font-black text-white">{player.rating}</span>
                </div>
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-[7px] text-primary/60 font-display tracking-[0.3em] font-bold">INDIAN LEGEND</p>
                <h2 className="font-display text-lg font-black text-foreground tracking-wider leading-tight mt-0.5">
                  {player.name.toUpperCase()}
                </h2>
                <p className="text-[9px] text-muted-foreground font-display tracking-widest mt-0.5">{player.role}</p>
                <p className="text-[9px] text-muted-foreground/50 font-display mt-0.5">#{player.number}</p>

                {/* Quick stats */}
                <div className="flex gap-2 mt-3">
                  {player.stats.map((s) => (
                    <div key={s.label} className="flex-1 glass-card rounded-lg p-1.5 text-center">
                      <span className="font-display text-xs font-black text-foreground block leading-none">{s.value}</span>
                      <span className="text-[5px] text-muted-foreground font-display tracking-widest">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom accent */}
            <div className={`h-0.5 w-full bg-gradient-to-r ${player.accentColor} mt-3 rounded-full`} />
          </motion.div>

          {/* Career Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full bg-secondary" />
              <span className="font-display text-[8px] font-bold text-muted-foreground tracking-[0.25em]">CAREER HIGHLIGHTS</span>
            </div>
            <div className="space-y-1.5">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.year}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="glass-card rounded-xl px-3 py-2 flex items-center gap-3"
                >
                  <span className="text-lg">{h.icon}</span>
                  <div className="flex-1">
                    <span className="font-display text-[9px] font-bold text-foreground tracking-wider">{h.event}</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground/50 font-display">{h.year}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tab Switcher */}
          <div className="flex gap-1 mb-3 glass-card rounded-xl p-1">
            {(["stats", "chat"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground"
                }`}
              >
                <span className="text-xs">{tab === "stats" ? "📊" : "💬"}</span>
                {tab === "stats" ? "AI STATS" : "ASK AI"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="glass-premium rounded-2xl p-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🤖</span>
                  <span className="font-display text-[8px] font-bold text-primary tracking-[0.2em]">AI ANALYSIS</span>
                  {aiLoading && (
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </div>
                <div className="prose prose-sm prose-invert max-w-none text-[11px] text-muted-foreground leading-relaxed">
                  <ReactMarkdown>{aiStats || "Loading analysis..."}</ReactMarkdown>
                </div>
              </motion.div>
            )}

            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {/* Chat messages */}
                <div className="glass-premium rounded-2xl p-3 max-h-[300px] overflow-y-auto space-y-2">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-6">
                      <span className="text-2xl block mb-2">💬</span>
                      <p className="text-[10px] text-muted-foreground font-display">
                        Ask anything about {player.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                        {[
                          `Best innings of ${player.name.split(" ")[0]}?`,
                          "Compare with other legends",
                          "What's his weakness?",
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => { setChatInput(q); }}
                            className="text-[8px] font-display px-2.5 py-1.5 rounded-full glass-card text-primary tracking-wider"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20"
                            : "glass-card"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none text-[10px] text-muted-foreground leading-relaxed">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-[10px] text-foreground font-display">{msg.content}</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-1 px-3 py-2">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder={`Ask about ${player.name}...`}
                    className="flex-1 glass-premium rounded-xl px-3 py-2.5 text-[11px] text-foreground font-display placeholder:text-muted-foreground/40 outline-none border border-primary/10 focus:border-primary/30 transition-colors"
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatLoading}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-sm disabled:opacity-30 shadow-[0_0_15px_hsl(217_91%_60%/0.2)]"
                  >
                    ↑
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
