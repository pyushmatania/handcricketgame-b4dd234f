import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import PageTransition from "@/components/PageTransition";
import SplashScreen from "@/components/SplashScreen";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import ProfilePage from "./pages/ProfilePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import GamePage from "./pages/GamePage";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import FriendsPage from "./pages/FriendsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
      <Route path="/play" element={<PageTransition><PlayPage /></PageTransition>} />
      <Route path="/game/:mode" element={<GamePage />} />
      <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
      <Route path="/leaderboard" element={<PageTransition><LeaderboardPage /></PageTransition>} />
      <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
      <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
      <Route path="/friends" element={<PageTransition><FriendsPage /></PageTransition>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
              <AnimatedRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};


export default App;
