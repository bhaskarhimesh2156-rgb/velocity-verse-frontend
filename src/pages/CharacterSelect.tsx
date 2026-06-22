import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { useState, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// 3D Character Preview inside the card
function CharacterPreview3D({ char, isSelected }: { char: typeof CHARACTERS[0]; isSelected: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const visorRef = useRef<THREE.Mesh>(null);
  const jetRef   = useRef<THREE.Mesh>(null);
  const time     = useRef(0);

  const primary   = new THREE.Color(char.primaryColor);
  const secondary = new THREE.Color(char.secondaryColor);
  const emissive  = new THREE.Color(char.emissiveColor);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    time.current += delta;
    groupRef.current.rotation.y = isSelected
      ? time.current * 0.8
      : Math.sin(time.current * 0.6) * 0.4;
    groupRef.current.position.y = Math.sin(time.current * 1.2) * 0.12;

    if (visorRef.current) {
      (visorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        2.5 + Math.sin(time.current * 3) * 0.6;
    }
    if (jetRef.current) {
      (jetRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(time.current * 4) * 0.8;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.65, 1.0, 0.48]} />
        <meshStandardMaterial color={primary} emissive={emissive} emissiveIntensity={0.4} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* Chest panel */}
      <mesh position={[0, 0.1, 0.26]}>
        <boxGeometry args={[0.42, 0.52, 0.04]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={2} transparent opacity={0.9} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, -0.46, 0]}>
        <boxGeometry args={[0.67, 0.09, 0.5]} />
        <meshStandardMaterial color={secondary} metalness={0.95} roughness={0.05} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.58, 0.52, 0.55]} />
        <meshStandardMaterial color={primary} emissive={emissive} emissiveIntensity={0.35} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* Visor */}
      <mesh ref={visorRef} position={[0, 0.83, 0.29]}>
        <boxGeometry args={[0.42, 0.2, 0.03]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={2.5} transparent opacity={0.95} />
      </mesh>
      {/* Helmet fin */}
      <mesh position={[0, 1.1, -0.04]}>
        <boxGeometry args={[0.08, 0.17, 0.38]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.18, -0.7, 0]} castShadow>
        <boxGeometry args={[0.27, 0.5, 0.28]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.18, -0.55, 0.14]}>
        <boxGeometry args={[0.21, 0.13, 0.04]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={1.2} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.18, -0.7, 0]} castShadow>
        <boxGeometry args={[0.27, 0.5, 0.28]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0.18, -0.55, 0.14]}>
        <boxGeometry args={[0.21, 0.13, 0.04]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={1.2} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.48, 0.1, 0]} castShadow>
        <boxGeometry args={[0.22, 0.65, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[-0.48, 0.35, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.3]} />
        <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.48, 0.1, 0]} castShadow>
        <boxGeometry args={[0.22, 0.65, 0.22]} />
        <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
      </mesh>
      <mesh position={[0.48, 0.35, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.3]} />
        <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>
      {/* Jetpack */}
      <mesh ref={jetRef} position={[0, 0.1, -0.3]}>
        <boxGeometry args={[0.5, 0.65, 0.18]} />
        <meshStandardMaterial color={secondary} emissive={emissive} emissiveIntensity={1.5} metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Jetpack nozzles */}
      <mesh position={[-0.14, -0.1, -0.41]}>
        <cylinderGeometry args={[0.07, 0.09, 0.15, 8]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={4} />
      </mesh>
      <mesh position={[0.14, -0.1, -0.41]}>
        <cylinderGeometry args={[0.07, 0.09, 0.15, 8]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={4} />
      </mesh>

      {/* Character glow */}
      <pointLight color={char.emissiveColor} intensity={isSelected ? 5 : 2.5} distance={5} decay={2} />
    </group>
  );
}

