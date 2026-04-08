import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";

export interface EnemyRef {
  id: string;
  position: THREE.Vector3;
  isDead: boolean;
  applyDamage: (dmg: number) => void;
}

interface EnemyManagerProps {
  heroPosition: React.MutableRefObject<THREE.Vector3>;
  onEnemiesUpdate: (refs: EnemyRef[]) => void;
}

interface GreenBloodParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface EnemyState {
  id: string;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  speed: number;
  isDead: boolean;
  fadeOut: number;
  attackTimer: number;
  animPhase: number;
  pounceTimer: number;
  isPouncing: boolean;
  bloodParticles: GreenBloodParticle[];
}

let enemyIdCounter = 0;
let globalWaveNumber = 0;

const ARENA_BOUND = 22;
const MIN_SPAWN_DIST = 14;

// Wave configuration: number of enemies per wave
const WAVE_SIZES = [5, 10, 15, 20, 25, 35, 45, 55, 65, 80, 95, 110];

function randomSpawnPosition(): THREE.Vector3 {
  for (let attempt = 0; attempt < 15; attempt++) {
    // Spawn from random arena edges
    const edge = Math.floor(Math.random() * 4);
    let x: number;
    let z: number;
    if (edge === 0) {
      x = (Math.random() - 0.5) * ARENA_BOUND * 2;
      z = -ARENA_BOUND + 1;
    } else if (edge === 1) {
      x = (Math.random() - 0.5) * ARENA_BOUND * 2;
      z = ARENA_BOUND - 1;
    } else if (edge === 2) {
      x = -ARENA_BOUND + 1;
      z = (Math.random() - 0.5) * ARENA_BOUND * 2;
    } else {
      x = ARENA_BOUND - 1;
      z = (Math.random() - 0.5) * ARENA_BOUND * 2;
    }
    const pos = new THREE.Vector3(x, 0, z);
    if (pos.length() >= MIN_SPAWN_DIST) return pos;
  }
  return new THREE.Vector3(0, 0, -ARENA_BOUND + 2);
}

function createEnemy(speedBoost = 0): EnemyState {
  return {
    id: `enemy-${++enemyIdCounter}`,
    position: randomSpawnPosition(),
    hp: 100 + speedBoost * 10,
    maxHp: 100 + speedBoost * 10,
    speed: 3.5 + speedBoost * 0.15 + Math.random() * 0.5,
    isDead: false,
    fadeOut: 0,
    attackTimer: Math.random() * 1.5,
    animPhase: Math.random() * Math.PI * 2,
    pounceTimer: 2 + Math.random() * 3,
    isPouncing: false,
    bloodParticles: [],
  };
}

