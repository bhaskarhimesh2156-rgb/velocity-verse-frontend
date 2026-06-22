import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "@/lib/gameContext";
import { CHARACTERS } from "@/types";
import { getSocket } from "@/lib/socket";

// ── Constants ──────────────────────────────────────────────────────────────────
const LANE_POSITIONS = [-3.5, 0, 3.5];
const GROUND_TILE_LENGTH = 40;
const GROUND_TILES = 8;
const OBSTACLE_SPAWN_Z = -100;
const OBSTACLE_KILL_Z = 10;
const INITIAL_SPEED = 18;
const MAX_SPEED = 55;
const SPEED_INCREMENT = 0.004;
const JUMP_VELOCITY = 12;
const GRAVITY = 28;
const PLAYER_GROUND_Y = 0.9;

interface ObstacleData {
  id: number;
  lane: number;
  type: "hurdle" | "barrier" | "pillar" | "drone";
  z: number;
}

// ── Detailed Player Character ─────────────────────────────────────────────────
function PlayerMesh({
  laneRef, jumpRef, slideRef, characterId, speedRef,
}: {
  laneRef: React.RefObject<number>;
  jumpRef: React.RefObject<number>;
  slideRef: React.RefObject<boolean>;
  characterId: string;
  speedRef: React.RefObject<number>;
}) {
  const groupRef      = useRef<THREE.Group>(null);
  const leftLegRef    = useRef<THREE.Group>(null);
  const rightLegRef   = useRef<THREE.Group>(null);
  const leftArmRef    = useRef<THREE.Group>(null);
  const rightArmRef   = useRef<THREE.Group>(null);
  const jetpackRef    = useRef<THREE.Mesh>(null);
  const trailRef      = useRef<THREE.Mesh>(null);
  const visorRef      = useRef<THREE.Mesh>(null);

  const targetX      = useRef(0);
  const currentX     = useRef(0);
  const laneVelocity = useRef(0);
  const jumpVelocity = useRef(0);
  const isJumping    = useRef(false);
  const currentY     = useRef(PLAYER_GROUND_Y);
  const animTime     = useRef(0);

  const char = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const primary   = new THREE.Color(char.primaryColor);
  const secondary = new THREE.Color(char.secondaryColor);
  const emissive  = new THREE.Color(char.emissiveColor);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = speedRef.current ?? INITIAL_SPEED;
    animTime.current += delta * speed * 0.18;

    const isSliding = slideRef.current;
    const legSwing = isSliding ? 0 : Math.sin(animTime.current) * 0.55;
    const armSwing = isSliding ? 0 : -Math.sin(animTime.current) * 0.45;
    const bodyBob  = isJumping.current || isSliding ? 0 : Math.abs(Math.sin(animTime.current)) * 0.04;

    if (leftLegRef.current)  leftLegRef.current.rotation.x  =  legSwing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -legSwing;
    if (leftArmRef.current)  leftArmRef.current.rotation.x  =  armSwing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -armSwing;
    if (groupRef.current) groupRef.current.position.y = currentY.current + bodyBob;

    // Lane spring
    targetX.current = LANE_POSITIONS[laneRef.current + 1] ?? 0;
    const distX = targetX.current - currentX.current;
    laneVelocity.current += distX * 42 * delta;
    laneVelocity.current *= 1 - Math.min(1, 13 * delta);
    currentX.current += laneVelocity.current * delta;

    // Jump physics
    if (jumpRef.current > 0 && !isJumping.current) {
      isJumping.current = true;
      jumpVelocity.current = JUMP_VELOCITY;
      jumpRef.current = 0;
    }
    if (isJumping.current) {
      jumpVelocity.current -= GRAVITY * delta;
      currentY.current += jumpVelocity.current * delta;
      if (currentY.current <= PLAYER_GROUND_Y) {
        currentY.current = PLAYER_GROUND_Y;
        isJumping.current = false;
        jumpVelocity.current = 0;
      }
    }

    groupRef.current.position.x = currentX.current;
    groupRef.current.position.y = isSliding ? 0.28 : currentY.current;
    groupRef.current.scale.y    = isSliding ? 0.38 : 1;

    const leanTarget = (targetX.current - currentX.current) * 0.22;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, -leanTarget, 0.18);

    // Jetpack pulse
    if (jetpackRef.current) {
      const mat = jetpackRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.5 + Math.sin(animTime.current * 3) * 0.8;
    }
    // Visor shimmer
    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2.5 + Math.sin(animTime.current * 2) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[0, PLAYER_GROUND_Y, 0]}>
      {/* Torso */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 1.05, 0.52]} />
        <meshStandardMaterial color={primary} emissive={emissive} emissiveIntensity={0.4} metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Chest armor panel */}
      <mesh position={[0, 0.1, 0.27]}>
        <boxGeometry args={[0.45, 0.55, 0.04]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={1.8} transparent opacity={0.9} />
      </mesh>
      {/* Chest side panels */}
      <mesh position={[-0.28, 0.1, 0.22]}>
        <boxGeometry args={[0.1, 0.4, 0.06]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.28, 0.1, 0.22]}>
        <boxGeometry args={[0.1, 0.4, 0.06]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, -0.48, 0]}>
        <boxGeometry args={[0.72, 0.1, 0.54]} />
        <meshStandardMaterial color={secondary} metalness={0.95} roughness={0.05} emissive={emissive} emissiveIntensity={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.84, 0]} castShadow>
        <boxGeometry args={[0.62, 0.55, 0.58]} />
        <meshStandardMaterial color={primary} emissive={emissive} emissiveIntensity={0.35} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* Visor */}
      <mesh ref={visorRef} position={[0, 0.87, 0.3]}>
        <boxGeometry args={[0.44, 0.22, 0.03]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={2.5} transparent opacity={0.95} />
      </mesh>
      {/* Helmet top fin */}
      <mesh position={[0, 1.14, -0.05]}>
        <boxGeometry args={[0.08, 0.18, 0.4]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Side ear pieces */}
      <mesh position={[-0.33, 0.82, 0]}>
        <boxGeometry args={[0.06, 0.32, 0.44]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.33, 0.82, 0]}>
        <boxGeometry args={[0.06, 0.32, 0.44]} />
        <meshStandardMaterial color={secondary} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.19, -0.75, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.29, 0.52, 0.3]} />
          <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Knee pad */}
        <mesh position={[0, 0.05, 0.16]}>
          <boxGeometry args={[0.22, 0.14, 0.04]} />
          <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={1.2} />
        </mesh>
        {/* Shin */}
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[0.24, 0.32, 0.26]} />
          <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.58, 0.04]}>
          <boxGeometry args={[0.3, 0.14, 0.36]} />
          <meshStandardMaterial color={primary} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.19, -0.75, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.29, 0.52, 0.3]} />
          <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.05, 0.16]}>
          <boxGeometry args={[0.22, 0.14, 0.04]} />
          <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0, -0.36, 0]}>
          <boxGeometry args={[0.24, 0.32, 0.26]} />
          <meshStandardMaterial color={secondary} metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.58, 0.04]}>
          <boxGeometry args={[0.3, 0.14, 0.36]} />
          <meshStandardMaterial color={primary} metalness={0.85} roughness={0.15} />
        </mesh>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.52, 0.1, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.7, 0.24]} />
          <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Shoulder pad */}
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.32, 0.16, 0.32]} />
          <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} emissive={emissive} emissiveIntensity={0.3} />
        </mesh>
        {/* Gauntlet */}
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.28]} />
          <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArmRef} position={[0.52, 0.1, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.24, 0.7, 0.24]} />
          <meshStandardMaterial color={secondary} metalness={0.75} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <boxGeometry args={[0.32, 0.16, 0.32]} />
          <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} emissive={emissive} emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.28, 0.22, 0.28]} />
          <meshStandardMaterial color={primary} metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Jetpack */}
      <mesh ref={jetpackRef} position={[0, 0.1, -0.32]}>
        <boxGeometry args={[0.55, 0.7, 0.2]} />
        <meshStandardMaterial color={secondary} emissive={emissive} emissiveIntensity={1.5} metalness={0.95} roughness={0.05} />
      </mesh>
      <mesh position={[-0.16, -0.12, -0.44]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 8]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={4} />
      </mesh>
      <mesh position={[0.16, -0.12, -0.44]}>
        <cylinderGeometry args={[0.08, 0.1, 0.18, 8]} />
        <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={4} />
      </mesh>

      {/* Character glow light */}
      <pointLight color={char.emissiveColor} intensity={4} distance={6} decay={2} position={[0, 0, 0.4]} />
      <pointLight color={char.emissiveColor} intensity={2} distance={3} decay={2} position={[0, -0.5, -0.4]} />
    </group>
  );
}

