import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { useState } from "react";

export function NameEntry() {
  const { state, setPlayerName, setPhase, setSessionId } = useGame();
  const [name, setName] = useState(state.playerName);
  const char = CHARACTERS.find((c) => c.id === state.characterId) ?? CHARACTERS[0];

  const handleContinue = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayerName(trimmed);
    const sessionId = crypto.randomUUID();
    setSessionId(sessionId);
    setPhase("qr");
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${char.primaryColor}11 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-lg px-6">
        <div className="text-center">
          <div className="text-xs tracking-[0.4em] text-[#00d4ff88] uppercase font-mono mb-2">STEP 2 OF 3</div>
          <h2
            className="text-4xl font-black tracking-tight"
            style={{ color: char.primaryColor, fontFamily: "'Rajdhani', system-ui, sans-serif", textShadow: `0 0 30px ${char.primaryColor}88` }}
          >
            IDENTIFY YOURSELF
          </h2>
          <p className="text-white/40 text-sm mt-2 tracking-widest uppercase font-mono">
            Runner: {char.name}
          </p>
        </div>

        {/* Character preview */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-28 flex items-center justify-center animate-float">
            <div
              className="absolute w-12 h-17 rounded-sm"
              style={{
                background: `linear-gradient(180deg, ${char.primaryColor}, ${char.secondaryColor})`,
                boxShadow: `0 0 30px ${char.emissiveColor}66`,
                height: "68px",
                width: "48px",
              }}
            />
            <div
              className="absolute top-0 w-10 h-8 rounded-sm"
              style={{ background: char.primaryColor, boxShadow: `0 0 20px ${char.emissiveColor}` }}
            />
            <div
              className="absolute top-2 w-7 h-4 rounded-sm"
              style={{ background: char.emissiveColor, boxShadow: `0 0 12px ${char.emissiveColor}` }}
            />
          </div>
        </div>

        {/* Name input */}
        <div className="w-full flex flex-col gap-3">
          <label className="text-xs tracking-[0.3em] uppercase font-mono text-[#00d4ff88]">
            ENTER RUNNER DESIGNATION
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 16))}
            onKeyDown={(e) => e.key === "Enter" && handleContinue()}
            placeholder="YOUR NAME..."
            maxLength={16}
            autoFocus
            className="w-full px-5 py-4 text-xl font-bold tracking-widest text-center transition-all outline-none placeholder:opacity-30"
            style={{
              background: "rgba(0,0,0,0.5)",
              border: `2px solid ${char.primaryColor}66`,
              color: char.primaryColor,
              fontFamily: "'Rajdhani', system-ui, sans-serif",
              caretColor: char.primaryColor,
              boxShadow: `0 0 20px ${char.primaryColor}22`,
              clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = char.primaryColor;
              e.target.style.boxShadow = `0 0 30px ${char.primaryColor}44`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = `${char.primaryColor}66`;
              e.target.style.boxShadow = `0 0 20px ${char.primaryColor}22`;
            }}
          />
          <div className="text-right text-xs font-mono text-white/30">
            {name.length}/16
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => setPhase("character")}
            className="px-8 py-3 text-sm font-bold tracking-widest uppercase border border-white/20 text-white/50 hover:border-white/40 hover:text-white/80 transition-all"
            style={{ fontFamily: "'Rajdhani', system-ui, sans-serif" }}
          >
            BACK
          </button>
          <button
            onClick={handleContinue}
            disabled={!name.trim()}
            className="flex-1 py-4 text-lg font-black tracking-widest uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: name.trim()
                ? `linear-gradient(135deg, ${char.primaryColor}, ${char.secondaryColor})`
                : "rgba(255,255,255,0.1)",
              color: name.trim() ? "#000" : "#fff",
              clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
              boxShadow: name.trim() ? `0 0 30px ${char.primaryColor}44` : "none",
              fontFamily: "'Rajdhani', system-ui, sans-serif",
            }}
          >
            LOCK IN
          </button>
        </div>
      </div>
    </div>
  );
}
