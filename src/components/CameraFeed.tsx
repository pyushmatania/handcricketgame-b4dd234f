import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";

type FacingMode = "environment" | "user";

interface CameraFeedProps {
  onVideoReady: (video: HTMLVideoElement) => void;
  stadiumMode: boolean;
}

export interface CameraFeedHandle {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const CameraFeed = forwardRef<CameraFeedHandle, CameraFeedProps>(({ onVideoReady, stadiumMode }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facing, setFacing] = useState<FacingMode>("environment");
  const [cameraLabel, setCameraLabel] = useState<string>("Starting camera…");

  useImperativeHandle(ref, () => ({ videoRef }));

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode: FacingMode) => {
    try {
      stopStream();
      setLoading(true);
      setError(null);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      }

      streamRef.current = stream;

      // Detect actual facing mode
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const actualFacing = settings.facingMode as FacingMode | undefined;

      if (actualFacing === "environment") {
        setFacing("environment");
        setCameraLabel("Using Back Camera");
      } else if (actualFacing === "user") {
        setFacing("user");
        if (mode === "environment") {
          setCameraLabel("Back camera unavailable, switched to front");
        } else {
          setCameraLabel("Using Front Camera");
        }
      } else {
        // Can't determine — assume what was requested
        setFacing(mode);
        setCameraLabel(mode === "environment" ? "Using Back Camera" : "Using Front Camera");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          setLoading(false);
          if (videoRef.current) onVideoReady(videoRef.current);
        };
      }
    } catch (err: any) {
      setLoading(false);
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else {
        setError("Could not access camera. Try a different browser.");
      }
    }
  }, [onVideoReady, stopStream]);

  const toggleCamera = useCallback(() => {
    const next = facing === "environment" ? "user" : "environment";
    startCamera(next);
  }, [facing, startCamera]);

  useEffect(() => {
    startCamera("environment");
    return () => stopStream();
  }, []);

  if (error) {
    return (
      <div className="w-full aspect-[4/3] glass flex flex-col items-center justify-center text-center p-4">
        <span className="text-3xl mb-2">📷</span>
        <p className="text-destructive font-semibold text-sm">{error}</p>
        <button
          onClick={() => startCamera("environment")}
          className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-card/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Starting camera…</p>
          </div>
        </div>
      )}

      {/* Video layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`}
      />

      {/* Stadium Mode overlays */}
      {stadiumMode && (
        <>
          {/* Vignette */}
          <div className="absolute inset-0 vignette pointer-events-none z-[2]" />

          {/* Green color grade */}
          <div className="absolute inset-0 stadium-color-grade pointer-events-none z-[2]" />

          {/* Top floodlight glow left */}
          <div className="absolute -top-4 -left-4 w-32 h-32 rounded-full pointer-events-none z-[2]"
            style={{ background: "radial-gradient(circle, hsl(45 100% 85% / 0.12) 0%, transparent 70%)" }} />

          {/* Top floodlight glow right */}
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full pointer-events-none z-[2]"
            style={{ background: "radial-gradient(circle, hsl(45 100% 85% / 0.12) 0%, transparent 70%)" }} />

          {/* Bottom grass gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-[2]"
            style={{ background: "linear-gradient(to top, hsl(145 50% 20% / 0.35), transparent)" }} />

          {/* Pitch line overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-20 pointer-events-none z-[2] rounded-sm"
            style={{ border: "1px solid hsl(145 30% 40% / 0.15)" }} />

          {/* Crowd silhouette at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-10 crowd-silhouette pointer-events-none z-[3]" />

          {/* Light sweep */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
            <div className="absolute top-0 left-0 w-16 h-full light-sweep"
              style={{ background: "linear-gradient(90deg, transparent, hsl(45 100% 90% / 0.04), transparent)" }} />
          </div>

          {/* Broadcast frame corners */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary/30 pointer-events-none z-[3]" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary/30 pointer-events-none z-[3]" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary/30 pointer-events-none z-[3]" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary/30 pointer-events-none z-[3]" />
        </>
      )}

      {/* Camera status label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-card/70 backdrop-blur-md z-[5]">
        <div className="w-1.5 h-1.5 rounded-full bg-out-red animate-pulse" />
        <span className="text-[9px] font-display font-bold tracking-wider text-foreground/80">LIVE</span>
      </div>

      {/* Camera label bottom-left */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-card/60 backdrop-blur-md text-[9px] text-muted-foreground font-semibold z-[5]">
        {cameraLabel}
      </div>

      {/* Toggle camera button */}
      <button
        onClick={toggleCamera}
        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-card/70 backdrop-blur-md border border-glass flex items-center justify-center z-[5] active:scale-90 transition-transform"
        aria-label="Switch camera"
      >
        <span className="text-sm">🔄</span>
      </button>
    </div>
  );
});

CameraFeed.displayName = "CameraFeed";
export default CameraFeed;
