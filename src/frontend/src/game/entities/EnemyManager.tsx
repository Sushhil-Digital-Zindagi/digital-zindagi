import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";

export interface EnemyRef {
  id: string;
  position: THREE.Vector3;
  applyDamage: (dmg: number) => void;
}

interface EnemyManagerProps {
  heroPosition: React.MutableRefObject<THREE.Vector3>;
  onEnemiesUpdate: (refs: EnemyRef[]) => void;
}

type EnemyType = "triHound" | "alienDemon";

interface EnemyState {
  id: string;
  type: EnemyType;
  position: THREE.Vector3;
  hp: number;
  maxHp: number;
  behaviorState: "chase" | "attack" | "retreat";
  attackTimer: number;
  fadeOut: number;
  isDead: boolean;
  velocity: THREE.Vector3;
  orbitAngle: number;
  projectiles: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }>;
  animPhase: number;
  pounceTimer: number;
  isPouncing: boolean;
}

let enemyIdCounter = 0;
let waveNumber = 0;

const HERO_START = new THREE.Vector3(0, 0, 3);
const MIN_SPAWN_DIST = 12;

function randomSpawnPosition(): THREE.Vector3 {
  for (let attempt = 0; attempt < 10; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 4;
    const pos = new THREE.Vector3(
      Math.cos(angle) * dist,
      0,
      Math.sin(angle) * dist,
    );
    if (pos.distanceTo(HERO_START) >= MIN_SPAWN_DIST) return pos;
  }
  return new THREE.Vector3(0, 0, -20);
}

function createEnemy(type: EnemyType): EnemyState {
  const hpMap: Record<EnemyType, number> = { triHound: 135, alienDemon: 144 };
  const hp = hpMap[type];
  return {
    id: `enemy-${++enemyIdCounter}`,
    type,
    position: randomSpawnPosition(),
    hp,
    maxHp: hp,
    behaviorState: "chase",
    attackTimer: 0,
    fadeOut: 0,
    isDead: false,
    velocity: new THREE.Vector3(),
    orbitAngle: Math.random() * Math.PI * 2,
    projectiles: [],
    animPhase: Math.random() * Math.PI * 2,
    pounceTimer: 2 + Math.random() * 2,
    isPouncing: false,
  };
}

function getWaveSpawnTypes(wave: number): EnemyType[] {
  const isBonus = wave % 3 === 0;
  const baseCount = 3 + Math.floor(wave * 0.7);
  const total = baseCount + (isBonus ? 2 : 0);
  const types: EnemyType[] = [];
  for (let i = 0; i < total; i++) {
    if (wave <= 2) {
      types.push("triHound");
    } else {
      const demonChance = Math.min(0.6, 0.2 + wave * 0.05);
      types.push(Math.random() < demonChance ? "alienDemon" : "triHound");
    }
  }
  return types;
}

