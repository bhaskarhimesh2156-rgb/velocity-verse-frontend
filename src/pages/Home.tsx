import { useGame } from "@/lib/gameContext";
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

// Animated 3D logo city scene
function LogoScene() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const time = useRef(0);

  // Floating runner figure
  const runnerRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    time.current += delta;

    // Drift camera
    state.camera.position.x = Math.sin(time.current * 0.15) * 2;
    state.camera.position.y = 3.5 + Math.sin(time.current * 0.22) * 0.5;
    state.camera.lookAt(0, 1, -8);

    // Animate runner
    if (runnerRef.current) {
      runnerRef.current.position.y = 1.5 + Math.sin(time.current * 1.5) * 0.25;
      runnerRef.current.rotation.y = time.current * 0.35;
    }

    // Pulse trail
    if (trailRef.current) {
      trailRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (0.4 - i * 0.07) * (0.7 + Math.sin(time.current * 3 + i) * 0.3);
      });
    }
  });

  return (
    <>
      <Stars radius={120} depth={50} count={2000} factor={4} saturation={0.5} fade speed={0.3} />
      <ambientLight intensity={0.2} color="#0d1e3d" />
      <pointLight position={[0, 8, 2]} intensity={3} color="#00d4ff" distance={30} decay={2} />
      <pointLight position={[-6, 4, -5]} intensity={2} color="#cc00ff" distance={25} decay={2} />
      <pointLight position={[6, 4, -5]} intensity={2} color="#ff4500" distance={25} decay={2} />
      <fog attach="fog" args={["#060912", 20, 60]} />

      {/* Road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[14, 60]} />
        <meshStandardMaterial color="#050810" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lane lines */}
      {[-1.75, 1.75].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -10]}>
          <planeGeometry args={[0.08, 60]} />
          <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={3} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* Mini city buildings */}
      {[
        { x: -9,  z: -12, h: 14, c: "#00d4ff" },
        { x: -12, z: -20, h: 22, c: "#cc00ff" },
        { x: -7,  z: -28, h: 10, c: "#ffcc00" },
        { x: 9,   z: -12, h: 18, c: "#ff4500" },
        { x: 12,  z: -20, h: 12, c: "#00d4ff" },
        { x: 8,   z: -28, h: 26, c: "#cc00ff" },
        { x: -14, z: -8,  h: 8,  c: "#00ff88" },
        { x: 14,  z: -8,  h: 16, c: "#00d4ff" },
      ].map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[3.5 + Math.random(), b.h, 3.5 + Math.random()]} />
            <meshStandardMaterial color="#080b14" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.3, 0]}>
            <boxGeometry args={[0.25, 0.55, 0.25]} />
            <meshStandardMaterial color={b.c} emissive={new THREE.Color(b.c)} emissiveIntensity={6} />
          </mesh>
          {Array.from({ length: 4 }).map((_, j) => (
            <mesh key={j} position={[0, -b.h / 2 + 2 + j * 3, 1.8]}>
              <planeGeometry args={[2.5, 0.18]} />
              <meshBasicMaterial color={b.c} transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Floating runner */}
      <group ref={runnerRef} position={[0, 1.5, -4]} scale={1.4}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.65, 1.0, 0.48]} />
          <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.4} metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0, 0.1, 0.26]}>
          <boxGeometry args={[0.42, 0.52, 0.04]} />
          <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2.5} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[0.58, 0.52, 0.55]} />
          <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00aaff)} emissiveIntensity={0.35} metalness={0.88} roughness={0.12} />
        </mesh>
        <mesh position={[0, 0.83, 0.29]}>
          <boxGeometry args={[0.42, 0.2, 0.03]} />
          <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={4} />
        </mesh>
        <mesh position={[-0.18, -0.7, 0]}>
          <boxGeometry args={[0.27, 0.5, 0.28]} />
          <meshStandardMaterial color="#0055ff" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0.18, -0.7, 0]}>
          <boxGeometry args={[0.27, 0.5, 0.28]} />
          <meshStandardMaterial color="#0055ff" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[-0.48, 0.1, 0]}>
          <boxGeometry args={[0.22, 0.65, 0.22]} />
          <meshStandardMaterial color="#0055ff" metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0.48, 0.1, 0]}>
          <boxGeometry args={[0.22, 0.65, 0.22]} />
          <meshStandardMaterial color="#0055ff" metalness={0.75} roughness={0.25} />
        </mesh>
        <pointLight color="#00d4ff" intensity={5} distance={5} decay={2} />
      </group>

      {/* Particle trail */}
      <group ref={trailRef} position={[0, 1.5, -4]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[0, -i * 0.15, i * 0.35 + 0.4]}>
            <sphereGeometry args={[0.12 - i * 0.015, 6, 6]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.4 - i * 0.06} />
          </mesh>
        ))}
      </group>

      {/* Ground speed lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}
          position={[(Math.random() - 0.5) * 12, 0.02, -5 - Math.random() * 40]}>
          <planeGeometry args={[0.025, 3 + Math.random() * 5]} />
          <meshBasicMaterial color={i % 3 === 0 ? "#cc00ff" : "#00d4ff"} transparent opacity={0.15 + Math.random() * 0.1} />
        </mesh>
      ))}
    </>
  );
}

export function Home() {
  const { setPhase } = useGame();
  const scanlineRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-[#060912]">
      {/* 3D background scene */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 3.5, 8], fov: 65 }} gl={{ antialias: false, alpha: false }}>
          <LogoScene />
        </Canvas>
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none scan-line opacity-30" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(6,9,18,0.98) 0%, rgba(6,9,18,0.45) 40%, rgba(6,9,18,0.2) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(0,212,255,0.07) 0%, transparent 60%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 animate-slide-in-up">
        <div className="flex flex-col items-center gap-0">
          <div className="text-xs tracking-[0.45em] text-[#00d4ff] uppercase font-mono animate-flicker mb-2">
            — CREATED BY HIMESH —
          </div>
          <h1
            className="text-[clamp(4rem,14vw,9rem)] font-black tracking-tighter neon-blue select-none leading-none"
            style={{ fontFamily: "'Rajdhani','Orbitron',system-ui,sans-serif", letterSpacing: "-0.02em" }}
          >
            VELOCITY
          </h1>
          <h1
            className="text-[clamp(4rem,14vw,9rem)] font-black tracking-tighter neon-purple select-none leading-none -mt-3 sm:-mt-5"
            style={{ fontFamily: "'Rajdhani','Orbitron',system-ui,sans-serif", color: "#cc00ff", letterSpacing: "-0.02em" }}
          >
            VERSE
          </h1>
        </div>

        <p className="text-[#00d4ff77] text-sm sm:text-base tracking-[0.3em] uppercase font-mono text-center px-4">
          Neon Nexus City · Endless Runner
        </p>

        <button
          onClick={() => setPhase("character")}
          className="relative mt-2 sm:mt-4 px-10 sm:px-14 py-3 sm:py-4 text-lg sm:text-xl font-black tracking-widest uppercase overflow-hidden group transition-all duration-300"
          style={{
            background: "transparent",
            border: "2px solid #00d4ff",
            color: "#00d4ff",
            fontFamily: "'Rajdhani',system-ui,sans-serif",
            clipPath: "polygon(14px 0%, 100% 0%, calc(100% - 14px) 100%, 0% 100%)",
            boxShadow: "0 0 20px #00d4ff22, inset 0 0 20px #00d4ff08",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#00d4ff18";
            e.currentTarget.style.boxShadow = "0 0 40px #00d4ff44, inset 0 0 30px #00d4ff18";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.boxShadow = "0 0 20px #00d4ff22, inset 0 0 20px #00d4ff08";
          }}
        >
          ▶ ENTER THE RUN
        </button>

        <div className="flex gap-4 sm:gap-8 mt-2 flex-wrap justify-center">
          {["PHONE MOTION CONTROLS", "4 UNIQUE RUNNERS", "INFINITE NEON CITY"].map((t) => (
            <span key={t} className="text-[10px] tracking-widest text-[#ffffff22] uppercase font-mono">{t}</span>
          ))}
        </div>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff] to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,212,255,0.05), transparent)" }} />
      <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
        <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-white/15">
          ⌨ ARROW KEYS / WASD · SPACE TO JUMP · ↓ SLIDE · 📱 PHONE TILT
        </span>
      </div>
    </div>
  );
}
