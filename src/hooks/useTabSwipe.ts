import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ORDER = ["/shop", "/friends", "/play", "/leaderboard", "/profile"];

const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_Y = 80;

export function useTabSwipe() {
  const location = useLocation();
  const navigate = useNavigate();
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const currentPath = location.pathname === "/" ? "/play" : location.pathname;
  const currentIndex = TAB_ORDER.indexOf(currentPath);
  const isTabPage = currentIndex !== -1;

  const handleSwipe = useCallback(
    (dir: "left" | "right") => {
      if (!isTabPage) return;
      const next = dir === "left" ? currentIndex + 1 : currentIndex - 1;
      if (next < 0 || next >= TAB_ORDER.length) return;
      navigate(TAB_ORDER[next]);
    },
    [currentIndex, isTabPage, navigate]
  );

  useEffect(() => {
    if (!isTabPage) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const elapsed = Date.now() - touchStart.current.t;
      touchStart.current = null;

      if (Math.abs(dy) > SWIPE_MAX_Y) return;
      if (elapsed > 500) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;

      handleSwipe(dx < 0 ? "left" : "right");
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isTabPage, handleSwipe]);
}