export const EnemyManager = forwardRef<EnemyRef[], EnemyManagerProps>(
  function EnemyManager({ heroPosition, onEnemiesUpdate }, _ref) {
    const enemies = useRef<EnemyState[]>([]);
    const meshes = useRef<Map<string, THREE.Group>>(new Map());
    const spawnTimer = useRef(8);
    const initialized = useRef(false);
    const wingRefs = useRef<
      Map<string, [THREE.Mesh | null, THREE.Mesh | null]>
    >(new Map());

    function spawnInitialEnemies() {
      waveNumber = 1;
      for (const type of getWaveSpawnTypes(waveNumber)) {
        enemies.current.push(createEnemy(type));
      }
    }

    function buildEnemyRefs(): EnemyRef[] {
      return enemies.current
        .filter((e) => !e.isDead)
        .map((e) => ({
          id: e.id,
          position: e.position.clone(),
          applyDamage: (dmg: number) => {
            e.hp -= dmg;
            if (e.hp <= 0 && !e.isDead) {
              e.isDead = true;
              e.fadeOut = 1.0;
              const store = useGameStore.getState();
              store.addScore(e.type === "triHound" ? 250 : 300);
              store.addCoins(e.type === "triHound" ? 4 : 5);
              SFX.enemyDie(store.volume);
            }
          },
        }));
    }

    useFrame((state, delta) => {
      const store = useGameStore.getState();
      if (store.gamePhase !== "playing") return;

      if (!initialized.current) {
        initialized.current = true;
        spawnInitialEnemies();
      }

      const heroPos = heroPosition.current;
      spawnTimer.current -= delta;

      if (spawnTimer.current <= 0) {
        waveNumber += 1;
        spawnTimer.current = 12;
        const types = getWaveSpawnTypes(waveNumber);
        const spawnCount = Math.min(2, types.length);
        for (let i = 0; i < spawnCount; i++) {
          enemies.current.push(createEnemy(types[i]));
        }
        SFX.waveStart(store.volume * 0.5);
      }

      for (const e of enemies.current) {
        e.animPhase += delta * 3;

        if (e.isDead) {
          e.fadeOut -= delta * 1.5;
          const mesh = meshes.current.get(e.id);
          if (mesh) {
            const s = Math.max(0, e.fadeOut);
            // tip over and shrink for skeleton crumble effect
            mesh.scale.setScalar(s);
            mesh.rotation.z = (1 - s) * 1.5;
          }
          continue;
        }

        const dist = e.position.distanceTo(heroPos);
        if (e.hp < e.maxHp * 0.3) {
          e.behaviorState = "retreat";
        } else if (dist <= (e.type === "triHound" ? 2.5 : 7)) {
          e.behaviorState = "attack";
        } else {
          e.behaviorState = "chase";
        }

        if (e.type === "triHound") {
          updateTriHound(e, heroPos, delta, store);
        } else {
          updateAlienDemon(e, heroPos, delta, state.scene, store);
        }

        // Animate alien demon wings
        if (e.type === "alienDemon") {
          const wings = wingRefs.current.get(e.id);
          if (wings) {
            const wScale = 0.8 + Math.abs(Math.sin(e.animPhase * 2)) * 0.4;
            if (wings[0]) wings[0].scale.y = wScale;
            if (wings[1]) wings[1].scale.y = wScale;
          }
        }

        const mesh = meshes.current.get(e.id);
        if (mesh) {
          mesh.position.copy(e.position);
          if (e.type === "triHound") {
            mesh.lookAt(heroPos.clone().setY(e.position.y));
          } else {
            const dir = heroPos.clone().sub(e.position).setY(0).normalize();
            if (dir.length() > 0.01) {
              mesh.rotation.y = Math.atan2(dir.x, dir.z);
            }
          }
        }
      }

      // Alien demon projectiles
      for (const e of enemies.current) {
        if (e.type === "alienDemon") {
          for (let i = e.projectiles.length - 1; i >= 0; i--) {
            const p = e.projectiles[i];
            p.mesh.position.addScaledVector(p.vel, delta);
            p.life -= delta;
            const distToHero = p.mesh.position.distanceTo(
              heroPos.clone().setY(p.mesh.position.y),
            );
            if (distToHero < 0.8) {
              store.damageHero(12);
              SFX.heroHit(store.volume);
              state.scene.remove(p.mesh);
              e.projectiles.splice(i, 1);
            } else if (p.life <= 0) {
              state.scene.remove(p.mesh);
              e.projectiles.splice(i, 1);
            }
          }
        }
      }

      enemies.current = enemies.current.filter(
        (e) => !e.isDead || e.fadeOut > 0,
      );
      onEnemiesUpdate(buildEnemyRefs());
    });

    function updateTriHound(
      e: EnemyState,
      heroPos: THREE.Vector3,
      delta: number,
      store: ReturnType<typeof useGameStore.getState>,
    ) {
      const dist = e.position.distanceTo(heroPos);

      if (e.behaviorState === "retreat") {
        const away = e.position
          .clone()
          .sub(heroPos)
          .normalize()
          .multiplyScalar(5 * delta);
        e.position.add(away);
        return;
      }

      e.pounceTimer -= delta;
      if (e.pounceTimer <= 0 && dist < 6 && dist > 2.5) {
        e.pounceTimer = 3 + Math.random() * 2;
        e.isPouncing = true;
      }
      if (e.isPouncing) {
        const lunge = heroPos
          .clone()
          .sub(e.position)
          .normalize()
          .multiplyScalar(14 * delta);
        e.position.add(lunge);
        if (dist < 2) e.isPouncing = false;
      } else if (dist > 2.2) {
        const toward = heroPos
          .clone()
          .sub(e.position)
          .normalize()
          .multiplyScalar(7 * delta);
        e.position.add(toward);
      }

      e.attackTimer -= delta;
      if (dist <= 2.8 && e.attackTimer <= 0) {
        e.attackTimer = 1.4;
        store.damageHero(18);
        SFX.houndBite(store.volume);
        SFX.heroHit(store.volume * 0.6);
      }

      e.position.x = Math.max(-22, Math.min(22, e.position.x));
      e.position.z = Math.max(-22, Math.min(22, e.position.z));
      e.position.y = 0;
    }

    function updateAlienDemon(
      e: EnemyState,
      heroPos: THREE.Vector3,
      delta: number,
      scene: THREE.Scene,
      store: ReturnType<typeof useGameStore.getState>,
    ) {
      const alienSpeed = 1.1;

      if (e.behaviorState === "retreat") {
        const away = e.position
          .clone()
          .sub(heroPos)
          .normalize()
          .multiplyScalar(5 * delta);
        e.position.add(away);
        return;
      }

      e.orbitAngle += delta * 0.9 * alienSpeed;
      const orbitRadius = 7;
      const targetX = heroPos.x + Math.cos(e.orbitAngle) * orbitRadius;
      const targetZ = heroPos.z + Math.sin(e.orbitAngle) * orbitRadius;
      e.position.x += (targetX - e.position.x) * 3.5 * delta;
      e.position.z += (targetZ - e.position.z) * 3.5 * delta;
      e.position.y = 0.8 + Math.sin(e.animPhase * 0.7) * 0.35;

      e.attackTimer -= delta;
      if (e.attackTimer <= 0) {
        e.attackTimer = 1.6;
        spawnAlienProjectile(e, heroPos, scene);
        SFX.demonShoot(store.volume);
      }
    }

    function spawnAlienProjectile(
      e: EnemyState,
      heroPos: THREE.Vector3,
      scene: THREE.Scene,
    ) {
      const geo = new THREE.SphereGeometry(0.22, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: "#00ccff",
        emissive: "#00ffff",
        emissiveIntensity: 4,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(e.position).add(new THREE.Vector3(0, 0.6, 0));
      const dir = heroPos
        .clone()
        .add(new THREE.Vector3(0, 0.9, 0))
        .sub(mesh.position)
        .normalize();
      const light = new THREE.PointLight("#00ffff", 2, 5);
      mesh.add(light);
      scene.add(mesh);
      e.projectiles.push({ mesh, vel: dir.multiplyScalar(11), life: 3.0 });
    }

    return (
      <group>
        {enemies.current.map((e) => (
          <EnemyMesh
            key={e.id}
            enemy={e}
            onRef={(g) => {
              if (g) meshes.current.set(e.id, g);
              else meshes.current.delete(e.id);
            }}
            onWingRef={(left, right) => {
              if (left || right) wingRefs.current.set(e.id, [left, right]);
              else wingRefs.current.delete(e.id);
            }}
          />
        ))}
      </group>
    );
  },
);

// ─── Skeleton Enemy (Three-Headed Hound) ────────────────────────────────────

function TriHoundMesh({ hpFrac }: { hpFrac: number }) {
  const boneMat = (
    <meshStandardMaterial
      color="#F5F0E8"
      roughness={0.7}
      emissive="#1a0033"
      emissiveIntensity={0.4}
    />
  );
  const eyeMat = (
    <meshStandardMaterial
      color="#ff0000"
      emissive="#ff0000"
      emissiveIntensity={6}
    />
  );

  return (
    <group>
      {/* ── Spine / Torso ── */}
      <mesh position={[0, 0.5, 0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.6, 8]} />
        {boneMat}
      </mesh>

      {/* ── Ribcage ── */}
      {(["rib0", "rib1", "rib2", "rib3"] as const).map((ribId, ri) => (
        <group key={ribId} position={[0, 0.42 + ri * 0.1, 0.2]}>
          <mesh position={[-0.22, 0, 0]} rotation={[0, 0, 0.4]} castShadow>
            <boxGeometry args={[0.28, 0.04, 0.06]} />
            {boneMat}
          </mesh>
          <mesh position={[0.22, 0, 0]} rotation={[0, 0, -0.4]} castShadow>
            <boxGeometry args={[0.28, 0.04, 0.06]} />
            {boneMat}
          </mesh>
        </group>
      ))}

      {/* ── Pelvis ── */}
      <mesh position={[0, 0.2, 0.2]} castShadow>
        <boxGeometry args={[0.36, 0.12, 0.18]} />
        {boneMat}
      </mesh>

      {/* ── 3 Skulls (center + left + right) ── */}
      {(
        [
          { id: "hc", x: 0, z: 0.65 },
          { id: "hl", x: -0.38, z: 0.45 },
          { id: "hr", x: 0.38, z: 0.45 },
        ] as { id: string; x: number; z: number }[]
      ).map(({ id, x, z }) => (
        <group key={id} position={[x, 0.85, z]}>
          {/* Skull */}
          <mesh castShadow>
            <sphereGeometry args={[0.2, 10, 8]} />
            {boneMat}
          </mesh>
          {/* Jaw */}
          <mesh position={[0, -0.14, 0.08]} castShadow>
            <boxGeometry args={[0.22, 0.1, 0.18]} />
            {boneMat}
          </mesh>
          {/* Glowing red eyes */}
          <mesh position={[-0.09, 0.04, 0.17]}>
            <sphereGeometry args={[0.055, 6, 6]} />
            {eyeMat}
          </mesh>
          <mesh position={[0.09, 0.04, 0.17]}>
            <sphereGeometry args={[0.055, 6, 6]} />
            {eyeMat}
          </mesh>
          {/* Neck connector */}
          <mesh position={[0, -0.28, -0.08]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 0.3, 6]} />
            {boneMat}
          </mesh>
        </group>
      ))}

      {/* ── 4 Bone Legs ── */}
      {(
        [
          { id: "lfl", x: -0.2, z: 0.3 },
          { id: "lfr", x: 0.2, z: 0.3 },
          { id: "lbl", x: -0.2, z: 0.1 },
          { id: "lbr", x: 0.2, z: 0.1 },
        ] as { id: string; x: number; z: number }[]
      ).map(({ id, x, z }) => (
        <group key={id} position={[x, 0.2, z]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.035, 0.3, 6]} />
            {boneMat}
          </mesh>
          <mesh position={[0, -0.34, 0.04]}>
            <sphereGeometry args={[0.05, 6, 6]} />
            {boneMat}
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.028, 0.28, 6]} />
            {boneMat}
          </mesh>
          <mesh position={[0, -0.67, 0.04]}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
            {boneMat}
          </mesh>
        </group>
      ))}

      {/* Bone arm stubs */}
      <mesh position={[-0.28, 0.56, 0.2]} rotation={[0, 0, 0.6]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.32, 6]} />
        {boneMat}
      </mesh>
      <mesh position={[0.28, 0.56, 0.2]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.32, 6]} />
        {boneMat}
      </mesh>

      {/* Supernatural glow */}
      <pointLight
        color="#cc0022"
        intensity={1.2}
        distance={5}
        position={[0, 0.8, 0]}
      />

      {/* HP bar */}
      <group position={[0, 1.8, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 0.1]} />
          <meshBasicMaterial color="#330000" />
        </mesh>
        <mesh position={[(hpFrac - 1) * 0.5, 0, 0.001]}>
          <planeGeometry args={[1.0 * hpFrac, 0.08]} />
          <meshBasicMaterial color="#ff3300" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Alien Demon Mesh ─────────────────────────────────────────────────────────

