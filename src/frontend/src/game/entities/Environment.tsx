import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { createDZLogoTexture, createTextTexture } from "../utils/faceTexture";

// ─── Scene Lighting ───────────────────────────────────────────────────────────

export function SceneLighting() {
  const fireRef1 = useRef<THREE.PointLight>(null);
  const fireRef2 = useRef<THREE.PointLight>(null);
  const fireRef3 = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 5;
    if (fireRef1.current)
      fireRef1.current.intensity = 3.6 + Math.sin(t.current * 1.3) * 1.8;
    if (fireRef2.current)
      fireRef2.current.intensity = 3.0 + Math.sin(t.current * 0.9 + 1.5) * 1.6;
    if (fireRef3.current)
      fireRef3.current.intensity = 2.4 + Math.sin(t.current * 1.7 + 0.8) * 1.2;
  });

  return (
    <>
      {/* Bright warm ambient — NO darkness */}
      <ambientLight intensity={1.5} color="#ffccaa" />
      <ambientLight intensity={1.0} color="#ffe8c8" />

      {/* Strong primary directional */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={2.0}
        color="#ffaa44"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {/* Secondary fill from opposite side */}
      <directionalLight
        position={[-10, 20, -10]}
        intensity={1.5}
        color="#ffe8c8"
      />

      {/* Hemisphere warm sky */}
      <hemisphereLight args={["#ff6622", "#3a2810", 0.8]} />

      {/* Flickering fire area lights */}
      <pointLight
        ref={fireRef1}
        position={[-14, 4, -6]}
        color="#ff3300"
        intensity={5}
        distance={25}
      />
      <pointLight
        ref={fireRef2}
        position={[12, 4, -8]}
        color="#ff3300"
        intensity={5}
        distance={25}
      />
      <pointLight
        ref={fireRef3}
        position={[0, 5, -18]}
        color="#ff5500"
        intensity={3}
        distance={24}
      />
      {/* Logo glow */}
      <pointLight
        position={[-8, 28, -60]}
        color="#ff3300"
        intensity={6}
        distance={80}
      />
      <pointLight
        position={[8, 28, -60]}
        color="#ff3300"
        intensity={6}
        distance={80}
      />
      {/* Hero area fill */}
      <pointLight
        position={[0, 10, 0]}
        color="#4466ff"
        intensity={1.5}
        distance={30}
      />
      {/* Scattered fire */}
      <pointLight
        position={[-20, 5, -20]}
        color="#ff2200"
        intensity={2.4}
        distance={28}
      />
      <pointLight
        position={[20, 5, -30]}
        color="#ff6600"
        intensity={2.4}
        distance={28}
      />
      {/* Near-ground warm fill */}
      <pointLight
        position={[0, 2, 2]}
        color="#ff6600"
        intensity={2.0}
        distance={20}
      />
      {/* Light fog — cinematic but not dark */}
      <fog attach="fog" args={["#1a0a04", 30, 100]} />
    </>
  );
}

// ─── Ground (Burning City Floor) ─────────────────────────────────────────────

