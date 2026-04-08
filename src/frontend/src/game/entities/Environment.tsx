import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// ─── Scene Lighting ───────────────────────────────────────────────────────────

export function SceneLighting() {
  const redRef1 = useRef<THREE.PointLight>(null);
  const redRef2 = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 4;
    if (redRef1.current)
      redRef1.current.intensity = 2.5 + Math.sin(t.current * 1.2) * 1.0;
    if (redRef2.current)
      redRef2.current.intensity = 2.0 + Math.sin(t.current * 0.9 + 1.5) * 0.8;
  });

  return (
    <>
      {/* Bright ambient so scene is always visible */}
      <ambientLight intensity={1.2} color="#aaccbb" />
      <ambientLight intensity={0.6} color="#223a2a" />

      {/* Main overhead directional light */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.8}
        color="#cceecc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={80}
        shadow-camera-near={0.1}
      />
      <directionalLight
        position={[-8, 18, -8]}
        intensity={1.2}
        color="#aaddbb"
      />

      {/* Teal neon fill — the industrial lab feel */}
      <pointLight
        position={[0, 6, 0]}
        color="#00ffcc"
        intensity={2.5}
        distance={35}
      />

      {/* Corner hazard lights — red warning */}
      <pointLight
        ref={redRef1}
        position={[-20, 4, -20]}
        color="#ff1111"
        intensity={2.5}
        distance={22}
      />
      <pointLight
        ref={redRef2}
        position={[20, 4, -20]}
        color="#ff1111"
        intensity={2.5}
        distance={22}
      />
      <pointLight
        position={[-20, 4, 18]}
        color="#ff4400"
        intensity={1.5}
        distance={18}
      />
      <pointLight
        position={[20, 4, 18]}
        color="#ff4400"
        intensity={1.5}
        distance={18}
      />

      {/* DZ Logo neon glow */}
      <pointLight
        position={[0, 10, -22]}
        color="#00ff88"
        intensity={6}
        distance={40}
      />

      {/* Light fog — cinematic dark edges */}
      <fog attach="fog" args={["#020d06", 28, 90]} />
    </>
  );
}

// ─── Ground (dark metallic with teal neon grid) ───────────────────────────────

export function Ground() {
  const { gridTexture, emissiveTexture } = useMemo(() => {
    const W = 512;
    const H = 512;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const t = new THREE.CanvasTexture(canvas);
      return { gridTexture: t, emissiveTexture: t };
    }

    // Dark metallic base
    ctx.fillStyle = "#0a0f0c";
    ctx.fillRect(0, 0, W, H);

    // Subtle metal texture noise
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const s = 1 + Math.random() * 2;
      const v = Math.floor(15 + Math.random() * 18).toString(16);
      ctx.fillStyle = `#${v}${v}${v}`;
      ctx.fillRect(x, y, s, s);
    }

    // Neon teal grid lines
    const GRID_SIZE = 64; // pixels = 64/512 * worldSize
    ctx.strokeStyle = "rgba(0,220,180,0.55)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 4;
    for (let x = 0; x <= W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Glowing intersections
    ctx.shadowBlur = 8;
    for (let x = 0; x <= W; x += GRID_SIZE) {
      for (let y = 0; y <= H; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,200,0.8)";
        ctx.fill();
      }
    }

    const gridTexture = new THREE.CanvasTexture(canvas);
    gridTexture.needsUpdate = true;
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(6, 6);

    // Emissive — just the neon grid glow
    const eCanvas = document.createElement("canvas");
    eCanvas.width = W;
    eCanvas.height = H;
    const ectx = eCanvas.getContext("2d");
    if (!ectx) {
      return { gridTexture, emissiveTexture: new THREE.CanvasTexture(eCanvas) };
    }
    ectx.fillStyle = "#000000";
    ectx.fillRect(0, 0, W, H);
    ectx.strokeStyle = "#00ffcc";
    ectx.lineWidth = 2;
    ectx.shadowColor = "#00ffcc";
    ectx.shadowBlur = 10;
    for (let x = 0; x <= W; x += GRID_SIZE) {
      ectx.beginPath();
      ectx.moveTo(x, 0);
      ectx.lineTo(x, H);
      ectx.stroke();
    }
    for (let y = 0; y <= H; y += GRID_SIZE) {
      ectx.beginPath();
      ectx.moveTo(0, y);
      ectx.lineTo(W, y);
      ectx.stroke();
    }
    const emissiveTexture = new THREE.CanvasTexture(eCanvas);
    emissiveTexture.needsUpdate = true;
    emissiveTexture.wrapS = THREE.RepeatWrapping;
    emissiveTexture.wrapT = THREE.RepeatWrapping;
    emissiveTexture.repeat.set(6, 6);

    return { gridTexture, emissiveTexture };
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial
        map={gridTexture}
        emissiveMap={emissiveTexture}
        color="#0a0f0c"
        emissive="#00ffcc"
        emissiveIntensity={0.18}
        roughness={0.85}
        metalness={0.3}
      />
    </mesh>
  );
}

