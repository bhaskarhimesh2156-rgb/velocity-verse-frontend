import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { QRCodeSVG as QRCode } from "qrcode.react";

export function QRConnect() {
  const { state, setPhase, setPhoneConnected } = useGame();
  const char = CHARACTERS.find((c) => c.id === state.characterId) ?? CHARACTERS[0];
  const [phoneReady, setPhoneReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [backendMissing, setBackendMissing] = useState(false);

  // Phone URL = this frontend's origin + /phone?session=...
  // This is correct: the phone opens the same Vercel-deployed frontend
  const phoneUrl = `${window.location.origin}/phone?session=${state.sessionId}`;

  useEffect(() => {
    if (!import.meta.env.VITE_BACKEND_URL) {
      setBackendMissing(true);
    }

    const socket = getSocket();
    socket.emit("game:join", { sessionId: state.sessionId });

    socket.on("phone:connected", () => {
      setPhoneReady(true);
      setPhoneConnected(true);
      setCountdown(3);
    });

    return () => { socket.off("phone:connected"); };
  }, [state.sessionId, setPhoneConnected]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { setPhase("countdown"); return; }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown, setPhase]);

  return (
    <div className="relative w-screen h-svh flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${char.primaryColor}09 0%, transparent 65%)` }}
      />

      <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6 flex flex-col lg:flex-row items-center gap-8 lg:gap-14">

        {/* QR Code side */}
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          <div className="text-center">
            <div className="text-xs tracking-[0.4em] text-[#00d4ff80] uppercase font-mono mb-1">STEP 3 OF 3</div>
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: char.primaryColor, fontFamily: "'Rajdhani', system-ui", textShadow: `0 0 30px ${char.primaryColor}88` }}
            >
              CONNECT YOUR PHONE
            </h2>
          </div>

          {/* Backend missing warning */}
          {backendMissing && (
            <div className="w-full p-3 text-xs font-mono text-center"
              style={{ background: "rgba(255,100,0,0.1)", border: "1px solid rgba(255,100,0,0.3)", color: "#ff8844" }}>
              ⚠️ VITE_BACKEND_URL not set in Vercel env vars.<br />
              Phone control disabled — keyboard still works.
            </div>
          )}

          <div
            className="relative p-3 sm:p-4 transition-all duration-500"
            style={{
              background: phoneReady ? `${char.primaryColor}11` : "rgba(255,255,255,0.04)",
              border: `2px solid ${phoneReady ? char.primaryColor : "rgba(255,255,255,0.12)"}`,
              boxShadow: phoneReady ? `0 0 40px ${char.primaryColor}44` : "none",
            }}
          >
            <QRCode
              value={phoneUrl}
              size={Math.min(200, window.innerWidth * 0.55)}
              bgColor="#060912"
              fgColor={char.primaryColor}
              level="M"
              includeMargin
            />
            {phoneReady && countdown !== null && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "rgba(6,9,18,0.88)" }}
              >
                <div
                  key={countdown}
                  className="text-7xl sm:text-8xl font-black animate-count-down"
                  style={{ color: char.primaryColor, textShadow: `0 0 40px ${char.primaryColor}` }}
                >
                  {countdown === 0 ? "GO!" : countdown}
                </div>
              </div>
            )}
          </div>

          {/* Debug URL for troubleshooting */}
          <div className="text-[9px] font-mono text-white/15 text-center break-all max-w-xs px-2">
            {phoneUrl}
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-500"
              style={{
                background: phoneReady ? char.primaryColor : "rgba(255,255,255,0.2)",
                boxShadow: phoneReady ? `0 0 12px ${char.primaryColor}` : "none",
                animation: !phoneReady ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            />
            <span
              className="text-xs sm:text-sm font-mono tracking-widest uppercase"
              style={{ color: phoneReady ? char.primaryColor : "rgba(255,255,255,0.35)" }}
            >
              {phoneReady ? "PHONE SYNCED — STARTING…" : "WAITING FOR PHONE…"}
            </span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPhase("name")}
              className="text-xs text-white/25 hover:text-white/55 uppercase tracking-widest font-mono transition-colors"
            >
              ← BACK
            </button>
            <button
              onClick={() => setPhase("countdown")}
              className="text-xs text-white/25 hover:text-white/55 uppercase tracking-widest font-mono transition-colors"
            >
              SKIP → KEYBOARD
            </button>
          </div>
        </div>

        {/* Controls guide */}
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <h3
            className="text-lg sm:text-xl font-black tracking-wider uppercase"
            style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Rajdhani', system-ui" }}
          >
            MOTION CONTROLS
          </h3>

          {[
            { icon: "↔", label: "CHANGE LANE", desc: "Tilt phone left or right (±18°)", color: "#00d4ff" },
            { icon: "↓", label: "JUMP",         desc: "Flick phone downward quickly",   color: "#cc00ff" },
            { icon: "🔄", label: "SLIDE",        desc: "Flip phone face-down",           color: "#ffcc00" },
          ].map((ctrl) => (
            <div
              key={ctrl.label}
              className="flex items-center gap-4 p-3 sm:p-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-black flex-shrink-0"
                style={{ background: `${ctrl.color}15`, border: `1px solid ${ctrl.color}44`, color: ctrl.color }}
              >
                {ctrl.icon}
              </div>
              <div>
                <div className="text-sm font-black tracking-widest uppercase" style={{ color: ctrl.color, fontFamily: "'Rajdhani', system-ui" }}>
                  {ctrl.label}
                </div>
                <div className="text-xs text-white/35 mt-0.5">{ctrl.desc}</div>
              </div>
            </div>
          ))}

          <div className="text-xs text-white/25 font-mono leading-relaxed pt-1">
            Or use ← → arrow keys to change lanes, Space to jump, ↓ to slide on keyboard.
          </div>
        </div>
      </div>
    </div>
  );
}