export function Ground() {
  const { groundTexture, emissiveTexture } = useMemo(() => {
    const W = 512;
    const H = 512;

    // Base ground canvas
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const t = new THREE.CanvasTexture(canvas);
      return { groundTexture: t, emissiveTexture: t };
    }

    // Dark charred earth base
    ctx.fillStyle = "#1a0800";
    ctx.fillRect(0, 0, W, H);

    // Draw lava crack lines
    ctx.strokeStyle = "#ff4400";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 8;
    const crackPaths = [
      [
        [50, 0],
        [120, 80],
        [180, 60],
        [220, 140],
        [300, 100],
      ],
      [
        [0, 200],
        [80, 220],
        [150, 280],
        [100, 350],
        [200, 400],
      ],
      [
        [W, 100],
        [380, 160],
        [320, 240],
        [350, 320],
        [280, 420],
      ],
      [
        [150, 0],
        [200, 100],
        [160, 200],
        [220, 300],
        [180, W],
      ],
      [
        [300, 0],
        [350, 120],
        [400, 200],
        [380, 320],
        [450, H],
      ],
      [
        [0, 350],
        [100, 380],
        [200, 340],
        [300, 420],
        [W, 390],
      ],
    ];
    for (const pts of crackPaths) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
    }

    // Additional glow blobs at crack intersections
    ctx.shadowBlur = 0;
    const glows = [
      [120, 80],
      [220, 140],
      [150, 280],
      [350, 240],
      [200, 400],
      [400, 350],
    ];
    for (const [gx, gy] of glows) {
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 24);
      grad.addColorStop(0, "rgba(255,80,0,0.7)");
      grad.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.needsUpdate = true;
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(4, 4);

    // Emissive version — brighter orange cracks
    const eCanvas = document.createElement("canvas");
    eCanvas.width = W;
    eCanvas.height = H;
    const ectx = eCanvas.getContext("2d");
    if (!ectx) {
      const et = new THREE.CanvasTexture(eCanvas);
      return { groundTexture, emissiveTexture: et };
    }
    ectx.fillStyle = "#000000";
    ectx.fillRect(0, 0, W, H);
    ectx.strokeStyle = "#ff6600";
    ectx.lineWidth = 3;
    ectx.shadowColor = "#ff8800";
    ectx.shadowBlur = 12;
    for (const pts of crackPaths) {
      ectx.beginPath();
      ectx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ectx.lineTo(pts[i][0], pts[i][1]);
      }
      ectx.stroke();
    }
    const emissiveTexture = new THREE.CanvasTexture(eCanvas);
    emissiveTexture.needsUpdate = true;
    emissiveTexture.wrapS = THREE.RepeatWrapping;
    emissiveTexture.wrapT = THREE.RepeatWrapping;
    emissiveTexture.repeat.set(4, 4);

    return { groundTexture, emissiveTexture };
  }, []);

  const scorch = useMemo(() => {
    const positions: [number, number, number][] = [
      [-6, 0.01, -4],
      [8, 0.01, 2],
      [-12, 0.01, 6],
      [4, 0.01, -10],
      [14, 0.01, -3],
      [-3, 0.01, 9],
      [0, 0.01, 0],
      [-9, 0.01, -8],
    ];
    return positions.map((pos) => ({
      pos,
      key: `scorch-${pos[0]}-${pos[2]}`,
      rot: Math.random() * Math.PI,
      r: 1.2 + Math.random() * 2,
    }));
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          map={groundTexture}
          emissiveMap={emissiveTexture}
          color="#1a0800"
          emissive="#ff4400"
          emissiveIntensity={0.3}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      {scorch.map((s) => (
        <mesh key={s.key} position={s.pos} rotation={[-Math.PI / 2, s.rot, 0]}>
          <circleGeometry args={[s.r, 12]} />
          <meshBasicMaterial color="#1a0800" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Rubble Debris ────────────────────────────────────────────────────────────

export function Debris() {
  const rubble = useMemo(() => {
    const positions: [number, number, number][] = [
      [-8, 0.15, -5],
      [6, 0.12, -3],
      [-4, 0.2, 3],
      [10, 0.1, 1],
      [-12, 0.25, -2],
      [3, 0.18, -8],
      [-6, 0.14, 6],
      [9, 0.2, 5],
      [-3, 0.1, -12],
      [14, 0.22, -6],
      [-9, 0.28, 8],
      [2, 0.16, 10],
      [0, 0.2, -14],
      [-16, 0.12, 4],
      [16, 0.2, -10],
      [5, 0.13, 12],
      [-11, 0.17, -10],
      [13, 0.2, 7],
      [-7, 0.14, -15],
      [18, 0.1, 2],
    ];
    return positions.map((pos, i) => ({
      id: `rubble-${i}`,
      pos,
      rot: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ] as [number, number, number],
      scale: 0.1 + Math.random() * 0.35,
      isIco: i % 3 === 0,
      gray: Math.floor(0x33 + Math.random() * 0x22)
        .toString(16)
        .padStart(2, "0"),
    }));
  }, []);

  const skulls = useMemo(() => {
    const positions: [number, number, number][] = [
      [-7, 0.05, -9],
      [5, 0.05, -11],
      [-13, 0.05, 3],
      [11, 0.05, -4],
      [-4, 0.05, 11],
      [8, 0.05, 8],
      [-16, 0.05, -7],
      [16, 0.05, 5],
    ];
    return positions.map((pos, i) => ({
      id: `skull-${i}`,
      pos,
      rot: Math.random() * Math.PI,
      tiltZ: (Math.random() - 0.5) * 0.8,
    }));
  }, []);

  return (
    <group>
      {rubble.map((r) => (
        <mesh
          key={r.id}
          position={r.pos}
          rotation={r.rot}
          castShadow
          receiveShadow
        >
          {r.isIco ? (
            <icosahedronGeometry args={[r.scale, 0]} />
          ) : (
            <dodecahedronGeometry args={[r.scale, 0]} />
          )}
          <meshStandardMaterial
            color={`#${r.gray}${r.gray}${r.gray}`}
            roughness={0.9}
          />
        </mesh>
      ))}
      {skulls.map((s) => (
        <mesh
          key={s.id}
          position={s.pos}
          rotation={[0, s.rot, s.tiltZ]}
          castShadow
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color="#F5F0E8"
            roughness={0.7}
            emissive="#1a0005"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Burning Vehicles ─────────────────────────────────────────────────────────

export function BurningVehicles() {
  return (
    <group>
      <BurningVehicle position={[-14, 0, -6]} rotationY={0.4} />
      <BurningVehicle position={[12, 0, -8]} rotationY={-0.7} />
      <BurningVehicle position={[-5, 0, -16]} rotationY={1.1} />
      <BurningVehicle position={[18, 0, -4]} rotationY={-0.3} />
    </group>
  );
}

function BurningVehicle({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * 8;
    if (lightRef.current) {
      lightRef.current.intensity =
        2.0 + Math.sin(t.current) * 1.5 + Math.sin(t.current * 2.3) * 0.7;
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0.08]}>
      {/* Burned body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[3.0, 0.8, 1.4]} />
        <meshStandardMaterial
          color="#2a0000"
          roughness={0.95}
          metalness={0.3}
        />
      </mesh>
      {/* Cabin */}
      <mesh position={[0.2, 1.0, 0]} castShadow>
        <boxGeometry args={[1.6, 0.7, 1.2]} />
        <meshStandardMaterial
          color="#1a0000"
          roughness={0.95}
          metalness={0.2}
        />
      </mesh>
      {/* Melted wheels */}
      {([-1.0, 1.0] as number[]).map((x) =>
        ([-0.75, 0.75] as number[]).map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.2, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.28, 0.28, 0.2, 8]} />
            <meshStandardMaterial color="#1a1414" roughness={0.98} />
          </mesh>
        )),
      )}
      {/* Fire point light */}
      <pointLight
        ref={lightRef}
        position={[0, 1.5, 0]}
        color="#ff4400"
        intensity={2.0}
        distance={12}
      />
      <VehicleFireParticles />
    </group>
  );
}

const VFIRE_IDS = [
  "vf0",
  "vf1",
  "vf2",
  "vf3",
  "vf4",
  "vf5",
  "vf6",
  "vf7",
  "vf8",
  "vf9",
];

function VehicleFireParticles() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const times = useRef(
    Array.from({ length: 10 }, () => Math.random() * Math.PI * 2),
  );

  useFrame((_, delta) => {
    for (let i = 0; i < 10; i++) {
      times.current[i] += delta * (1.8 + i * 0.2);
      const m = meshes.current[i];
      if (!m) continue;
      m.position.y = 1.2 + Math.sin(times.current[i]) * 0.5 + i * 0.1;
      m.position.x = Math.cos(times.current[i] * 0.7 + i) * 0.3;
      m.position.z = Math.sin(times.current[i] * 0.5 + i) * 0.2;
      const s = 0.05 + Math.abs(Math.sin(times.current[i])) * 0.1;
      m.scale.setScalar(s);
    }
  });

  return (
    <group>
      {VFIRE_IDS.map((id, i) => (
        <mesh
          key={id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={[0, 1.2, 0]}
        >
          <sphereGeometry args={[0.12, 5, 5]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#ff4400" : "#ffaa00"}
            emissive="#ff6600"
            emissiveIntensity={3}
            transparent
            opacity={0.88}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Background City Ruins ───────────────────────────────────────────────────

export function CityRuins() {
  const buildings = useMemo(
    () => [
      {
        id: "cb0",
        pos: [-60, 18, -110] as [number, number, number],
        size: [10, 36, 8] as [number, number, number],
        color: "#3a1818",
      },
      {
        id: "cb1",
        pos: [-40, 22, -100] as [number, number, number],
        size: [8, 44, 7] as [number, number, number],
        color: "#341414",
      },
      {
        id: "cb2",
        pos: [-20, 14, -120] as [number, number, number],
        size: [12, 28, 9] as [number, number, number],
        color: "#3c1a1a",
      },
      {
        id: "cb3",
        pos: [0, 25, -130] as [number, number, number],
        size: [10, 50, 8] as [number, number, number],
        color: "#301010",
      },
      {
        id: "cb4",
        pos: [20, 16, -115] as [number, number, number],
        size: [9, 32, 7] as [number, number, number],
        color: "#381818",
      },
      {
        id: "cb5",
        pos: [40, 20, -105] as [number, number, number],
        size: [11, 40, 8] as [number, number, number],
        color: "#321414",
      },
      {
        id: "cb6",
        pos: [60, 12, -95] as [number, number, number],
        size: [8, 24, 6] as [number, number, number],
        color: "#3e1c1c",
      },
      {
        id: "cb7",
        pos: [-80, 17, -120] as [number, number, number],
        size: [10, 34, 7] as [number, number, number],
        color: "#301414",
      },
    ],
    [],
  );

  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);
  const tOffsets = useMemo(
    () => buildings.map(() => Math.random() * Math.PI * 2),
    [buildings],
  );
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    for (let i = 0; i < lightRefs.current.length; i++) {
      const l = lightRefs.current[i];
      if (l) {
        l.intensity =
          1.0 + Math.abs(Math.sin(t.current * 3 + tOffsets[i])) * 3.0;
      }
    }
  });

  return (
    <group>
      {buildings.map((b, bIdx) => (
        <group key={b.id} position={b.pos}>
          <mesh castShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.color}
              emissive="#ff3300"
              emissiveIntensity={0.5}
              roughness={0.95}
            />
          </mesh>
          {/* Broken top */}
          <mesh
            position={[b.size[0] * 0.2, b.size[1] * 0.55, 0]}
            rotation={[0, 0, 0.15]}
          >
            <boxGeometry
              args={[b.size[0] * 0.6, b.size[1] * 0.1, b.size[2] * 0.7]}
            />
            <meshStandardMaterial color={b.color} roughness={0.98} />
          </mesh>
          {/* Glowing orange windows */}
          <mesh position={[0, b.size[1] * 0.1, b.size[2] * 0.51]}>
            <planeGeometry args={[b.size[0] * 0.7, b.size[1] * 0.6]} />
            <meshStandardMaterial
              color="#ff2200"
              emissive="#ff3300"
              emissiveIntensity={0.8}
              transparent
              opacity={0.25}
            />
          </mesh>
          <pointLight
            ref={(el) => {
              lightRefs.current[bIdx] = el;
            }}
            position={[0, -b.size[1] * 0.3, b.size[2] * 0.6]}
            color="#ff4400"
            intensity={2.0}
            distance={60}
          />
        </group>
      ))}
      <SmokeParticles />
      <EmberParticles />
    </group>
  );
}

const SMOKE_COUNT = 80;
const SMOKE_IDS = Array.from({ length: SMOKE_COUNT }, (_, i) => `smoke-${i}`);

function SmokeParticles() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const initData = useMemo(
    () =>
      Array.from({ length: SMOKE_COUNT }, () => ({
        x: (Math.random() - 0.5) * 160,
        y: 10 + Math.random() * 40,
        z: -90 - Math.random() * 60,
        speed: 0.012 + Math.random() * 0.014,
      })),
    [],
  );

  useFrame(() => {
    for (let i = 0; i < SMOKE_COUNT; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      initData[i].y += initData[i].speed;
      if (initData[i].y > 60) {
        initData[i].y = 5 + Math.random() * 10;
        initData[i].x = (Math.random() - 0.5) * 160;
      }
      m.position.set(initData[i].x, initData[i].y, initData[i].z);
    }
  });

  return (
    <group>
      {SMOKE_IDS.map((id, i) => (
        <mesh
          key={id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={[initData[i].x, initData[i].y, initData[i].z]}
        >
          <sphereGeometry args={[0.6 + Math.random() * 0.8, 5, 5]} />
          <meshBasicMaterial
            color="#3a3030"
            transparent
            opacity={0.3 + Math.random() * 0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

const EMBER_COUNT = 200;
const EMBER_IDS = Array.from({ length: EMBER_COUNT }, (_, i) => `ember-${i}`);

function EmberParticles() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const initData = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, () => ({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 2,
        z: (Math.random() - 0.5) * 40,
        speedY: 0.04 + Math.random() * 0.06,
        driftX: (Math.random() - 0.5) * 0.015,
        driftZ: (Math.random() - 0.5) * 0.012,
        colorIdx: Math.floor(Math.random() * 3),
      })),
    [],
  );

  useFrame(() => {
    for (let i = 0; i < EMBER_COUNT; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      initData[i].y += initData[i].speedY;
      initData[i].x += initData[i].driftX;
      initData[i].z += initData[i].driftZ;
      if (initData[i].y > 5) {
        initData[i].y = 0;
        initData[i].x = (Math.random() - 0.5) * 40;
        initData[i].z = (Math.random() - 0.5) * 40;
      }
      m.position.set(initData[i].x, initData[i].y, initData[i].z);
    }
  });

  const COLORS = ["#ff4400", "#ffaa00", "#cc0000"] as const;

  return (
    <group>
      {EMBER_IDS.map((id, i) => (
        <mesh
          key={id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={[initData[i].x, initData[i].y, initData[i].z]}
        >
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshStandardMaterial
            color={COLORS[initData[i].colorIdx]}
            emissive={COLORS[initData[i].colorIdx]}
            emissiveIntensity={4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Giant Flaming DZ Logo ────────────────────────────────────────────────────

export function GiantDZLogo() {
  const groupRef = useRef<THREE.Group>(null);
  const goldLightRef1 = useRef<THREE.PointLight>(null);
  const goldLightRef2 = useRef<THREE.PointLight>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t.current * 0.3) * 0.06;
      groupRef.current.position.y = 30 + Math.sin(t.current * 0.5) * 0.8;
    }
    if (goldLightRef1.current)
      goldLightRef1.current.intensity = 10 + Math.sin(t.current * 4.7) * 3;
    if (goldLightRef2.current)
      goldLightRef2.current.intensity = 10 + Math.sin(t.current * 3.1 + 1) * 3;
  });

  const mat = (
    <meshStandardMaterial
      color="#cc8800"
      emissive="#ffd700"
      emissiveIntensity={2.2}
      roughness={0.2}
      metalness={0.8}
    />
  );

  return (
    <group ref={groupRef} position={[0, 30, -65]} scale={1.6}>
      {/* D letter */}
      <group position={[-5, 0, 0]}>
        <mesh position={[-2, 0, 0]} castShadow>
          <boxGeometry args={[1.2, 10, 1]} />
          {mat}
        </mesh>
        <mesh position={[0.6, 4.2, 0]} castShadow>
          <boxGeometry args={[3.6, 1.2, 1]} />
          {mat}
        </mesh>
        <mesh position={[0.6, -4.2, 0]} castShadow>
          <boxGeometry args={[3.6, 1.2, 1]} />
          {mat}
        </mesh>
        <mesh position={[2.4, 2, 0]} rotation={[0, 0, 0.4]} castShadow>
          <boxGeometry args={[1.0, 3.5, 1]} />
          {mat}
        </mesh>
        <mesh position={[2.4, -2, 0]} rotation={[0, 0, -0.4]} castShadow>
          <boxGeometry args={[1.0, 3.5, 1]} />
          {mat}
        </mesh>
      </group>
      {/* Z letter */}
      <group position={[5, 0, 0]}>
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[7, 1.2, 1]} />
          {mat}
        </mesh>
        <mesh position={[0, -4.2, 0]} castShadow>
          <boxGeometry args={[7, 1.2, 1]} />
          {mat}
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.55]} castShadow>
          <boxGeometry args={[1.1, 10.5, 1]} />
          {mat}
        </mesh>
      </group>
      <pointLight
        ref={goldLightRef1}
        position={[-6, 2, 3]}
        color="#ffd700"
        intensity={10}
        distance={80}
      />
      <pointLight
        ref={goldLightRef2}
        position={[6, -2, 3]}
        color="#ff8800"
        intensity={10}
        distance={80}
      />
      <LogoFireParticles />
    </group>
  );
}

const LOGO_FIRE_IDS = [
  "lf0",
  "lf1",
  "lf2",
  "lf3",
  "lf4",
  "lf5",
  "lf6",
  "lf7",
  "lf8",
  "lf9",
  "lf10",
  "lf11",
];

function LogoFireParticles() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const times = useRef(
    Array.from({ length: 12 }, () => Math.random() * Math.PI * 2),
  );
  const xOffsets = useMemo(
    () => Array.from({ length: 12 }, (_, i) => (i - 6) * 1.2),
    [],
  );

  useFrame((_, delta) => {
    for (let i = 0; i < 12; i++) {
      times.current[i] += delta * (1.5 + i * 0.2);
      const m = meshes.current[i];
      if (!m) continue;
      m.position.y = 5 + (times.current[i] % (Math.PI * 2)) * 0.8;
      m.position.x = xOffsets[i] + Math.sin(times.current[i] * 0.6) * 0.4;
      const s = 0.12 + Math.abs(Math.sin(times.current[i])) * 0.18;
      m.scale.setScalar(s);
      if (m.material instanceof THREE.MeshStandardMaterial) {
        m.material.emissiveIntensity = 3 + Math.sin(times.current[i] * 5) * 1.5;
      }
      if (m.position.y > 10) m.position.y = 4.5;
    }
  });

  return (
    <group>
      {LOGO_FIRE_IDS.map((id, i) => (
        <mesh
          key={id}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          position={[xOffsets[i], 5, 0]}
        >
          <sphereGeometry args={[0.18, 5, 5]} />
          <meshStandardMaterial
            color={
              i % 3 === 0 ? "#ff2200" : i % 3 === 1 ? "#ff8800" : "#ffdd00"
            }
            emissive={i % 3 === 0 ? "#ff4400" : "#ffaa00"}
            emissiveIntensity={4}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Building Wall (Store + DZ Logo billboard) ───────────────────────────────

export function BuildingWall() {
  const logoTexture = useMemo(() => createDZLogoTexture(), []);
  const hindiTexture = useMemo(
    () =>
      createTextTexture("डिजिटल ज़िंदगी स्टोर", {
        width: 768,
        height: 160,
        bgColor: "rgba(5,15,8,0.98)",
        textColor: "#f0c040",
        fontSize: 64,
      }),
    [],
  );

  return (
    <group>
      {/* Main back wall */}
      <mesh position={[0, 10, -22]} receiveShadow>
        <boxGeometry args={[55, 20, 1]} />
        <meshStandardMaterial
          color="#1d2018"
          roughness={0.95}
          emissive="#200a05"
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* Side walls */}
      <mesh position={[-24, 10, -5]} receiveShadow>
        <boxGeometry args={[1, 20, 38]} />
        <meshStandardMaterial color="#1a1d18" roughness={0.95} />
      </mesh>
      <mesh position={[24, 10, -5]} receiveShadow>
        <boxGeometry args={[1, 20, 38]} />
        <meshStandardMaterial color="#1a1d18" roughness={0.95} />
      </mesh>
      {/* DZ Logo billboard */}
      <mesh position={[0, 12, -21.4]}>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial
          map={logoTexture}
          emissiveMap={logoTexture}
          emissive="#ffffff"
          emissiveIntensity={0.9}
          roughness={0.3}
        />
      </mesh>
      <pointLight
        position={[0, 12, -20]}
        color="#00ff88"
        intensity={5}
        distance={25}
      />
      <pointLight
        position={[-2, 11, -20]}
        color="#ff6600"
        intensity={4}
        distance={18}
      />
      {/* Hindi signboard */}
      <mesh position={[0, 6, -21.4]}>
        <planeGeometry args={[10, 2.2]} />
        <meshStandardMaterial
          map={hindiTexture}
          emissiveMap={hindiTexture}
          emissive="#ffffff"
          emissiveIntensity={0.65}
          roughness={0.4}
        />
      </mesh>
      {/* Damage cracks */}
      <mesh position={[-9, 7, -21.5]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.15, 5, 0.1]} />
        <meshStandardMaterial color="#050604" roughness={1} />
      </mesh>
      <mesh position={[7, 10, -21.5]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.1, 4, 0.1]} />
        <meshStandardMaterial color="#050604" roughness={1} />
      </mesh>
      {/* Glowing windows */}
      {(
        [
          { id: "wn0", x: -16, row: 0 },
          { id: "wn1", x: -8, row: 1 },
          { id: "wn2", x: 8, row: 0 },
          { id: "wn3", x: 16, row: 1 },
        ] as { id: string; x: number; row: number }[]
      ).map(({ id, x, row }) => (
        <group key={id} position={[x, 6 + row * 4, -21.3]}>
          <mesh>
            <planeGeometry args={[1.8, 2.2]} />
            <meshStandardMaterial
              color="#ff4400"
              emissive="#ff3300"
              emissiveIntensity={1.5}
              transparent
              opacity={0.8}
            />
          </mesh>
          <pointLight color="#ff4400" intensity={3} distance={12} />
        </group>
      ))}
    </group>
  );
}

// ─── Skeletons (decorative, static) ──────────────────────────────────────────

export function Skeletons() {
  const data = useMemo(() => {
    const positions: [number, number, number][] = [
      [-7, 0, -9],
      [5, 0, -11],
      [-13, 0, 3],
      [11, 0, -4],
      [-4, 0, 11],
      [8, 0, 8],
      [-16, 0, -7],
      [16, 0, 5],
      [0, 0, -14],
      [-9, 0, 13],
    ];
    const rotY = [0.3, -0.8, 1.2, -0.4, 0.6, -1.1, 0.9, -0.3, 1.6, -1.4];
    const tiltZ = [
      0.1, -0.15, 0.2, -0.05, 0.15, -0.2, 0.08, -0.12, 0.25, -0.18,
    ];
    return positions.map((pos, i) => ({
      pos,
      rotY: rotY[i],
      tiltZ: tiltZ[i],
      id: `dskel-${i}`,
    }));
  }, []);

  return (
    <group>
      {data.map((s) => (
        <DecorativeSkeleton
          key={s.id}
          position={s.pos}
          rotationY={s.rotY}
          tiltZ={s.tiltZ}
        />
      ))}
    </group>
  );
}

function DecorativeSkeleton({
  position,
  rotationY,
  tiltZ,
}: {
  position: [number, number, number];
  rotationY: number;
  tiltZ: number;
}) {
  const mat = (
    <meshStandardMaterial
      color="#d8cdb0"
      roughness={0.7}
      emissive="#604840"
      emissiveIntensity={0.3}
    />
  );
  return (
    <group position={position} rotation={[0, rotationY, tiltZ]}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.14, 10, 8]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.26, 0.06]} castShadow>
        <boxGeometry args={[0.16, 0.08, 0.14]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, 0.45, 6]} />
        {mat}
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.28, 0.32, 0.14]} />
        {mat}
      </mesh>
      <mesh position={[0, -0.18, 0]} castShadow>
        <boxGeometry args={[0.22, 0.1, 0.1]} />
        {mat}
      </mesh>
      <mesh position={[-0.28, 0.08, 0]} rotation={[0, 0, 0.5]} castShadow>
        <capsuleGeometry args={[0.03, 0.28, 4, 6]} />
        {mat}
      </mesh>
      <mesh position={[0.28, 0.08, 0]} rotation={[0, 0, -0.5]} castShadow>
        <capsuleGeometry args={[0.03, 0.28, 4, 6]} />
        {mat}
      </mesh>
      <mesh position={[-0.08, -0.42, 0]} rotation={[0.1, 0, 0.1]} castShadow>
        <capsuleGeometry args={[0.04, 0.32, 4, 6]} />
        {mat}
      </mesh>
      <mesh position={[0.08, -0.42, 0]} rotation={[0.1, 0, -0.1]} castShadow>
        <capsuleGeometry args={[0.04, 0.32, 4, 6]} />
        {mat}
      </mesh>
    </group>
  );
}
