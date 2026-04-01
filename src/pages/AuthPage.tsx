import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName || "Player" },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setSuccess("Check your email to confirm your account!");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Layered background effects */}
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <div
        className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 60% / 0.08) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(168 80% 50% / 0.05) 0%, transparent 60%)" }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.2 }}
            className="relative w-20 h-20 mx-auto mb-5"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-4px] rounded-2xl"
              style={{
                background: "conic-gradient(from 0deg, hsl(217 91% 60% / 0.3), transparent, hsl(168 80% 50% / 0.3), transparent, hsl(217 91% 60% / 0.3))",
              }}
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 flex items-center justify-center backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <span className="text-4xl relative z-10">🏏</span>
            </div>
            {/* Pulse effect */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-[-8px] rounded-2xl border border-primary/20"
            />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-2xl font-black text-foreground tracking-[0.15em]"
          >
            HAND CRICKET
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "60px" }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="h-0.5 bg-gradient-to-r from-primary via-accent to-primary mx-auto mt-2 rounded-full"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[10px] text-muted-foreground font-display tracking-[0.3em] mt-3"
          >
            {isLogin ? "WELCOME BACK, CHAMPION" : "JOIN THE ARENA"}
          </motion.p>
        </div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-premium rounded-2xl p-6 relative overflow-hidden"
        >
          {/* Card accent lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

          {/* Tab Switcher */}
          <div className="flex gap-1 mb-6 glass-card rounded-xl p-1">
            {[
              { key: true, label: "SIGN IN", icon: "⚡" },
              { key: false, label: "SIGN UP", icon: "🚀" },
            ].map((tab) => (
              <button
                key={String(tab.key)}
                type="button"
                onClick={() => { setIsLogin(tab.key); setError(""); setSuccess(""); }}
                className={`flex-1 py-2.5 rounded-lg font-display text-[9px] font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  isLogin === tab.key
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground"
                }`}
              >
                <span className="text-xs">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
                    DISPLAY NAME
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">👤</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-muted/30 border border-border/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:bg-muted/40 transition-all"
                      placeholder="Your player name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
                EMAIL
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-muted/30 border border-border/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:bg-muted/40 transition-all"
                  placeholder="player@email.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
                PASSWORD
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-40">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-muted/30 border border-border/50 rounded-xl pl-9 pr-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:bg-muted/40 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-out-red/10 border border-out-red/20"
                >
                  <span className="text-sm">⚠️</span>
                  <span className="text-[10px] text-out-red font-display">{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-neon-green/10 border border-neon-green/20"
                >
                  <span className="text-sm">✅</span>
                  <span className="text-[10px] text-neon-green font-display">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.95 }}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-black text-sm rounded-2xl tracking-wider disabled:opacity-50 relative overflow-hidden group"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>⏳</motion.span>
                    LOADING...
                  </>
                ) : isLogin ? (
                  <><span>⚡</span> SIGN IN</>
                ) : (
                  <><span>🚀</span> CREATE ACCOUNT</>
                )}
              </span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/50" />
              <span className="text-[8px] text-muted-foreground/50 font-display tracking-widest">OR CONTINUE WITH</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/50" />
            </div>

            {/* Google sign-in */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                setError("");
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) {
                  setError(result.error.message || "Google sign-in failed");
                }
              }}
              className="w-full py-3 glass-card border border-border/30 text-foreground font-display font-bold text-xs rounded-2xl tracking-wider flex items-center justify-center gap-2.5 hover:border-primary/30 transition-all group"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">GOOGLE</span>
            </motion.button>
          </form>
        </motion.div>

        {/* Back to home */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={() => navigate("/")}
          className="w-full text-center text-[10px] text-muted-foreground/40 font-display tracking-wider mt-5 flex items-center justify-center gap-1.5 hover:text-muted-foreground transition-colors"
        >
          <span className="text-xs">←</span> Back to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
