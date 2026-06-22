import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { useEffect, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CrashScene({ primaryColor }: { primaryColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const time = useRef(0);
  const fragments = useRef(
    Array.from({ length: 40 }, () => ({
      pos: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2, (Math.random() - 0.5) * 4),
      vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 5 + 2, (Math.random() - 0.5) * 4),
      rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
      size: Math.random() * 0.2 + 0.05,
      color: Math.random() > 0.5 ? primaryColor : "#ff4500",
    }))
  );

  useFrame((_, delta) => {
    time.current += delta;
    if (!groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      const f = fragments.current[i];
      if (!f) return;
      f.vel.y -= 9.8 * delta;
      f.pos.add(f.vel.clone().multiplyScalar(delta));
      if (f.pos.y < -3) {
        f.pos.set((Math.random() - 0.5) * 4, Math.random() * 2 + 1, (Math.random() - 0.5) * 4);
        f.vel.set((Math.random() - 0.5) * 4, Math.random() * 5 + 2, (Math.random() - 0.5) * 4);
      }
      child.position.copy(f.pos);
      child.rotation.x += f.rot.x * delta * 3;
      child.rotation.y += f.rot.y * delta * 3;
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(time.current * 5 + i) * 1;
    });
  });

  return (
    <>
      <ambientLight intensity={0.2} color="#220000" />
      <pointLight position={[0, 5, 3]} intensity={4} color="#ff4500" distance={20} decay={2} />
      <pointLight position={[-3, 3, 0]} intensity={2} color={primaryColor} distance={15} decay={2} />

      <group ref={groupRef}>
        {fragments.current.map((f, i) => (
          <mesh key={i} position={f.pos}>
            <boxGeometry args={[f.size, f.size, f.size]} />
            <meshStandardMaterial
              color={f.color}
              emissive={new THREE.Color(f.color)}
              emissiveIntensity={2}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        ))}
      </group>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050810" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  );
}

export function GameOver() {
  const { state, setPhase, setSessionId, setPhoneConnected, quickRestart, reset } = useGame();
  const char = CHARACTERS.find((c) => c.id === state.characterId) ?? CHARACTERS[0];
  const isHighScore = state.score > 0 && state.score >= state.highScore;

  useEffect(() => {
    const socket = getSocket();
    const handler = ({ action }: { action: string }) => {
      if (action === "restart") quickRestart();
    };
    socket.on("player:action", handler);
    return () => { socket.off("player:action", handler); };
  }, [quickRestart]);

  const handlePlayAgain = useCallback(() => { quickRestart(); }, [quickRestart]);

  const handleNewSession = () => {
    const socket = getSocket();
    socket.off("phone:connected");
    socket.off("phone:disconnected");
    socket.off("player:action");
    const newSession = crypto.randomUUID();
    setSessionId(newSession);
    setPhoneConnected(false);
    setPhase("qr");
  };

  return (
    <div className="relative w-screen h-svh flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      {/* 3D crash animation */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 2, 8], fov: 60 }} gl={{ antialias: false, alpha: false }}>
          <CrashScene primaryColor={char.primaryColor} />
        </Canvas>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(6,9,18,0.97) 0%, rgba(6,9,18,0.7) 40%, rgba(6,9,18,0.3) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,60,0,0.12) 0%, transparent 65%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 text-center px-4 sm:px-6 animate-slide-in-up w-full max-w-sm sm:max-w-md">
        <div
          className="font-black tracking-tighter"
          style={{
            fontSize: "clamp(2.8rem,12vw,5.5rem)",
            fontFamily: "'Rajdhani',system-ui,sans-serif",
            color: "#ff4500",
            textShadow: "0 0 40px #ff4500, 0 0 80px #ff450055",
          }}
        >
          GAME OVER
        </div>

        <div className="text-white/35 text-xs tracking-[0.25em] uppercase font-mono">
          {state.playerName.toUpperCase()} — {char.name.toUpperCase()}
        </div>

        {isHighScore && (
          <div
            className="px-5 py-2 text-xs sm:text-sm font-black tracking-widest uppercase"
            style={{
              background: `${char.primaryColor}18`,
              border: `1px solid ${char.primaryColor}66`,
              color: char.primaryColor,
              textShadow: `0 0 12px ${char.primaryColor}`,
              boxShadow: `0 0 20px ${char.primaryColor}22`,
              animation: "pulse-glow 2s ease-in-out infinite",
              clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
            }}
          >
            ★ NEW HIGH SCORE ★
          </div>
        )}

        {/* Score display */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] tracking-[0.4em] text-white/30 uppercase font-mono">FINAL SCORE</div>
          <div
            className="font-black tabular-nums"
            style={{
              fontSize: "clamp(3.5rem,18vw,6rem)",
              color: char.primaryColor,
              textShadow: `0 0 30px ${char.primaryColor}88, 0 0 60px ${char.primaryColor}44`,
              fontFamily: "'Rajdhani',system-ui,sans-serif",
            }}
          >
            {state.score.toLocaleString()}
          </div>
          <div
            className="text-lg sm:text-xl font-bold tabular-nums"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'Rajdhani',system-ui" }}
          >
            BEST: {state.highScore.toLocaleString()}
          </div>
        </div>

        <button
          onClick={handlePlayAgain}
          className="w-full py-4 sm:py-5 text-lg sm:text-xl font-black tracking-widest uppercase transition-all duration-200 active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${char.primaryColor}, ${char.secondaryColor})`,
            color: "#000",
            clipPath: "polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)",
            boxShadow: `0 0 40px ${char.primaryColor}55, 0 4px 20px rgba(0,0,0,0.5)`,
            fontFamily: "'Rajdhani',system-ui",
          }}
        >
          ▶ {state.phoneConnected ? "PLAY AGAIN" : "RUN AGAIN"}
        </button>

        {state.phoneConnected && (
          <div className="text-[10px] text-white/22 font-mono -mt-2">
            📱 Phone stays connected — no re-scan needed
          </div>
        )}

        <div className="flex gap-2 sm:gap-3 w-full mt-1">
          {[
            { label: "MENU",          action: () => { reset(); setPhase("home"); },      border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)" },
            { label: "CHANGE RUNNER", action: () => setPhase("character"),               border: `${char.primaryColor}44`, color: `${char.primaryColor}88` },
            { label: "NEW PHONE",     action: handleNewSession,                           border: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" },
          ].map(({ label, action, border, color }) => (
            <button
              key={label}
              onClick={action}
              className="flex-1 py-2.5 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all"
              style={{ border: `1px solid ${border}`, color, fontFamily: "'Rajdhani',system-ui" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