// ─── Industrial Walls (arena perimeter) ──────────────────────────────────────

export function IndustrialWalls() {
  const ARENA = 24;
  const WALL_H = 6;
  const WALL_T = 1.2;

  const hazardRef1 = useRef<THREE.PointLight>(null);
  const hazardRef2 = useRef<THREE.PointLight>(null);
  const hazardRef3 = useRef<THREE.PointLight>(null);
  const hazardRef4 = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 3;
    const pulse = 0.5 + Math.abs(Math.sin(t.current)) * 1.5;
    if (hazardRef1.current) hazardRef1.current.intensity = pulse;
    if (hazardRef2.current) hazardRef2.current.intensity = pulse;
    if (hazardRef3.current) hazardRef3.current.intensity = pulse;
    if (hazardRef4.current) hazardRef4.current.intensity = pulse;
  });

  const wallMat = (
    <meshStandardMaterial
      color="#0d1810"
      roughness={0.9}
      metalness={0.5}
      emissive="#001a0a"
      emissiveIntensity={0.3}
    />
  );

  const pipeMat = (
    <meshStandardMaterial color="#1a2a20" roughness={0.7} metalness={0.8} />
  );

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, WALL_H / 2, -ARENA]} castShadow receiveShadow>
        <boxGeometry args={[ARENA * 2 + WALL_T * 2, WALL_H, WALL_T]} />
        {wallMat}
      </mesh>
      {/* Front wall */}
      <mesh position={[0, WALL_H / 2, ARENA]} castShadow receiveShadow>
        <boxGeometry args={[ARENA * 2 + WALL_T * 2, WALL_H, WALL_T]} />
        {wallMat}
      </mesh>
      {/* Left wall */}
      <mesh position={[-ARENA, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, ARENA * 2]} />
        {wallMat}
      </mesh>
      {/* Right wall */}
      <mesh position={[ARENA, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_T, WALL_H, ARENA * 2]} />
        {wallMat}
      </mesh>

      {/* Horizontal pipes along walls */}
      <mesh position={[0, 4.5, -ARENA + 0.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, ARENA * 2, 8]} />
        {pipeMat}
      </mesh>

      {/* Teal neon strip on back wall */}
      <mesh position={[0, 4, -ARENA + 0.7]}>
        <boxGeometry args={[ARENA * 1.8, 0.15, 0.08]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={4}
        />
      </mesh>

      {/* Corner hazard lights (flashing red) */}
      <HazardLight
        position={[-ARENA + 1, 4, -ARENA + 1]}
        lightRef={hazardRef1}
      />
      <HazardLight
        position={[ARENA - 1, 4, -ARENA + 1]}
        lightRef={hazardRef2}
      />
      <HazardLight
        position={[-ARENA + 1, 4, ARENA - 1]}
        lightRef={hazardRef3}
      />
      <HazardLight position={[ARENA - 1, 4, ARENA - 1]} lightRef={hazardRef4} />
    </group>
  );
}

function HazardLight({
  position,
  lightRef,
}: {
  position: [number, number, number];
  lightRef: React.RefObject<THREE.PointLight | null>;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial
          color="#ff1100"
          emissive="#ff1100"
          emissiveIntensity={3}
        />
      </mesh>
      <pointLight ref={lightRef} color="#ff1100" intensity={1} distance={12} />
    </group>
  );
}

// ─── Industrial Debris (crates, barrels, pipes) ───────────────────────────────

