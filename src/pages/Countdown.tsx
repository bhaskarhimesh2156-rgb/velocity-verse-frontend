import { useEffect, useState, useRef } from "react";
import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { getSocket } from "@/lib/socket";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CountdownScene({ color, count }: { color: string; count: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (count === 0 ? 3 : 0.8);
      const s = 1 + Math.sin(time.current * 4) * 0.08;
      ringRef.current.scale.setScalar(s);
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.4;
    }
  });

  const c = new THREE.Color(color);

  return (
    <>
      <ambientLight intensity={0.15} color="#0d1e3d" />
      <pointLight position={[0, 0, 5]} intensity={8} color={color} distance={20} decay={2} />
      <fog attach="fog" args={["#060912", 15, 40]} />
      <color attach="background" args={["#060912"]} />

      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i}
          position={[(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, -5 - Math.random() * 20]}
        >
          <planeGeometry args={[0.03, 3 + Math.random() * 6]} />
          <meshBasicMaterial color={i % 2 === 0 ? color : "#ffffff"} transparent opacity={0.06 + Math.random() * 0.1} />
        </mesh>
      ))}

      <mesh ref={ringRef} position={[0, 0, 0]}>
        <torusGeometry args={[2.5, 0.07, 8, 64]} />
        <meshStandardMaterial color={color} emissive={c} emissiveIntensity={3} />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 0, -0.3]}>
        <torusGeometry args={[3.3, 0.03, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
    </>
  );
}

export function Countdown() {
  const { state, setPhase } = useGame();
  const char = CHARACTERS.find((c) => c.id === state.characterId) ?? CHARACTERS[0];
  const [count, setCount] = useState(3);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("game:restart", { sessionId: state.sessionId });
  }, [state.sessionId]);

  useEffect(() => {
    if (count === 0) {
      const t = setTimeout(() => setPhase("playing"), 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 900);
    return () => clearTimeout(t);
  }, [count, setPhase]);

  return (
    <div className="w-screen h-svh flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 8], fov: 55 }} gl={{ antialias: false, alpha: false }}>
          <CountdownScene color={char.primaryColor} count={count} />
        </Canvas>
      </div>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${char.primaryColor}12 0%, transparent 65%)` }} />

      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 text-center px-6">
        <div className="text-sm sm:text-base tracking-[0.3em] uppercase font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
          GET READY, {state.playerName.toUpperCase()}
        </div>
        <div
          key={count}
          className="font-black leading-none animate-count-down"
          style={{
            fontSize: "clamp(6rem,28vw,14rem)",
            color: count > 0 ? char.primaryColor : "#ffffff",
            textShadow: count > 0
              ? `0 0 60px ${char.primaryColor}, 0 0 120px ${char.primaryColor}66`
              : "0 0 60px #ffffff, 0 0 120px #ffffff55",
            fontFamily: "'Rajdhani',system-ui,sans-serif",
          }}
        >
          {count === 0 ? "GO!" : count}
        </div>
        <div className="text-xs sm:text-sm tracking-[0.25em] uppercase font-mono" style={{ color: `${char.primaryColor}88` }}>
          {char.name} · {state.phoneConnected ? "📱 Phone Connected" : "⌨️ Keyboard Mode"}
        </div>
      </div>
    </div>
  );
}