export function CharacterSelect() {
  const { state, setCharacter, setPhase } = useGame();
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = state.characterId;

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 pointer-events-none animate-grid-move"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,212,255,0.07) 0%, transparent 60%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 w-full max-w-6xl px-4">
        <div className="text-center">
          <div className="text-xs tracking-[0.4em] text-[#00d4ff66] uppercase font-mono mb-2">STEP 1 OF 3</div>
          <h2
            className="text-4xl sm:text-5xl font-black tracking-tight neon-blue"
            style={{ fontFamily: "'Rajdhani', system-ui, sans-serif" }}
          >
            CHOOSE YOUR RUNNER
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 w-full">
          {CHARACTERS.map((char) => {
            const isSelected = selected === char.id;
            const isHovered  = hovered === char.id;

            return (
              <button
                key={char.id}
                className="relative flex flex-col items-center gap-3 p-4 sm:p-5 transition-all duration-250 cursor-pointer"
                style={{
                  background: isSelected
                    ? `linear-gradient(160deg, ${char.primaryColor}1a, ${char.primaryColor}08)`
                    : "rgba(255,255,255,0.02)",
                  border: `2px solid ${isSelected ? char.primaryColor : isHovered ? char.primaryColor + "55" : "rgba(255,255,255,0.08)"}`,
                  clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  transform: isSelected ? "scale(1.04)" : isHovered ? "scale(1.02)" : "scale(1)",
                  boxShadow: isSelected ? `0 0 30px ${char.primaryColor}33, 0 0 60px ${char.primaryColor}18, inset 0 0 30px ${char.primaryColor}08` : "none",
                }}
                onClick={() => setCharacter(char.id)}
                onMouseEnter={() => setHovered(char.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* 3D Character canvas */}
                <div className="w-full h-36 sm:h-44">
                  <Canvas
                    camera={{ position: [0, 0.2, 3.2], fov: 42 }}
                    gl={{ antialias: true, alpha: true }}
                    style={{ background: "transparent" }}
                  >
                    <ambientLight intensity={0.4} color="#223366" />
                    <pointLight position={[2, 3, 3]} intensity={1.5} color="#ffffff" />
                    <pointLight position={[-2, 1, 2]} intensity={1} color={char.primaryColor} />
                    <CharacterPreview3D char={char} isSelected={isSelected} />
                  </Canvas>
                </div>

                <div className="text-center w-full">
                  <div
                    className="font-black text-lg sm:text-xl tracking-wider"
                    style={{ color: char.primaryColor, fontFamily: "'Rajdhani', system-ui, sans-serif" }}
                  >
                    {char.name.toUpperCase()}
                  </div>
                  <div className="text-xs text-[#ffffff55] mt-1 leading-snug px-1">{char.description}</div>
                  <div
                    className="text-[10px] sm:text-xs font-bold mt-2 tracking-widest uppercase"
                    style={{ color: char.emissiveColor, textShadow: `0 0 8px ${char.emissiveColor}` }}
                  >
                    ◆ {char.ability}
                  </div>
                </div>

                {isSelected && (
                  <div
                    className="absolute top-2 right-3 text-sm font-black"
                    style={{ color: char.primaryColor, textShadow: `0 0 10px ${char.primaryColor}` }}
                  >
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 sm:gap-4 mt-2">
          <button
            onClick={() => setPhase("home")}
            className="px-6 sm:px-8 py-3 text-sm font-bold tracking-widest uppercase transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'Rajdhani', system-ui, sans-serif",
            }}
          >
            ← BACK
          </button>
          <button
            onClick={() => setPhase("name")}
            className="px-10 sm:px-14 py-3 text-base sm:text-lg font-black tracking-widest uppercase transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #00d4ff, #0055ff)",
              color: "#000",
              clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
              boxShadow: "0 0 24px #00d4ff44",
              fontFamily: "'Rajdhani', system-ui, sans-serif",
            }}
          >
            CONFIRM →
          </button>
        </div>
      </div>
    </div>
  );
}