export function IndustrialDebris() {
  const items = useMemo(() => {
    const positions: Array<{
      pos: [number, number, number];
      type: "crate" | "barrel" | "pipe";
      rot: number;
      scale: number;
    }> = [
      { pos: [-8, 0.5, -8], type: "crate", rot: 0.3, scale: 1 },
      { pos: [7, 0.5, -10], type: "crate", rot: -0.5, scale: 0.8 },
      { pos: [-12, 0.5, 5], type: "barrel", rot: 0.1, scale: 1 },
      { pos: [10, 0.5, 4], type: "barrel", rot: 0.8, scale: 0.9 },
      { pos: [-5, 0.5, -14], type: "crate", rot: 1.1, scale: 1.2 },
      { pos: [14, 0.5, -7], type: "barrel", rot: -0.2, scale: 1 },
      { pos: [-14, 0.5, -5], type: "crate", rot: 0.6, scale: 0.7 },
      { pos: [5, 0.5, 13], type: "barrel", rot: 1.4, scale: 1 },
      { pos: [-10, 0.15, 10], type: "pipe", rot: 0.2, scale: 1 },
      { pos: [12, 0.15, 9], type: "pipe", rot: -0.4, scale: 1 },
      { pos: [0, 0.15, -17], type: "pipe", rot: 0.9, scale: 1.2 },
    ];
    return positions;
  }, []);

  return (
    <group>
      {items.map((item, i) => {
        const key = `debris-${i}`;
        if (item.type === "crate") {
          return (
            <mesh
              key={key}
              position={item.pos}
              rotation={[0, item.rot, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[1 * item.scale, 1 * item.scale, 1 * item.scale]}
              />
              <meshStandardMaterial
                color="#1a2a1a"
                roughness={0.9}
                metalness={0.4}
                emissive="#002200"
                emissiveIntensity={0.2}
              />
            </mesh>
          );
        }
        if (item.type === "barrel") {
          return (
            <mesh
              key={key}
              position={item.pos}
              rotation={[0, item.rot, 0]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  0.35 * item.scale,
                  0.38 * item.scale,
                  0.9 * item.scale,
                  10,
                ]}
              />
              <meshStandardMaterial
                color="#2a1a0a"
                roughness={0.7}
                metalness={0.6}
                emissive="#110800"
                emissiveIntensity={0.2}
              />
            </mesh>
          );
        }
        // pipe
        return (
          <mesh
            key={key}
            position={item.pos}
            rotation={[0, item.rot, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.15, 0.15, 3.5 * item.scale, 6]} />
            <meshStandardMaterial
              color="#1a2820"
              roughness={0.6}
              metalness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Neon "डिजिटल ज़िंदगी" Logo on back wall ─────────────────────────────────

export function NeonDZLogo() {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  const textTexture = useMemo(() => {
    const W = 1024;
    const H = 200;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = "rgba(0,15,8,0.0)";
    ctx.fillRect(0, 0, W, H);

    // Emerald green neon text
    ctx.font = "bold 110px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#00ff88";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 30;
    ctx.fillText("डिजिटल ज़िंदगी", W / 2, H / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useFrame((_, delta) => {
    t.current += delta * 2;
    if (glowRef.current) {
      glowRef.current.intensity = 5 + Math.sin(t.current) * 2;
    }
  });

  return (
    <group ref={groupRef} position={[0, 5, -23.2]}>
      {/* Background panel */}
      <mesh receiveShadow>
        <boxGeometry args={[18, 3.5, 0.1]} />
        <meshStandardMaterial
          color="#050e08"
          roughness={0.95}
          metalness={0.3}
        />
      </mesh>

      {/* Neon text plane */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[17, 3.2]} />
        <meshStandardMaterial
          map={textTexture}
          emissiveMap={textTexture}
          emissive="#00ff88"
          emissiveIntensity={1.2}
          transparent
          alphaTest={0.05}
        />
      </mesh>

      {/* Neon border strips */}
      <mesh position={[0, 1.75, 0.06]}>
        <boxGeometry args={[18.2, 0.12, 0.06]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={5}
        />
      </mesh>
      <mesh position={[0, -1.75, 0.06]}>
        <boxGeometry args={[18.2, 0.12, 0.06]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={5}
        />
      </mesh>
      <mesh position={[-9.1, 0, 0.06]}>
        <boxGeometry args={[0.12, 3.5, 0.06]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={5}
        />
      </mesh>
      <mesh position={[9.1, 0, 0.06]}>
        <boxGeometry args={[0.12, 3.5, 0.06]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={5}
        />
      </mesh>

      {/* Pulsing glow light */}
      <pointLight
        ref={glowRef}
        color="#00ff88"
        intensity={5}
        distance={35}
        position={[0, 0, 2]}
      />
    </group>
  );
}