function AlienDemonMesh({
  hpFrac,
  onWingRef,
}: {
  hpFrac: number;
  onWingRef: (left: THREE.Mesh | null, right: THREE.Mesh | null) => void;
}) {
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  const setWingRefs = (l: THREE.Mesh | null, r: THREE.Mesh | null) => {
    leftWingRef.current = l;
    rightWingRef.current = r;
    onWingRef(l, r);
  };

  const boneMat = (
    <meshStandardMaterial
      color="#F5F0E8"
      roughness={0.7}
      emissive="#1a0033"
      emissiveIntensity={0.5}
    />
  );
  const eyeMat = (
    <meshStandardMaterial
      color="#ff0000"
      emissive="#ff0000"
      emissiveIntensity={7}
    />
  );
  const wingMat = (
    <meshStandardMaterial
      color="#1a0033"
      emissive="#4400aa"
      emissiveIntensity={0.7}
      side={THREE.DoubleSide}
      transparent
      opacity={0.78}
    />
  );

  return (
    <group>
      {/* ── Skull ── */}
      <mesh position={[0, 1.5, 0]} scale={[1, 1.2, 1]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        {boneMat}
      </mesh>
      {/* Jaw */}
      <mesh position={[0, 1.32, 0.08]} castShadow>
        <boxGeometry args={[0.22, 0.1, 0.16]} />
        {boneMat}
      </mesh>
      {/* Red glowing eyes */}
      <mesh position={[-0.09, 1.54, 0.17]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        {eyeMat}
      </mesh>
      <mesh position={[0.09, 1.54, 0.17]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        {eyeMat}
      </mesh>

      {/* ── Spine ── */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 0.65, 8]} />
        {boneMat}
      </mesh>

      {/* ── Ribcage ── */}
      {(["drib0", "drib1", "drib2"] as const).map((dribId, ri) => (
        <group key={dribId} position={[0, 1.05 + ri * 0.12, 0]}>
          <mesh position={[-0.2, 0, 0]} rotation={[0, 0, 0.5]}>
            <boxGeometry args={[0.24, 0.04, 0.08]} />
            {boneMat}
          </mesh>
          <mesh position={[0.2, 0, 0]} rotation={[0, 0, -0.5]}>
            <boxGeometry args={[0.24, 0.04, 0.08]} />
            {boneMat}
          </mesh>
        </group>
      ))}

      {/* ── Pelvis ── */}
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.16]} />
        {boneMat}
      </mesh>

      {/* ── Skeleton Arms ── */}
      <mesh position={[-0.28, 1.1, 0]} rotation={[0, 0, 0.7]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.38, 6]} />
        {boneMat}
      </mesh>
      <mesh position={[-0.48, 0.86, 0]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.033, 0.025, 0.34, 6]} />
        {boneMat}
      </mesh>
      <mesh position={[0.28, 1.1, 0]} rotation={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.04, 0.03, 0.38, 6]} />
        {boneMat}
      </mesh>
      <mesh position={[0.48, 0.86, 0]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.033, 0.025, 0.34, 6]} />
        {boneMat}
      </mesh>

      {/* ── Skeleton Legs ── */}
      <mesh position={[-0.1, 0.32, 0]} rotation={[0.1, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.055, 0.04, 0.44, 6]} />
        {boneMat}
      </mesh>
      <mesh
        position={[-0.1, -0.04, 0.04]}
        rotation={[-0.1, 0, 0.05]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.032, 0.4, 6]} />
        {boneMat}
      </mesh>
      <mesh position={[0.1, 0.32, 0]} rotation={[0.1, 0, -0.08]} castShadow>
        <cylinderGeometry args={[0.055, 0.04, 0.44, 6]} />
        {boneMat}
      </mesh>
      <mesh
        position={[0.1, -0.04, 0.04]}
        rotation={[-0.1, 0, -0.05]}
        castShadow
      >
        <cylinderGeometry args={[0.04, 0.032, 0.4, 6]} />
        {boneMat}
      </mesh>
      {/* Feet bones */}
      <mesh position={[-0.1, -0.28, 0.06]}>
        <boxGeometry args={[0.1, 0.06, 0.18]} />
        {boneMat}
      </mesh>
      <mesh position={[0.1, -0.28, 0.06]}>
        <boxGeometry args={[0.1, 0.06, 0.18]} />
        {boneMat}
      </mesh>

      {/* ── Wings ── animated via wingRefs */}
      <mesh
        ref={(el) => setWingRefs(el, rightWingRef.current)}
        position={[-1.2, 1.1, -0.15]}
        rotation={[0.15, 0.15, -0.45]}
        castShadow
      >
        <planeGeometry args={[2.2, 1.4]} />
        {wingMat}
      </mesh>
      <mesh
        ref={(el) => setWingRefs(leftWingRef.current, el)}
        position={[1.2, 1.1, -0.15]}
        rotation={[0.15, -0.15, 0.45]}
        castShadow
      >
        <planeGeometry args={[2.2, 1.4]} />
        {wingMat}
      </mesh>

      {/* Eerie bone glow */}
      <pointLight
        color="#aa00ff"
        intensity={0.9}
        distance={5}
        position={[0, 1, 0]}
      />

      {/* HP bar */}
      <group position={[0, 2.2, 0]}>
        <mesh>
          <planeGeometry args={[1.0, 0.1]} />
          <meshBasicMaterial color="#220033" />
        </mesh>
        <mesh position={[(hpFrac - 1) * 0.5, 0, 0.001]}>
          <planeGeometry args={[1.0 * hpFrac, 0.08]} />
          <meshBasicMaterial color="#aa00ff" />
        </mesh>
      </group>
    </group>
  );
}

// ─── Combined Enemy Mesh ──────────────────────────────────────────────────────

function EnemyMesh({
  enemy,
  onRef,
  onWingRef,
}: {
  enemy: EnemyState;
  onRef: (g: THREE.Group | null) => void;
  onWingRef: (left: THREE.Mesh | null, right: THREE.Mesh | null) => void;
}) {
  const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);

  if (enemy.type === "triHound") {
    return (
      <group
        ref={onRef}
        position={[enemy.position.x, enemy.position.y, enemy.position.z]}
      >
        <TriHoundMesh hpFrac={hpFrac} />
      </group>
    );
  }

  return (
    <group
      ref={onRef}
      position={[enemy.position.x, enemy.position.y, enemy.position.z]}
    >
      <AlienDemonMesh hpFrac={hpFrac} onWingRef={onWingRef} />
    </group>
  );
}