export const EnemyManager = forwardRef<EnemyRef[], EnemyManagerProps>(
  function EnemyManager({ heroPosition, onEnemiesUpdate }, _ref) {
    const enemies = useRef<EnemyState[]>([]);
    const meshes = useRef<Map<string, THREE.Group>>(new Map());
    const initialized = useRef(false);
    const waveInitialized = useRef(false);
    const lastGamePhase = useRef("start");
    const waveClearDelay = useRef(0);
    const spawnQueue = useRef<EnemyState[]>([]);
    const spawnInterval = useRef(0);

    function spawnWave(waveNum: number) {
      const count = WAVE_SIZES[Math.min(waveNum - 1, WAVE_SIZES.length - 1)];
      const boost = waveNum - 1;
      const newEnemies = Array.from({ length: count }, () =>
        createEnemy(boost),
      );
      // Don't dump all at once — add to spawn queue
      spawnQueue.current.push(...newEnemies);
    }

    function buildEnemyRefs(): EnemyRef[] {
      return enemies.current.map((e) => ({
        id: e.id,
        position: e.position.clone(),
        isDead: e.isDead,
        applyDamage: (dmg: number) => {
          if (e.isDead) return;
          e.hp -= dmg;
          if (e.hp <= 0) {
            e.isDead = true;
            e.fadeOut = 1.0;
            const store = useGameStore.getState();
            store.addScore(10);
            if (Math.random() < 0.18) store.addCoins(1);
            SFX.enemyDie(store.volume);
            // Trigger green blood spray
            e.bloodParticles = []; // will be spawned in useFrame
            const mesh = meshes.current.get(e.id);
            if (mesh) {
              spawnBloodParticles(e, mesh.parent as THREE.Scene);
            }
          }
        },
      }));
    }

    function spawnBloodParticles(e: EnemyState, scene: THREE.Scene | null) {
      if (!scene) return;
      for (let i = 0; i < 12; i++) {
        const geo = new THREE.SphereGeometry(0.07 + Math.random() * 0.08, 4, 4);
        const mat = new THREE.MeshStandardMaterial({
          color: "#00cc44",
          emissive: "#00aa33",
          emissiveIntensity: 2,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(e.position).add(new THREE.Vector3(0, 0.8, 0));
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        const vy = 2 + Math.random() * 4;
        const vel = new THREE.Vector3(
          Math.cos(angle) * speed,
          vy,
          Math.sin(angle) * speed,
        );
        scene.add(mesh);
        e.bloodParticles.push({ mesh, vel, life: 0.8 + Math.random() * 0.4 });
      }
    }

    useFrame((state, delta) => {
      const store = useGameStore.getState();
      const phase = store.gamePhase;

      // Reset on new game
      if (lastGamePhase.current !== "playing" && phase === "playing") {
        enemies.current = [];
        meshes.current.clear();
        spawnQueue.current = [];
        waveInitialized.current = false;
        initialized.current = false;
        globalWaveNumber = 0;
        waveClearDelay.current = 0;
      }
      lastGamePhase.current = phase;

      if (phase !== "playing") return;

      // Initial wave spawn
      if (!initialized.current) {
        initialized.current = true;
        globalWaveNumber = store.waveCount;
        spawnWave(globalWaveNumber);
      }

      // Throttled spawning — add enemies gradually from queue
      spawnInterval.current -= delta;
      if (spawnInterval.current <= 0 && spawnQueue.current.length > 0) {
        spawnInterval.current = 0.12; // spawn one every 120ms
        const next = spawnQueue.current.shift();
        if (next) enemies.current.push(next);
      }

      // Wave clear detection
      const aliveEnemies = enemies.current.filter((e) => !e.isDead);
      const queueEmpty = spawnQueue.current.length === 0;
      if (
        aliveEnemies.length === 0 &&
        queueEmpty &&
        enemies.current.length > 0
      ) {
        waveClearDelay.current += delta;
        if (waveClearDelay.current >= 2.5) {
          waveClearDelay.current = 0;
          if (store.waveCount < 12) {
            store.nextWave();
            globalWaveNumber = store.waveCount + 1;
            enemies.current = [];
            meshes.current.clear();
            spawnWave(globalWaveNumber);
          }
        }
      }

      const heroPos = heroPosition.current;

      for (const e of enemies.current) {
        e.animPhase += delta * 5;

        // Update blood particles
        for (let i = e.bloodParticles.length - 1; i >= 0; i--) {
          const p = e.bloodParticles[i];
          p.vel.y -= 12 * delta; // gravity
          p.mesh.position.addScaledVector(p.vel, delta);
          p.life -= delta;
          if (p.life <= 0) {
            state.scene.remove(p.mesh);
            e.bloodParticles.splice(i, 1);
          }
        }

        if (e.isDead) {
          e.fadeOut -= delta * 2;
          const mesh = meshes.current.get(e.id);
          if (mesh) {
            const s = Math.max(0.001, e.fadeOut);
            mesh.scale.setScalar(s);
            mesh.rotation.z = (1 - s) * 1.8;
          }
          continue;
        }

        // AI: move toward hero
        const dist = e.position.distanceTo(heroPos);

        // Pounce logic
        e.pounceTimer -= delta;
        if (e.pounceTimer <= 0 && dist < 8 && dist > 2.5) {
          e.pounceTimer = 2.5 + Math.random() * 2;
          e.isPouncing = true;
        }

        if (e.isPouncing) {
          const lungeDir = heroPos
            .clone()
            .sub(e.position)
            .normalize()
            .multiplyScalar(16 * delta);
          e.position.add(lungeDir);
          if (dist < 2.2) e.isPouncing = false;
        } else if (dist > 2.0) {
          const toward = heroPos
            .clone()
            .sub(e.position)
            .normalize()
            .multiplyScalar(e.speed * delta);
          e.position.add(toward);
        }

        // Leg animation bob
        e.position.y = 0;

        // Bounds
        e.position.x = Math.max(
          -ARENA_BOUND,
          Math.min(ARENA_BOUND, e.position.x),
        );
        e.position.z = Math.max(
          -ARENA_BOUND,
          Math.min(ARENA_BOUND, e.position.z),
        );

        // Attack hero
        e.attackTimer -= delta;
        if (dist <= 2.5 && e.attackTimer <= 0) {
          e.attackTimer = 1.2;
          store.damageHero(10);
          SFX.houndBite(store.volume);
          SFX.heroHit(store.volume * 0.5);
        }

        // Update mesh transform
        const mesh = meshes.current.get(e.id);
        if (mesh) {
          mesh.position.copy(e.position);
          // Face hero
          const faceDir = heroPos.clone().sub(e.position).setY(0);
          if (faceDir.length() > 0.1) {
            mesh.rotation.y = Math.atan2(faceDir.x, faceDir.z);
          }
          // Leg walk bob
          const walkBob = Math.sin(e.animPhase) * 0.08;
          mesh.position.y = walkBob;
        }
      }

      // Cleanup dead enemies that finished fading
      enemies.current = enemies.current.filter(
        (e) => !e.isDead || e.fadeOut > 0 || e.bloodParticles.length > 0,
      );

      onEnemiesUpdate(buildEnemyRefs());
    });

    return (
      <group>
        {enemies.current.map((e) => (
          <TriHoundMesh
            key={e.id}
            enemy={e}
            onRef={(g) => {
              if (g) meshes.current.set(e.id, g);
              else meshes.current.delete(e.id);
            }}
          />
        ))}
      </group>
    );
  },
);

// ─── Three-Headed Hound Mesh ──────────────────────────────────────────────────

function TriHoundMesh({
  enemy,
  onRef,
}: {
  enemy: EnemyState;
  onRef: (g: THREE.Group | null) => void;
}) {
  const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);

  return (
    <group
      ref={onRef}
      position={[enemy.position.x, enemy.position.y, enemy.position.z]}
    >
      <TriHoundBody hpFrac={hpFrac} />
    </group>
  );
}

function TriHoundBody({ hpFrac }: { hpFrac: number }) {
  const bodyMat = (
    <meshStandardMaterial
      color="#1a1a22"
      roughness={0.85}
      metalness={0.1}
      emissive="#050510"
      emissiveIntensity={0.3}
    />
  );
  const eyeMat = (
    <meshStandardMaterial
      color="#ff0000"
      emissive="#ff0000"
      emissiveIntensity={8}
    />
  );
  const skinMat = (
    <meshStandardMaterial color="#2a2a35" roughness={0.8} metalness={0.05} />
  );

  return (
    <group>
      {/* ── Main body (elongated) ── */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.55, 0.42, 0.85]} />
        {bodyMat}
      </mesh>

      {/* Neck connector to middle head */}
      <mesh position={[0, 0.72, 0.3]} rotation={[0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
        {skinMat}
      </mesh>

      {/* ── THREE HEADS ── */}
      {/* Center head */}
      <group position={[0, 0.88, 0.58]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 10, 8]} />
          {bodyMat}
        </mesh>
        {/* Jaw */}
        <mesh position={[0, -0.12, 0.1]} castShadow>
          <boxGeometry args={[0.2, 0.08, 0.15]} />
          {bodyMat}
        </mesh>
        {/* Snout */}
        <mesh position={[0, 0, 0.16]} castShadow>
          <boxGeometry args={[0.12, 0.1, 0.1]} />
          {skinMat}
        </mesh>
        {/* Glowing red eyes */}
        <mesh position={[-0.07, 0.04, 0.16]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          {eyeMat}
        </mesh>
        <mesh position={[0.07, 0.04, 0.16]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          {eyeMat}
        </mesh>
      </group>

      {/* Left head */}
      <group position={[-0.32, 0.75, 0.42]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 10, 8]} />
          {bodyMat}
        </mesh>
        <mesh position={[0, -0.1, 0.1]} castShadow>
          <boxGeometry args={[0.17, 0.07, 0.13]} />
          {bodyMat}
        </mesh>
        <mesh position={[-0.055, 0.035, 0.14]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          {eyeMat}
        </mesh>
        <mesh position={[0.055, 0.035, 0.14]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          {eyeMat}
        </mesh>
      </group>

      {/* Right head */}
      <group position={[0.32, 0.75, 0.42]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 10, 8]} />
          {bodyMat}
        </mesh>
        <mesh position={[0, -0.1, 0.1]} castShadow>
          <boxGeometry args={[0.17, 0.07, 0.13]} />
          {bodyMat}
        </mesh>
        <mesh position={[-0.055, 0.035, 0.14]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          {eyeMat}
        </mesh>
        <mesh position={[0.055, 0.035, 0.14]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          {eyeMat}
        </mesh>
      </group>

      {/* ── 4 LEGS ── */}
      {(
        [
          { id: "fl", x: -0.2, z: 0.28 },
          { id: "fr", x: 0.2, z: 0.28 },
          { id: "bl", x: -0.2, z: -0.22 },
          { id: "br", x: 0.2, z: -0.22 },
        ] as { id: string; x: number; z: number }[]
      ).map(({ id, x, z }) => (
        <group key={id} position={[x, 0.18, z]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.05, 0.26, 7]} />
            {skinMat}
          </mesh>
          <mesh position={[0, -0.32, 0.04]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.24, 7]} />
            {skinMat}
          </mesh>
          <mesh position={[0, -0.46, 0.06]}>
            <boxGeometry args={[0.1, 0.06, 0.16]} />
            {bodyMat}
          </mesh>
        </group>
      ))}

      {/* Tail */}
      <mesh position={[0, 0.55, -0.45]} rotation={[-0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.02, 0.4, 6]} />
        {skinMat}
      </mesh>

      {/* Supernatural glow */}
      <pointLight
        color="#aa0022"
        intensity={1.0}
        distance={4}
        position={[0, 0.8, 0]}
      />

      {/* HP bar */}
      <group position={[0, 1.6, 0]}>
        <mesh>
          <planeGeometry args={[0.9, 0.09]} />
          <meshBasicMaterial color="#330000" />
        </mesh>
        <mesh position={[(hpFrac - 1) * 0.45, 0, 0.001]}>
          <planeGeometry args={[0.9 * hpFrac, 0.07]} />
          <meshBasicMaterial color="#ff2200" />
        </mesh>
      </group>
    </group>
  );
}