// ── City Building Generator ───────────────────────────────────────────────────
function CityBuildings({ speedRef }: { speedRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  // Building data: side, x, z, w, h, d, color, windowColor
  const buildings = useRef(
    Array.from({ length: 60 }, (_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const xBase = side * (9 + Math.random() * 14);
      const z = -(i * 12) - Math.random() * 8;
      const w = 3 + Math.random() * 5;
      const h = 8 + Math.random() * 32;
      const d = 3 + Math.random() * 5;
      const palette = [
        { body: "#0a0d1e", win: "#00d4ff" },
        { body: "#0d0a1e", win: "#cc00ff" },
        { body: "#080c15", win: "#ffcc00" },
        { body: "#0a0f1a", win: "#ff4500" },
        { body: "#0c0c1c", win: "#00ff88" },
      ];
      const p = palette[Math.floor(Math.random() * palette.length)];
      return { side, x: xBase, z, w, h, d, bodyColor: p.body, winColor: p.win };
    })
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = speedRef.current ?? INITIAL_SPEED;
    groupRef.current.position.z += speed * delta;

    buildings.current.forEach((b, i) => {
      const child = groupRef.current!.children[i] as THREE.Group;
      if (!child) return;
      const worldZ = b.z + groupRef.current!.position.z;
      if (worldZ > 25) {
        b.z -= 60 * 12;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {buildings.current.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          {/* Main building */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.bodyColor} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Rooftop light */}
          <mesh position={[0, b.h / 2 + 0.3, 0]}>
            <boxGeometry args={[0.3, 0.6, 0.3]} />
            <meshStandardMaterial color={b.winColor} emissive={new THREE.Color(b.winColor)} emissiveIntensity={5} />
          </mesh>
          {/* Neon window strips */}
          {Array.from({ length: Math.floor(b.h / 4) }).map((_, j) => (
            <mesh key={j} position={[0, -b.h / 2 + 2 + j * 3.5, b.d / 2 + 0.01]}>
              <planeGeometry args={[b.w * 0.7, 0.2]} />
              <meshBasicMaterial color={b.winColor} transparent opacity={0.5 + Math.random() * 0.4} />
            </mesh>
          ))}
          {/* Side accent */}
          <mesh position={[b.w / 2 + 0.01, 0, 0]}>
            <planeGeometry args={[b.d, b.h * 0.6]} />
            <meshBasicMaterial color={b.winColor} transparent opacity={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Enhanced Track ─────────────────────────────────────────────────────────────
function Track({ speedRef }: { speedRef: React.RefObject<number> }) {
  const tiles    = useRef<THREE.Group[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = speedRef.current ?? INITIAL_SPEED;
    groupRef.current.position.z += speed * delta;

    tiles.current.forEach((tile) => {
      if (!tile) return;
      const worldZ = tile.position.z + groupRef.current!.position.z;
      if (worldZ > GROUND_TILE_LENGTH * 1.5) {
        tile.position.z -= GROUND_TILES * GROUND_TILE_LENGTH;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: GROUND_TILES }).map((_, i) => (
        <group
          key={i}
          ref={(el) => { if (el) tiles.current[i] = el; }}
          position={[0, 0, -i * GROUND_TILE_LENGTH]}
        >
          {/* Road surface */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14, GROUND_TILE_LENGTH]} />
            <meshStandardMaterial color="#050810" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Road reflective sheen */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
            <planeGeometry args={[14, GROUND_TILE_LENGTH]} />
            <meshStandardMaterial color="#00d4ff" transparent opacity={0.03} metalness={1} roughness={0} />
          </mesh>

          {/* Neon cross-grid lines */}
          {Array.from({ length: 10 }).map((_, j) => (
            <mesh key={`h${j}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -GROUND_TILE_LENGTH / 2 + (j * GROUND_TILE_LENGTH) / 9]}>
              <planeGeometry args={[14, 0.06]} />
              <meshBasicMaterial color="#004466" transparent opacity={0.6} />
            </mesh>
          ))}

          {/* Lane center dashes */}
          {Array.from({ length: 8 }).map((_, j) => (
            <mesh key={`d${j}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, -GROUND_TILE_LENGTH / 2 + 3 + j * 5]}>
              <planeGeometry args={[0.08, 2.5]} />
              <meshBasicMaterial color="#00d4ff" transparent opacity={0.35} />
            </mesh>
          ))}

          {/* Lane dividers — glowing */}
          {[-1.75, 1.75].map((x, j) => (
            <group key={j}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
                <planeGeometry args={[0.1, GROUND_TILE_LENGTH]} />
                <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2.5} transparent opacity={0.7} />
              </mesh>
              {/* Raised divider bumps */}
              {Array.from({ length: 6 }).map((_, k) => (
                <mesh key={k} position={[x, 0.06, -GROUND_TILE_LENGTH / 2 + 3 + k * 6.5]}>
                  <boxGeometry args={[0.12, 0.06, 0.8]} />
                  <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={3} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Outer shoulders */}
          {[-7, 7].map((x, j) => (
            <mesh key={j} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
              <planeGeometry args={[1.5, GROUND_TILE_LENGTH]} />
              <meshStandardMaterial color="#030508" metalness={0.3} roughness={0.9} />
            </mesh>
          ))}

          {/* Side barriers — detailed */}
          {[-6.2, 6.2].map((x, j) => (
            <group key={j}>
              {/* Main wall */}
              <mesh position={[x, 1.1, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.4, 2.2, GROUND_TILE_LENGTH]} />
                <meshStandardMaterial color="#080b14" metalness={0.88} roughness={0.12} />
              </mesh>
              {/* Top neon strip */}
              <mesh position={[x, 2.26, 0]}>
                <boxGeometry args={[0.12, 0.08, GROUND_TILE_LENGTH]} />
                <meshStandardMaterial color="#cc00ff" emissive={new THREE.Color(0xcc00ff)} emissiveIntensity={2.5} />
              </mesh>
              {/* Bottom neon strip */}
              <mesh position={[x, 0.04, 0]}>
                <boxGeometry args={[0.12, 0.05, GROUND_TILE_LENGTH]} />
                <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2} />
              </mesh>
              {/* Panel rivets */}
              {Array.from({ length: 5 }).map((_, k) => (
                <mesh key={k} position={[x + (j === 0 ? 0.22 : -0.22), 1.0, -GROUND_TILE_LENGTH / 2 + 4 + k * 8]}>
                  <boxGeometry args={[0.04, 1.6, 0.04]} />
                  <meshStandardMaterial color={j === 0 ? "#00d4ff" : "#cc00ff"} emissive={new THREE.Color(j === 0 ? 0x00d4ff : 0xcc00ff)} emissiveIntensity={1.5} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Overhead neon arch every segment */}
          <group position={[0, 5.5, -GROUND_TILE_LENGTH / 4]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 14, 8]} />
              <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2} />
            </mesh>
            {/* Left pillar */}
            <mesh position={[-7, -2.75, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 5.5, 8]} />
              <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2} />
            </mesh>
            {/* Right pillar */}
            <mesh position={[7, -2.75, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 5.5, 8]} />
              <meshStandardMaterial color="#00d4ff" emissive={new THREE.Color(0x00d4ff)} emissiveIntensity={2} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Static ambient track light */}
      <pointLight color="#002244" intensity={3} distance={100} decay={1.2} position={[0, 2, -40]} />
    </group>
  );
}

// ── Enhanced Obstacles ─────────────────────────────────────────────────────────
function ObstacleMesh({ obstacle, speedRef }: { obstacle: ObstacleData; speedRef: React.RefObject<number> }) {
  const meshRef  = useRef<THREE.Group>(null);
  const glowRef  = useRef<THREE.Mesh>(null);
  const animTime = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.z += (speedRef.current ?? INITIAL_SPEED) * delta;
    animTime.current += delta;
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 2 + Math.sin(animTime.current * 4) * 0.8;
    }
    if (obstacle.type === "drone") {
      meshRef.current.position.y = 3.5 + Math.sin(animTime.current * 2) * 0.4;
      meshRef.current.rotation.y += delta * 1.2;
    }
  });

  const palette = {
    hurdle:  { color: "#ff3311", emissive: "#ff2200", accent: "#ff6644" },
    barrier: { color: "#ff7700", emissive: "#ff5500", accent: "#ffaa44" },
    pillar:  { color: "#aa00ff", emissive: "#9900ee", accent: "#cc44ff" },
    drone:   { color: "#00ffcc", emissive: "#00eebb", accent: "#88ffee" },
  };
  const col = palette[obstacle.type];

  return (
    <group ref={meshRef} position={[LANE_POSITIONS[obstacle.lane], 0, obstacle.z]}>
      {obstacle.type === "hurdle" && (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2.4, 0.85, 0.5]} />
            <meshStandardMaterial color={col.color} emissive={new THREE.Color(col.emissive)} emissiveIntensity={1.5} metalness={0.7} roughness={0.2} />
          </mesh>
          {/* End posts */}
          {[-1.1, 1.1].map((x, k) => (
            <group key={k}>
              <mesh position={[x, 0.5, 0]} castShadow>
                <boxGeometry args={[0.14, 1.0, 0.14]} />
                <meshStandardMaterial color={col.emissive} emissive={new THREE.Color(col.emissive)} emissiveIntensity={4} />
              </mesh>
              {/* Foot plates */}
              <mesh position={[x, 0.05, 0]}>
                <boxGeometry args={[0.3, 0.1, 0.3]} />
                <meshStandardMaterial color={col.accent} metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          ))}
          <mesh ref={glowRef} position={[0, 0.5, 0]}>
            <boxGeometry args={[2.4, 0.85, 0.5]} />
            <meshStandardMaterial color={col.emissive} emissive={new THREE.Color(col.emissive)} emissiveIntensity={2} transparent opacity={0.15} />
          </mesh>
          <pointLight color={col.emissive} intensity={2.5} distance={5} decay={2} position={[0, 0.7, 0]} />
        </group>
      )}

      {obstacle.type === "barrier" && (
        <group>
          {/* Main wall */}
          <mesh position={[0, 1.75, 0]} castShadow>
            <boxGeometry args={[2.5, 3.5, 0.5]} />
            <meshStandardMaterial color={col.color} emissive={new THREE.Color(col.emissive)} emissiveIntensity={1} metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Danger stripes */}
          {[0.5, 1.5, 2.5].map((y, k) => (
            <mesh key={k} position={[0, y, 0.26]}>
              <planeGeometry args={[2.4, 0.25]} />
              <meshBasicMaterial color={col.accent} transparent opacity={0.7} />
            </mesh>
          ))}
          {/* Top bar */}
          <mesh position={[0, 3.55, 0]}>
            <boxGeometry args={[2.8, 0.14, 0.65]} />
            <meshStandardMaterial color={col.emissive} emissive={new THREE.Color(col.emissive)} emissiveIntensity={4} />
          </mesh>
          <pointLight color={col.emissive} intensity={3} distance={6} decay={2} position={[0, 3, 0]} />
        </group>
      )}

      {obstacle.type === "pillar" && (
        <group>
          {[-1.1, 1.1].map((ox, k) => (
            <group key={k}>
              <mesh position={[ox, 2.0, 0]} castShadow>
                <boxGeometry args={[0.55, 4.0, 0.55]} />
                <meshStandardMaterial color={col.color} emissive={new THREE.Color(col.emissive)} emissiveIntensity={1.5} metalness={0.85} roughness={0.12} />
              </mesh>
              {/* Cap */}
              <mesh position={[ox, 4.08, 0]}>
                <boxGeometry args={[0.75, 0.16, 0.75]} />
                <meshStandardMaterial color={col.emissive} emissive={new THREE.Color(col.emissive)} emissiveIntensity={6} />
              </mesh>
              {/* Energy rings */}
              {[1.0, 2.0, 3.0].map((y, r) => (
                <mesh key={r} position={[ox, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.38, 0.03, 8, 20]} />
                  <meshStandardMaterial color={col.accent} emissive={new THREE.Color(col.emissive)} emissiveIntensity={3} />
                </mesh>
              ))}
            </group>
          ))}
          <mesh ref={glowRef} position={[0, 2, 0]}>
            <boxGeometry args={[2.8, 4.5, 0.2]} />
            <meshBasicMaterial color={col.emissive} transparent opacity={0.06} />
          </mesh>
          <pointLight color={col.emissive} intensity={3.5} distance={7} decay={2} position={[0, 3, 0]} />
        </group>
      )}

      {obstacle.type === "drone" && (
        <group>
          {/* Drone body */}
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.2, 0.7]} />
            <meshStandardMaterial color={col.color} emissive={new THREE.Color(col.emissive)} emissiveIntensity={2} metalness={0.9} roughness={0.05} />
          </mesh>
          {/* Rotors */}
          {[[-0.55, 0, -0.55],[0.55, 0, -0.55],[-0.55, 0, 0.55],[0.55, 0, 0.55]].map((pos, k) => (
            <group key={k} position={pos as [number,number,number]}>
              <mesh rotation={[Math.PI / 2, animTime.current * 15, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.03, 8]} />
                <meshBasicMaterial color={col.accent} transparent opacity={0.6} />
              </mesh>
              {/* Arm */}
              <mesh position={[pos[0] * 0.3, 0, pos[2] * 0.3]}>
                <boxGeometry args={[Math.abs(pos[0]) > 0 ? 0.4 : 0.04, 0.04, Math.abs(pos[2]) > 0 ? 0.4 : 0.04]} />
                <meshStandardMaterial color={col.color} metalness={0.9} roughness={0.1} />
              </mesh>
            </group>
          ))}
          {/* Targeting laser */}
          <mesh position={[0, -0.5, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
          </mesh>
          <pointLight color={col.emissive} intensity={4} distance={5} decay={2} />
        </group>
      )}
    </group>
  );
}

// ── Speed Lines (volumetric) ───────────────────────────────────────────────────
function SpeedLines({ speedRef }: { speedRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const lines = useRef(
    Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 28,
      y: Math.random() * 8,
      z: Math.random() * -130,
      len: Math.random() * 8 + 2,
      opacity: Math.random() * 0.25 + 0.05,
      colorIdx: Math.floor(Math.random() * 3),
    }))
  );
  const colors = ["#00d4ff", "#cc00ff", "#ffffff"];

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = speedRef.current ?? INITIAL_SPEED;
    const children = groupRef.current.children;
    lines.current.forEach((l, i) => {
      l.z += speed * delta * 1.8;
      if (l.z > 14) l.z = -130;
      if (children[i]) children[i].position.z = l.z;
    });
  });

  return (
    <group ref={groupRef}>
      {lines.current.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.03, l.len]} />
          <meshBasicMaterial color={colors[l.colorIdx]} transparent opacity={l.opacity} />
        </mesh>
      ))}
    </group>
  );
}

