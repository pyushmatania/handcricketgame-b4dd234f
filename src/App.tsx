import { useState, useCallback, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useTabSwipe } from "@/hooks/useTabSwipe";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "@/components/SplashScreen";
import MatchInviteNotification from "@/components/MatchInviteNotification";

// Eager-load home (landing page)
import HomePage from "./pages/HomePage";

// Lazy-load heavy pages
const PlayPage = lazy(() => import("./pages/PlayPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const GamePage = lazy(() => import("./pages/GamePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const MatchHistoryPage = lazy(() => import("./pages/MatchHistoryPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const DailyRewardsPage = lazy(() => import("./pages/DailyRewardsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-game-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-game-gold border-t-transparent rounded-full animate-spin" />
          <span className="font-game-display text-[9px] tracking-[0.25em] text-muted-foreground">LOADING</span>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  useTabSwipe();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/play" element={<LazyPage><PageTransition><PlayPage /></PageTransition></LazyPage>} />
        <Route path="/game/:mode" element={<LazyPage><GamePage /></LazyPage>} />
        <Route path="/profile" element={<LazyPage><PageTransition><ProfilePage /></PageTransition></LazyPage>} />
        <Route path="/leaderboard" element={<LazyPage><PageTransition><LeaderboardPage /></PageTransition></LazyPage>} />
        <Route path="/auth" element={<LazyPage><PageTransition><AuthPage /></PageTransition></LazyPage>} />
        <Route path="/settings" element={<LazyPage><PageTransition><SettingsPage /></PageTransition></LazyPage>} />
        <Route path="/friends" element={<LazyPage><PageTransition><FriendsPage /></PageTransition></LazyPage>} />
        <Route path="/history" element={<LazyPage><PageTransition><MatchHistoryPage /></PageTransition></LazyPage>} />
        <Route path="/notifications" element={<LazyPage><PageTransition><NotificationsPage /></PageTransition></LazyPage>} />
        <Route path="/shop" element={<LazyPage><PageTransition><ShopPage /></PageTransition></LazyPage>} />
        <Route path="/daily-rewards" element={<LazyPage><PageTransition><DailyRewardsPage /></PageTransition></LazyPage>} />
        <Route path="*" element={<LazyPage><PageTransition><NotFound /></PageTransition></LazyPage>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
            <BrowserRouter>
              <MatchInviteNotification />
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
