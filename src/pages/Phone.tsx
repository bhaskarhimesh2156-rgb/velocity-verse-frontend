import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";

type PhoneState = "connecting" | "waiting" | "ready" | "playing" | "gameover";

// Controls
const TILT_THRESHOLD = 10; // degrees gamma to trigger a lane change
const TILT_DEADZONE = 4; // degrees — must return inside here before next tilt fires

const FLIP_THRESHOLD = 160; // degrees beta for face-down slide

export function Phone() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session") ?? "";
  const [state, setState] = useState<PhoneState>("connecting");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastAction, setLastAction] = useState<{
    text: string;
    color: string;
  } | null>(null);
  const [score, setScore] = useState(0);
  const isSliding = useRef(false);
  const slideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionCleanup = useRef<(() => void) | null>(null);

  const flash = useCallback((text: string, color: string) => {
    setLastAction({ text, color });
    setTimeout(() => setLastAction(null), 500);
  }, []);

  const vibrate = useCallback((pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
  }, []);

  const sendAction = useCallback(
    (action: string) => {
      const socket = getSocket();
      socket.emit("phone:action", { sessionId, action });
      const map: Record<string, { text: string; color: string; buzz: number | number[] }> = {
        left:  { text: "◀ LEFT",  color: "#00d4ff", buzz: 25 },
        right: { text: "RIGHT ▶", color: "#00d4ff", buzz: 25 },
        jump:  { text: "▲ JUMP",  color: "#cc00ff", buzz: 55 },
        slide: { text: "▼ SLIDE", color: "#ffcc00", buzz: [35, 15, 35] },
      };
      if (map[action]) {
        flash(map[action].text, map[action].color);
        vibrate(map[action].buzz);
      }
    },
    [sessionId, flash, vibrate],
  );

  const startMotion = useCallback(() => {
    let jumpCooldown = false;
    let hasTilted = false; // latch: fires once per tilt gesture, resets on neutral

    // ── Tilt → lane change (latch: one tilt = one step) ──────────────────────
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;

      // Slide: flip phone face-down
      const faceDown = Math.abs(beta) > FLIP_THRESHOLD;
      if (faceDown && !isSliding.current) {
        isSliding.current = true;
        sendAction("slide");
        if (slideTimeout.current) clearTimeout(slideTimeout.current);
        slideTimeout.current = setTimeout(() => {
          isSliding.current = false;
        }, 900);
      } else if (!faceDown && Math.abs(beta) < 90) {
        isSliding.current = false;
      }

      // Lane: tilt past threshold fires once, then waits for neutral before re-arming
      if (gamma > TILT_THRESHOLD && !hasTilted) {
        hasTilted = true;
        sendAction("right");
      } else if (gamma < -TILT_THRESHOLD && !hasTilted) {
        hasTilted = true;
        sendAction("left");
      } else if (Math.abs(gamma) < TILT_DEADZONE) {
        hasTilted = false; // back in dead zone → re-arm
      }
    };

    // ── Motion → Jump (very sensitive) ───────────────────────────
    const handleMotion = (e: DeviceMotionEvent) => {
      if (jumpCooldown) return;

      const a = e.acceleration ?? e.accelerationIncludingGravity;
      if (!a) return;

      const x = a.x ?? 0;
      const y = a.y ?? 0;
      const z = a.z ?? 0;

      // Calculate overall movement strength
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Trigger jump even on gentle flicks
      if (magnitude > 5) {
        jumpCooldown = true;

        sendAction("jump");

        setTimeout(() => {
          jumpCooldown = false;
        }, 500);
      }
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    window.addEventListener("devicemotion", handleMotion, true);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("devicemotion", handleMotion, true);
    };
  }, [sendAction]);

  const requestPermission = async () => {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const perm = await (DeviceOrientationEvent as any).requestPermission();
        if (perm !== "granted") return;
      } catch {
        /* allow anyway */
      }
    }
    setPermissionGranted(true);
  };

  useEffect(() => {
    if (!sessionId) {
      setState("connecting");
      return;
    }

    const socket = getSocket();
    socket.emit("phone:join", { sessionId });
    setState("waiting");

    socket.on("phone:ready", () => setState("ready"));
    socket.on("game:restart", () => setState("playing"));
    socket.on("game:over", ({ score: s }: { score: number }) => {
      setState("gameover");
      setScore(s);
    });
    socket.on("game:disconnected", () => setState("waiting"));

    return () => {
      socket.off("phone:ready");
      socket.off("game:restart");
      socket.off("game:over");
      socket.off("game:disconnected");
    };
  }, [sessionId]);

  useEffect(() => {
    if (state === "ready" && permissionGranted) setState("playing");
  }, [state, permissionGranted]);

  useEffect(() => {
    if (state === "playing") {
      if (motionCleanup.current) motionCleanup.current();
      motionCleanup.current = startMotion();
    }
    return () => {
      if (state !== "playing" && motionCleanup.current) {
        motionCleanup.current();
        motionCleanup.current = null;
      }
    };
  }, [state, startMotion]);

  if (!sessionId) {
    return (
      <div className="min-h-svh bg-[#060912] flex items-center justify-center text-white p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl">⚠️</div>
          <div
            className="text-xl font-bold"
            style={{ fontFamily: "'Rajdhani', system-ui" }}
          >
            No session found
          </div>
          <div className="text-white/50 text-sm mt-1">
            Scan the QR code from the game screen
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-svh w-full flex flex-col select-none overflow-hidden"
      style={
        {
          background: "#060912",
          touchAction: "none",
          WebkitUserSelect: "none",
        } as React.CSSProperties
      }
    >
      {/* Waiting */}
      {state === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
          <div
            className="w-16 h-16 rounded-full border-4 animate-spin"
            style={{ borderColor: "#00d4ff33", borderTopColor: "#00d4ff" }}
          />
          <div
            className="text-white/70 text-lg font-bold tracking-widest uppercase"
            style={{ fontFamily: "'Rajdhani', system-ui" }}
          >
            SYNCING WITH GAME…
          </div>
          <div className="text-white/30 text-xs font-mono">
            Session: {sessionId.slice(0, 8)}…
          </div>
        </div>
      )}

      {/* Permission request */}
      {state === "ready" && !permissionGranted && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 text-center">
          <div className="text-6xl">📱</div>
          <div
            className="text-3xl font-black tracking-widest uppercase"
            style={{
              color: "#00d4ff",
              fontFamily: "'Rajdhani', system-ui",
              textShadow: "0 0 20px #00d4ff",
            }}
          >
            CONNECTED!
          </div>
          <div className="text-white/60 text-sm leading-relaxed max-w-xs">
            Allow motion sensor access to control the game
          </div>
          <button
            onClick={requestPermission}
            className="w-full max-w-xs py-5 text-xl font-black tracking-widest uppercase active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #0055ff)",
              color: "#000",
              clipPath:
                "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              boxShadow: "0 0 40px #00d4ff44",
              fontFamily: "'Rajdhani', system-ui",
            }}
          >
            ENABLE CONTROLS
          </button>
        </div>
      )}

      {/* Playing */}
      {state === "playing" && (
        <div className="flex-1 flex flex-col items-stretch p-5 gap-4">
          {/* Live indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"
                style={{ boxShadow: "0 0 8px #4ade80" }}
              />
              <span className="text-green-400 text-xs font-mono tracking-widest uppercase">
                LIVE
              </span>
            </div>
            <span className="text-white/20 text-xs font-mono">
              {sessionId.slice(0, 6)}…
            </span>
          </div>

          {/* Action flash */}
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "3rem" }}
          >
            {lastAction && (
              <div
                key={lastAction.text + Date.now()}
                className="text-2xl font-black tracking-widest uppercase"
                style={{
                  color: lastAction.color,
                  textShadow: `0 0 20px ${lastAction.color}`,
                  fontFamily: "'Rajdhani', system-ui",
                }}
              >
                {lastAction.text}
              </div>
            )}
          </div>

          {/* Big control areas */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            {/* LEFT */}
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg active:scale-95 transition-transform"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "2px solid rgba(0,212,255,0.2)",
                minHeight: "120px",
              }}
              onTouchStart={() => sendAction("left")}
            >
              <span className="text-4xl text-[#00d4ff]">◀</span>
              <span className="text-xs font-mono text-[#00d4ff80] uppercase tracking-widest">
                Left Lane
              </span>
            </button>
            {/* RIGHT */}
            <button
              className="flex flex-col items-center justify-center gap-2 rounded-lg active:scale-95 transition-transform"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "2px solid rgba(0,212,255,0.2)",
                minHeight: "120px",
              }}
              onTouchStart={() => sendAction("right")}
            >
              <span className="text-4xl text-[#00d4ff]">▶</span>
              <span className="text-xs font-mono text-[#00d4ff80] uppercase tracking-widest">
                Right Lane
              </span>
            </button>
          </div>

          {/* JUMP */}
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-lg active:scale-95 transition-transform"
            style={{
              background: "rgba(204,0,255,0.08)",
              border: "2px solid rgba(204,0,255,0.25)",
              minHeight: "100px",
            }}
            onTouchStart={() => sendAction("jump")}
          >
            <span className="text-4xl" style={{ color: "#cc00ff" }}>
              ▲
            </span>
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "rgba(204,0,255,0.6)" }}
            >
              JUMP — or flick phone down
            </span>
          </button>

          {/* SLIDE */}
          <button
            className="flex flex-col items-center justify-center gap-2 rounded-lg active:scale-95 transition-transform"
            style={{
              background: "rgba(255,204,0,0.08)",
              border: "2px solid rgba(255,204,0,0.25)",
              minHeight: "80px",
            }}
            onTouchStart={() => sendAction("slide")}
          >
            <span className="text-4xl" style={{ color: "#ffcc00" }}>
              ▼
            </span>
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "rgba(255,204,0,0.6)" }}
            >
              SLIDE — or flip phone face-down
            </span>
          </button>

          <div className="text-center text-white/20 text-xs font-mono py-1">
            Motion controls active • Tilt to change lanes
          </div>
        </div>
      )}

      {/* Game Over */}
      {state === "gameover" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div
            className="text-5xl font-black tracking-tighter"
            style={{ color: "#ff4500", textShadow: "0 0 30px #ff4500", fontFamily: "'Rajdhani', system-ui" }}
          >
            GAME OVER
          </div>
          <div className="text-white/50 text-sm font-mono">SCORE</div>
          <div
            className="text-7xl font-black"
            style={{ color: "#00d4ff", fontFamily: "'Rajdhani', system-ui", textShadow: "0 0 20px #00d4ff" }}
          >
            {score.toLocaleString()}
          </div>

          {/* Play Again — triggers quickRestart on the desktop game */}
          <button
            className="w-full max-w-xs py-5 text-2xl font-black tracking-widest uppercase active:scale-95 transition-transform mt-4"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #0055ff)",
              color: "#000",
              clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
              boxShadow: "0 0 40px #00d4ff55",
              fontFamily: "'Rajdhani', system-ui",
            }}
            onTouchStart={() => {
              const socket = getSocket();
              socket.emit("phone:action", { sessionId, action: "restart" });
              setState("playing");
            }}
            onClick={() => {
              const socket = getSocket();
              socket.emit("phone:action", { sessionId, action: "restart" });
              setState("playing");
            }}
          >
            ▶ PLAY AGAIN
          </button>

          <div className="text-white/20 text-xs font-mono">
            or tap Play Again on the game screen
          </div>
        </div>
      )}
    </div>
  );
}
