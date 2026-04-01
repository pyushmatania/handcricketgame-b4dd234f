import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 border border-primary/30 flex items-center justify-center glow-primary mb-4"
          >
            <span className="text-4xl">🏏</span>
          </motion.div>
          <h1 className="font-display text-2xl font-black text-foreground tracking-wider">
            HAND CRICKET
          </h1>
          <p className="text-[10px] text-muted-foreground font-display tracking-[0.3em] mt-1">
            {isLogin ? "WELCOME BACK" : "JOIN THE GAME"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-score p-6 space-y-4">
          {!isLogin && (
            <div>
              <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
                DISPLAY NAME
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="Your player name"
              />
            </div>
          )}

          <div>
            <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="player@email.com"
            />
          </div>

          <div>
            <label className="text-[9px] font-display font-bold text-muted-foreground tracking-widest block mb-1.5">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-body placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-out-red font-display"
            >
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-neon-green font-display"
            >
              {success}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3.5 bg-gradient-to-r from-primary via-primary/90 to-out-red/80 text-primary-foreground font-display font-black text-sm rounded-2xl glow-primary tracking-wider disabled:opacity-50 relative overflow-hidden"
          >
            <span className="relative z-10">
              {loading ? "⏳ LOADING..." : isLogin ? "⚡ SIGN IN" : "🚀 CREATE ACCOUNT"}
            </span>
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[8px] text-muted-foreground font-display tracking-widest">OR</span>
            <div className="flex-1 h-px bg-border" />
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
            className="w-full py-3 bg-muted/50 border border-border text-foreground font-display font-bold text-xs rounded-2xl tracking-wider flex items-center justify-center gap-2 hover:bg-muted transition-colors"
          >
            <span className="text-base">🔵</span> SIGN IN WITH GOOGLE
          </motion.button>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
            className="w-full text-center text-[10px] text-muted-foreground font-display tracking-wider pt-2"
          >
            {isLogin ? "Don't have an account? SIGN UP" : "Already have an account? SIGN IN"}
          </button>
        </form>

        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-[10px] text-muted-foreground/50 font-display tracking-wider mt-4"
        >
          ← Back to Home
        </button>
      </motion.div>
    </div>
  );
}