// ── Ground Fog Plane ──────────────────────────────────────────────────────────
function GroundFog() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -30]}>
      <planeGeometry args={[30, 200]} />
      <meshBasicMaterial color="#000a22" transparent opacity={0.35} />
    </mesh>
  );
}

// ── Floating Particles ─────────────────────────────────────────────────────────
function FloatingParticles({ speedRef }: { speedRef: React.RefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const particles = useRef(
    Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 20,
      y: Math.random() * 5 + 0.2,
      z: Math.random() * -120,
      speed: Math.random() * 0.5 + 0.5,
      size: Math.random() * 0.06 + 0.02,
      colorIdx: Math.floor(Math.random() * 4),
    }))
  );
  const pColors = ["#00d4ff", "#cc00ff", "#ffcc00", "#ff4500"];

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const speed = speedRef.current ?? INITIAL_SPEED;
    const children = groupRef.current.children;
    particles.current.forEach((p, i) => {
      p.z += speed * delta * p.speed * 0.9;
      if (p.z > 12) p.z = -120;
      if (children[i]) {
        children[i].position.z = p.z;
        children[i].position.y = p.y + Math.sin(p.z * 0.05) * 0.3;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {particles.current.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.size, 4, 4]} />
          <meshBasicMaterial color={pColors[p.colorIdx]} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ── Camera Rig with cinematic shake ──────────────────────────────────────────
function CameraRig({ laneRef, shakeRef }: { laneRef: React.RefObject<number>; shakeRef: React.RefObject<number> }) {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3(0, 5.2, 10.5));
  const time = useRef(0);

  useEffect(() => {
    camera.position.set(0, 5.2, 10.5);
    camera.lookAt(0, 1.5, -14);
  }, [camera]);

  useFrame((_, delta) => {
    time.current += delta;
    const targetX = (LANE_POSITIONS[laneRef.current + 1] ?? 0) * 0.14;
    basePos.current.x += (targetX - basePos.current.x) * delta * 7;

    // Subtle camera breathing
    const breathY = Math.sin(time.current * 0.8) * 0.04;

    let sx = 0, sy = 0;
    if (shakeRef.current > 0) {
      sx = (Math.random() - 0.5) * shakeRef.current;
      sy = (Math.random() - 0.5) * shakeRef.current * 0.5;
      shakeRef.current = Math.max(0, shakeRef.current - delta * 5);
    }

    camera.position.x = basePos.current.x + sx;
    camera.position.y = basePos.current.y + breathY + sy;
    camera.lookAt(basePos.current.x * 0.4, 1.5, -14);
  });

  return null;
}

// ── Obstacle Manager ──────────────────────────────────────────────────────────
let obsIdCounter = 0;

function ObstacleManager({
  obstacles, setObsList, speedRef,
}: {
  obstacles: React.RefObject<ObstacleData[]>;
  setObsList: React.Dispatch<React.SetStateAction<ObstacleData[]>>;
  speedRef: React.RefObject<number>;
}) {
  const spawnTimer = useRef(0);
  const TYPES: ObstacleData["type"][] = ["hurdle", "barrier", "pillar", "drone"];

  useFrame((_, delta) => {
    const speed = speedRef.current ?? INITIAL_SPEED;
    spawnTimer.current += delta;
    const toRemove: number[] = [];
    obstacles.current.forEach((obs, i) => {
      obs.z += speed * delta;
      if (obs.z > OBSTACLE_KILL_Z) toRemove.push(i);
    });
    let changed = toRemove.length > 0;
    toRemove.reverse().forEach((i) => obstacles.current.splice(i, 1));

    const spawnInterval = Math.max(0.9, 3.0 - (speed - INITIAL_SPEED) / 12);
    if (spawnTimer.current > spawnInterval) {
      spawnTimer.current = 0;
      const lane = Math.floor(Math.random() * 3);
      const roll = Math.random();
      const type: ObstacleData["type"] =
        roll < 0.38 ? "hurdle" : roll < 0.65 ? "barrier" : roll < 0.85 ? "pillar" : "drone";
      obstacles.current.push({ id: obsIdCounter++, lane, type, z: OBSTACLE_SPAWN_Z });
      changed = true;
    }
    if (changed) setObsList([...obstacles.current]);
  });

  return null;
}

// ── Death Watcher ──────────────────────────────────────────────────────────────
function DeathWatcher({
  laneRef, jumpRef, slideRef, obstacles, onDeath, shakeRef,
}: {
  laneRef: React.RefObject<number>;
  jumpRef: React.RefObject<number>;
  slideRef: React.RefObject<boolean>;
  obstacles: React.RefObject<ObstacleData[]>;
  onDeath: () => void;
  shakeRef: React.RefObject<number>;
}) {
  const dead      = useRef(false);
  const jumpY     = useRef(PLAYER_GROUND_Y);
  const jumpVel   = useRef(0);
  const isJumping = useRef(false);

  useFrame((_, delta) => {
    if (dead.current) return;
    if (jumpRef.current > 0 && !isJumping.current) {
      isJumping.current = true;
      jumpVel.current = JUMP_VELOCITY;
    }
    if (isJumping.current) {
      jumpVel.current -= GRAVITY * delta;
      jumpY.current += jumpVel.current * delta;
      if (jumpY.current <= PLAYER_GROUND_Y) {
        jumpY.current = PLAYER_GROUND_Y;
        isJumping.current = false;
        jumpVel.current = 0;
      }
    }

    const playerLane = laneRef.current + 1;
    const playerY    = jumpY.current;
    const isSliding  = slideRef.current;

    for (const obs of obstacles.current) {
      if (obs.lane !== playerLane) continue;
      if (obs.z > -5.5 && obs.z < -2.8 && shakeRef.current < 0.04) shakeRef.current = 0.04;
      if (obs.z < -2.2 || obs.z > 2.2) continue;

      if (obs.type === "hurdle") {
        if (!isSliding && playerY < 1.5) { dead.current = true; onDeath(); return; }
      } else if (obs.type === "barrier") {
        if (playerY < 3.2) { dead.current = true; onDeath(); return; }
      } else if (obs.type === "pillar") {
        dead.current = true; onDeath(); return;
      } else if (obs.type === "drone") {
        if (playerY > 2.0 && playerY < 5.0) { dead.current = true; onDeath(); return; }
      }
    }
  });

  return null;
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function HUD({
  score, speed, playerName, characterId, phoneConnected,
}: {
  score: number; speed: number; playerName: string; characterId: string; phoneConnected: boolean;
}) {
  const char  = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const level = Math.floor((speed - INITIAL_SPEED) / 5) + 1;
  const speedPct = Math.min(100, ((speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED)) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-3 sm:p-5">
      {/* Top left — score */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col">
        <div className="text-[9px] sm:text-[11px] tracking-[0.3em] uppercase font-mono text-white/30">SCORE</div>
        <div
          className="text-3xl sm:text-5xl font-black tabular-nums"
          style={{ color: char.primaryColor, textShadow: `0 0 30px ${char.primaryColor}88, 0 0 60px ${char.primaryColor}44`, fontFamily: "'Rajdhani',system-ui" }}
        >
          {score.toLocaleString()}
        </div>
        <div className="text-[9px] font-mono text-white/25 tracking-widest mt-0.5">{playerName.toUpperCase()}</div>
      </div>

      {/* Top center — speed bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
        <div className="text-[9px] tracking-[0.3em] uppercase font-mono text-white/30">SPEED</div>
        <div className="flex items-center gap-2">
          <div className="w-28 sm:w-40 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${speedPct}%`,
                background: `linear-gradient(to right, ${char.primaryColor}, #ffcc00)`,
                boxShadow: `0 0 10px ${char.primaryColor}`,
              }}
            />
          </div>
          <div className="text-[9px] sm:text-xs font-mono" style={{ color: "#ffcc00" }}>
            LV{level}
          </div>
        </div>
        <div className="text-[9px] font-mono text-white/15">{Math.round(speed * 3.6)} KM/H</div>
      </div>

      {/* Top right — phone status */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: phoneConnected ? "#4ade80" : "#ff4444",
              boxShadow: phoneConnected ? "0 0 8px #4ade80" : "0 0 8px #ff4444",
            }}
          />
          <span className="text-[9px] sm:text-xs font-mono uppercase text-white/40">
            {phoneConnected ? "PHONE" : "KBD"}
          </span>
        </div>
        <div
          className="text-xs sm:text-sm font-black tracking-wider"
          style={{ color: char.primaryColor, fontFamily: "'Rajdhani',system-ui" }}
        >
          {char.name.toUpperCase()}
        </div>
      </div>

      {/* Bottom — keyboard hint */}
      {!phoneConnected && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <span className="text-[9px] sm:text-[11px] font-mono text-white/20 uppercase tracking-[0.2em]">
            ← → LANES · SPACE JUMP · ↓ SLIDE
          </span>
        </div>
      )}
    </div>
  );
}

// ── Game Scene ─────────────────────────────────────────────────────────────────
function GameScene({
  laneRef, jumpRef, slideRef, speedRef, obstacles, characterId, shakeRef,
}: {
  laneRef: React.RefObject<number>;
  jumpRef: React.RefObject<number>;
  slideRef: React.RefObject<boolean>;
  speedRef: React.RefObject<number>;
  obstacles: React.RefObject<ObstacleData[]>;
  characterId: string;
  shakeRef: React.RefObject<number>;
}) {
  const [obsList, setObsList] = useState<ObstacleData[]>([]);

  return (
    <>
      <CameraRig laneRef={laneRef} shakeRef={shakeRef} />

      {/* Lighting */}
      <ambientLight intensity={0.15} color="#0d1e3d" />
      <directionalLight position={[8, 18, 5]} intensity={0.6} color="#4488ff" castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-far={120} shadow-camera-left={-20} shadow-camera-right={20}
        shadow-camera-top={20} shadow-camera-bottom={-20}
      />
      <pointLight position={[-8, 8, 0]} intensity={1.5} color="#cc00ff" distance={40} decay={2} />
      <pointLight position={[8, 8, 0]} intensity={1.5} color="#00d4ff" distance={40} decay={2} />

      {/* Sky */}
      <Stars radius={180} depth={60} count={2500} factor={4} saturation={0.3} fade speed={0.2} />

      {/* World */}
      <fog attach="fog" args={["#060912", 50, 160]} />
      <color attach="background" args={["#060912"]} />

      <Track speedRef={speedRef} />
      <CityBuildings speedRef={speedRef} />
      <GroundFog />
      <FloatingParticles speedRef={speedRef} />
      <SpeedLines speedRef={speedRef} />

      <PlayerMesh
        laneRef={laneRef}
        jumpRef={jumpRef}
        slideRef={slideRef}
        characterId={characterId}
        speedRef={speedRef}
      />

      {obsList.map((obs) => (
        <ObstacleMesh key={obs.id} obstacle={obs} speedRef={speedRef} />
      ))}
      <ObstacleManager obstacles={obstacles} setObsList={setObsList} speedRef={speedRef} />
    </>
  );
}

// ── Main Game Page ─────────────────────────────────────────────────────────────
export function Game() {
  const { state, setScore, setPhase, setPhoneConnected } = useGame();

  const laneRef         = useRef<number>(0);
  const jumpRef         = useRef<number>(0);
  const slideRef        = useRef<boolean>(false);
  const speedRef        = useRef<number>(INITIAL_SPEED);
  const scoreRef        = useRef<number>(0);
  const obstacles       = useRef<ObstacleData[]>([]);
  const isDead          = useRef(false);
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef        = useRef<number>(0);

  const [displayScore, setDisplayScore]             = useState(0);
  const [displaySpeed, setDisplaySpeed]             = useState(INITIAL_SPEED);
  const [phoneConnectedLocal, setPhoneConnectedLocal] = useState(state.phoneConnected);
  const [isAlive, setIsAlive]                       = useState(true);
  const [shaking, setShaking]                       = useState(false);

  useEffect(() => {
    if (!isAlive) return;
    const interval = setInterval(() => {
      scoreRef.current += Math.floor(speedRef.current / 5);
      setDisplayScore(scoreRef.current);
      setDisplaySpeed(speedRef.current);
      speedRef.current = Math.min(MAX_SPEED, speedRef.current + SPEED_INCREMENT * 60);
    }, 100);
    return () => clearInterval(interval);
  }, [isAlive]);

  const handleAction = useCallback((action: string) => {
    if (isDead.current) return;
    switch (action) {
      case "left":  laneRef.current = Math.max(-1, laneRef.current - 1); break;
      case "right": laneRef.current = Math.min(1,  laneRef.current + 1); break;
      case "jump":  jumpRef.current = 1; break;
      case "slide":
        slideRef.current = true;
        if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current);
        slideTimeoutRef.current = setTimeout(() => { slideRef.current = false; }, 750);
        break;
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("game:join", { sessionId: state.sessionId });
    socket.on("phone:connected",    () => { setPhoneConnectedLocal(true);  setPhoneConnected(true);  });
    socket.on("phone:disconnected", () => { setPhoneConnectedLocal(false); setPhoneConnected(false); });
    socket.on("player:action", ({ action }: { action: string }) => handleAction(action));
    return () => {
      socket.off("phone:connected");
      socket.off("phone:disconnected");
      socket.off("player:action");
    };
  }, [state.sessionId, handleAction, setPhoneConnected]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowLeft":  case "KeyA": handleAction("left");  break;
        case "ArrowRight": case "KeyD": handleAction("right"); break;
        case "Space": case "ArrowUp": case "KeyW": e.preventDefault(); handleAction("jump"); break;
        case "ArrowDown": case "KeyS": handleAction("slide"); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleAction]);

  const handleDeath = useCallback(() => {
    if (isDead.current) return;
    isDead.current = true;
    shakeRef.current = 0.6;
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    setIsAlive(false);
    setScore(scoreRef.current);
    const socket = getSocket();
    socket.emit("game:over", { sessionId: state.sessionId, score: scoreRef.current });
    setTimeout(() => setPhase("gameover"), 2000);
  }, [setScore, setPhase, state.sessionId]);

  return (
    <div className={`relative w-screen h-svh overflow-hidden bg-[#060912] ${shaking ? "animate-shake" : ""}`}>
      <Canvas
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        shadows
        camera={{ position: [0, 5.2, 10.5], fov: 68, near: 0.1, far: 320 }}
      >
        <GameScene
          laneRef={laneRef}
          jumpRef={jumpRef}
          slideRef={slideRef}
          speedRef={speedRef}
          obstacles={obstacles}
          characterId={state.characterId}
          shakeRef={shakeRef}
        />
        <DeathWatcher
          laneRef={laneRef}
          jumpRef={jumpRef}
          slideRef={slideRef}
          obstacles={obstacles}
          onDeath={handleDeath}
          shakeRef={shakeRef}
        />
      </Canvas>

      <HUD
        score={displayScore}
        speed={displaySpeed}
        playerName={state.playerName}
        characterId={state.characterId}
        phoneConnected={phoneConnectedLocal}
      />

      {!isAlive && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(255,60,0,0.5), transparent 65%)",
            animation: "pulse 0.4s ease-out",
          }}
        />
      )}
    </div>
  );
}
