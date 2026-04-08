import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type WeaponType, useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";
import { createFaceTexture } from "../utils/faceTexture";
import type { EnemyRef } from "./EnemyManager";

interface HeroProps {
  onPositionChange: (pos: THREE.Vector3) => void;
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
  enemyRefs: React.MutableRefObject<EnemyRef[]>;
}

const WEAPON_COOLDOWN: Record<WeaponType, number> = {
  rifle: 0.35,
  shotgun: 0.65,
  plasma: 1.1,
};

const WEAPON_DAMAGE: Record<WeaponType, number> = {
  rifle: 22,
  shotgun: 35,
  plasma: 50,
};

const PLASMA_RADIUS = 3.5;

const SKIN = "#C68642";
const TORSO_COLOR = "#1e3a1e";
const PANTS_COLOR = "#1a1a1a";
const BOOT_COLOR = "#0a0a0a";
const SLEEVE_COLOR = "#2d4a1e";

// Bullet visual
interface BulletData {
  id: number;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  weapon: WeaponType;
}

let bulletId = 0;

export function Hero({
  onPositionChange,
  keys,
  joystick,
  enemyRefs,
}: HeroProps) {
  const { heroHP, heroMaxHP, heroFace, currentWeapon } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const weaponGroupRef = useRef<THREE.Group>(null);

  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const bullets = useRef<BulletData[]>([]);
  const bulletGroup = useRef<THREE.Group>(null);
  const attackCooldown = useRef(0);
  const walkTime = useRef(0);
  const lastFaceRef = useRef<string | null>(null);

  const [faceTexture, setFaceTexture] = useState<THREE.CanvasTexture | null>(
    null,
  );

  useEffect(() => {
    const faceKey = heroFace || "default";
    if (lastFaceRef.current === faceKey) return;
    lastFaceRef.current = faceKey;
    createFaceTexture(heroFace, (tex) => setFaceTexture(tex));
  }, [heroFace]);

  const headMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: faceTexture ?? undefined,
        color: faceTexture ? "#ffffff" : SKIN,
        roughness: 0.5,
        metalness: 0.05,
      }),
    [faceTexture],
  );

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const store = useGameStore.getState();
    if (store.gamePhase !== "playing") return;

    // ── Movement ──
    const ks = keys.current;
    const joy = joystick.current;
    let dx = joy.x;
    let dz = joy.y;
    if (ks.has("KeyW") || ks.has("ArrowUp")) dz -= 1;
    if (ks.has("KeyS") || ks.has("ArrowDown")) dz += 1;
    if (ks.has("KeyA") || ks.has("ArrowLeft")) dx -= 1;
    if (ks.has("KeyD") || ks.has("ArrowRight")) dx += 1;

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 1) {
      dx /= len;
      dz /= len;
    }

    const speed = 5.5;
    velocity.current.x = dx * speed;
    velocity.current.z = dz * speed;

    const BOUND = 22;
    position.current.x = Math.max(
      -BOUND,
      Math.min(BOUND, position.current.x + velocity.current.x * delta),
    );
    position.current.z = Math.max(
      -BOUND,
      Math.min(BOUND, position.current.z + velocity.current.z * delta),
    );

    groupRef.current.position.set(position.current.x, 0, position.current.z);

    // ── Face nearest enemy ──
    const enemies = enemyRefs.current.filter((e) => !e.isDead);
    let nearestEnemy: EnemyRef | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const e of enemies) {
      const d = position.current.distanceTo(e.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = e;
      }
    }

    if (nearestEnemy) {
      const dir = nearestEnemy.position.clone().sub(position.current).setY(0);
      if (dir.length() > 0.1) {
        groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
      }
    } else if (len > 0.01) {
      groupRef.current.rotation.y = Math.atan2(dx, dz);
    }

    // Walk animation
    const isMoving = len > 0.01;
    if (isMoving) walkTime.current += delta * 8;
    const swing = isMoving ? Math.sin(walkTime.current) * 0.45 : 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing;

    // ── Auto-fire toward nearest enemy ──
    attackCooldown.current -= delta;
    const weapon = store.currentWeapon;
    const cd = WEAPON_COOLDOWN[weapon];
    const shouldFire =
      nearestEnemy && nearestDist < 26 && attackCooldown.current <= 0;

    if (shouldFire && nearestEnemy) {
      attackCooldown.current = cd;
      SFX.heroAttack(store.volume * 0.7);

      const dmg = WEAPON_DAMAGE[weapon];
      const firePos = position.current
        .clone()
        .add(new THREE.Vector3(0, 1.2, 0));
      const fireDir = nearestEnemy.position
        .clone()
        .add(new THREE.Vector3(0, 0.8, 0))
        .sub(firePos)
        .normalize();

      if (weapon === "plasma") {
        // AoE — damage all nearby
        for (const e of enemies) {
          if (e.position.distanceTo(position.current) < PLASMA_RADIUS) {
            e.applyDamage(dmg);
          }
        }
        spawnBullet(state.scene, firePos, fireDir, weapon);
      } else if (weapon === "shotgun") {
        // Multi-pellet spread
        for (let i = -2; i <= 2; i++) {
          const spread = fireDir.clone();
          spread.x += i * 0.1;
          spread.z += (Math.random() - 0.5) * 0.1;
          spread.normalize();
          spawnBullet(state.scene, firePos, spread, weapon);
        }
        nearestEnemy.applyDamage(dmg);
      } else {
        // Rifle — single accurate shot
        nearestEnemy.applyDamage(dmg);
        spawnBullet(state.scene, firePos, fireDir, weapon);
      }

      // Also process Space key manual attacks
      window.dispatchEvent(new Event("dz_hero_attack"));
    }

    // Process Space key for manual override
    if (ks.has("Space") && attackCooldown.current <= 0 && nearestEnemy) {
      attackCooldown.current = cd;
      SFX.heroAttack(store.volume * 0.7);
      nearestEnemy.applyDamage(WEAPON_DAMAGE[weapon]);
    }

    // ── Update bullets ──
    if (bulletGroup.current) {
      for (let i = bullets.current.length - 1; i >= 0; i--) {
        const b = bullets.current[i];
        b.mesh.position.addScaledVector(b.velocity, delta);
        b.life -= delta;

        if (b.weapon === "plasma") {
          const s = 0.5 + Math.abs(Math.sin(b.life * 10)) * 0.3;
          b.mesh.scale.setScalar(s);
        }

        if (b.life <= 0) {
          state.scene.remove(b.mesh);
          bullets.current.splice(i, 1);
        }
      }
    }

    onPositionChange(position.current.clone());
  });

  function spawnBullet(
    scene: THREE.Scene,
    from: THREE.Vector3,
    dir: THREE.Vector3,
    weapon: WeaponType,
  ) {
    let geo: THREE.BufferGeometry;
    let mat: THREE.MeshStandardMaterial;
    let speed: number;
    let life: number;

    if (weapon === "plasma") {
      geo = new THREE.SphereGeometry(0.3, 8, 8);
      mat = new THREE.MeshStandardMaterial({
        color: "#00aaff",
        emissive: "#0088ff",
        emissiveIntensity: 6,
        transparent: true,
        opacity: 0.9,
      });
      speed = 18;
      life = 1.2;
    } else if (weapon === "shotgun") {
      geo = new THREE.SphereGeometry(0.12, 5, 5);
      mat = new THREE.MeshStandardMaterial({
        color: "#ff8800",
        emissive: "#ff6600",
        emissiveIntensity: 4,
      });
      speed = 22;
      life = 0.5;
    } else {
      geo = new THREE.SphereGeometry(0.08, 5, 5);
      mat = new THREE.MeshStandardMaterial({
        color: "#ffff00",
        emissive: "#ffdd00",
        emissiveIntensity: 5,
      });
      speed = 28;
      life = 0.8;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    scene.add(mesh);

    bullets.current.push({
      id: ++bulletId,
      mesh,
      velocity: dir.multiplyScalar(speed),
      life,
      weapon,
    });
  }

  const hpFraction = heroHP / heroMaxHP;

  return (
    <>
      <group ref={bulletGroup} />
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* HEAD */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <primitive object={headMaterial} attach="material" />
        </mesh>

        {/* NECK */}
        <mesh position={[0, 1.38, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.2, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>

        {/* TORSO */}
        <mesh position={[0, 1.05, 0]} castShadow>
          <boxGeometry args={[0.5, 0.7, 0.28]} />
          <meshStandardMaterial
            color={TORSO_COLOR}
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {/* Chest plate */}
        <mesh position={[0, 1.1, 0.145]} castShadow>
          <boxGeometry args={[0.36, 0.45, 0.04]} />
          <meshStandardMaterial
            color="#0d2610"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>

        {/* LEFT ARM */}
        <group ref={leftArmRef} position={[-0.34, 1.25, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.06, 0.5, 8]} />
            <meshStandardMaterial color={SLEEVE_COLOR} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>
        </group>

        {/* RIGHT ARM (weapon hand) */}
        <group ref={rightArmRef} position={[0.34, 1.25, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.06, 0.5, 8]} />
            <meshStandardMaterial color={SLEEVE_COLOR} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.5, 0]} castShadow>
            <sphereGeometry args={[0.065, 8, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.5} />
          </mesh>

          {/* WEAPON */}
          <group
            ref={weaponGroupRef}
            position={[0.1, -0.6, 0.15]}
            rotation={[-0.3, 0, 0]}
          >
            {currentWeapon === "rifle" && (
              <group>
                {/* AK-47 style */}
                <mesh castShadow>
                  <boxGeometry args={[0.07, 0.07, 0.75]} />
                  <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.9}
                    roughness={0.15}
                  />
                </mesh>
                <mesh position={[0, -0.04, 0.12]} castShadow>
                  <boxGeometry args={[0.06, 0.05, 0.22]} />
                  <meshStandardMaterial color="#2a1a10" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.07, 0.28]} castShadow>
                  <boxGeometry args={[0.04, 0.04, 0.16]} />
                  <meshStandardMaterial
                    color="#111"
                    metalness={0.95}
                    roughness={0.1}
                  />
                </mesh>
                {/* Muzzle flash */}
                <MuzzleFlash offset={[0, 0, 0.42]} weapon="rifle" />
              </group>
            )}
            {currentWeapon === "shotgun" && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.12, 0.1, 0.55]} />
                  <meshStandardMaterial
                    color="#3a2010"
                    metalness={0.5}
                    roughness={0.5}
                  />
                </mesh>
                <mesh position={[0, -0.08, 0.08]} castShadow>
                  <boxGeometry args={[0.08, 0.06, 0.2]} />
                  <meshStandardMaterial color="#5a3020" roughness={0.7} />
                </mesh>
                <MuzzleFlash offset={[0, 0, 0.3]} weapon="shotgun" />
              </group>
            )}
            {currentWeapon === "plasma" && (
              <group>
                <mesh castShadow>
                  <cylinderGeometry args={[0.09, 0.05, 0.6, 10]} />
                  <meshStandardMaterial
                    color="#001a33"
                    metalness={0.9}
                    roughness={0.1}
                    emissive="#0055aa"
                    emissiveIntensity={1}
                  />
                </mesh>
                <mesh castShadow>
                  <sphereGeometry args={[0.12, 10, 10]} />
                  <meshStandardMaterial
                    color="#00c8ff"
                    emissive="#00c8ff"
                    emissiveIntensity={5}
                  />
                </mesh>
                <pointLight color="#00c8ff" intensity={2} distance={5} />
              </group>
            )}
          </group>
        </group>

        {/* BELT */}
        <mesh position={[0, 0.68, 0]} castShadow>
          <boxGeometry args={[0.52, 0.1, 0.3]} />
          <meshStandardMaterial
            color="#0d0d0d"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>

        {/* LEFT LEG */}
        <group ref={leftLegRef} position={[-0.14, 0.6, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.085, 0.52, 8]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.6, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.07, 0.42, 8]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.84, 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.22]} />
            <meshStandardMaterial color={BOOT_COLOR} roughness={0.7} />
          </mesh>
        </group>

        {/* RIGHT LEG */}
        <group ref={rightLegRef} position={[0.14, 0.6, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.085, 0.52, 8]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.6, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.07, 0.42, 8]} />
            <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.84, 0.04]} castShadow>
            <boxGeometry args={[0.14, 0.14, 0.22]} />
            <meshStandardMaterial color={BOOT_COLOR} roughness={0.7} />
          </mesh>
        </group>

        {/* Shadow indicator on floor */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.45, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>

        {/* HP bar above head */}
        <group position={[0, 2.2, 0]}>
          <mesh>
            <planeGeometry args={[0.8, 0.1]} />
            <meshBasicMaterial color="#330000" />
          </mesh>
          <mesh position={[(hpFraction - 1) * 0.4, 0, 0.001]}>
            <planeGeometry args={[0.8 * hpFraction, 0.08]} />
            <meshBasicMaterial
              color={
                hpFraction > 0.5
                  ? "#00ff44"
                  : hpFraction > 0.25
                    ? "#ffaa00"
                    : "#ff2200"
              }
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

// ─── Muzzle Flash ─────────────────────────────────────────────────────────────

function MuzzleFlash({
  offset,
  weapon,
}: { offset: [number, number, number]; weapon: WeaponType }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const store = useGameStore.getState();
    if (store.gamePhase !== "playing") {
      meshRef.current.visible = false;
      return;
    }
    t.current += delta * 20;
    const flash = (Math.sin(t.current) + 1) / 2;
    meshRef.current.visible = flash > 0.6;
    meshRef.current.scale.setScalar(0.5 + flash * 0.8);
  });

  const color =
    weapon === "plasma"
      ? "#00ccff"
      : weapon === "shotgun"
        ? "#ff6600"
        : "#ffff00";

  return (
    <mesh ref={meshRef} position={offset}>
      <sphereGeometry args={[0.1, 6, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={8}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}
