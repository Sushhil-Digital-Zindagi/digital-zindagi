import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { type WeaponType, useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";
import { createFaceTexture } from "../utils/faceTexture";

interface HeroProps {
  onPositionChange: (pos: THREE.Vector3) => void;
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
}

const WEAPON_COOLDOWN: Record<WeaponType, number> = {
  rifle: 0.4,
  shotgun: 0.7,
  plasma: 1.2,
};

const WEAPON_DAMAGE: Record<WeaponType, number> = {
  rifle: 20,
  shotgun: 30,
  plasma: 45,
};

function getDamageMultiplier(): number {
  try {
    const until = Number(localStorage.getItem("dz_damage_boost_until") || "0");
    if (Date.now() < until) return 1.5;
  } catch {}
  return 1.0;
}

// Skin tone and clothing colors
const SKIN = "#C68642";
const SKIN_DARK = "#A0622A";
const TORSO_COLOR = "#1e3a1e"; // dark military olive
const PANTS_COLOR = "#1a1a1a";
const BOOT_COLOR = "#0a0a0a";
const SLEEVE_COLOR = "#2d4a1e"; // olive sleeve

export function Hero({ onPositionChange, keys, joystick }: HeroProps) {
  const { heroHP, heroMaxHP, heroFace, currentWeapon } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Mesh>(null);

  // Limb animation refs
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 0, 3));
  const [faceTexture, setFaceTexture] = useState<THREE.CanvasTexture | null>(
    null,
  );
  const attackCooldown = useRef(0);
  const isAttacking = useRef(false);
  const attackTime = useRef(0);
  const walkTime = useRef(0);
  const lastFaceRef = useRef<string | null>(null);

  useEffect(() => {
    const faceKey = heroFace || "default";
    if (lastFaceRef.current === faceKey) return;
    lastFaceRef.current = faceKey;
    createFaceTexture(heroFace, (tex) => setFaceTexture(tex));
  }, [heroFace]);

  // Stable face material using useMemo — only recreates when texture changes
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

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const store = useGameStore.getState();
    if (store.gamePhase !== "playing") return;

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

    const speed = 5;
    velocity.current.x = dx * speed;
    velocity.current.z = dz * speed;

    position.current.x += velocity.current.x * delta;
    position.current.z += velocity.current.z * delta;
    position.current.x = Math.max(-20, Math.min(20, position.current.x));
    position.current.z = Math.max(-20, Math.min(20, position.current.z));

    groupRef.current.position.copy(position.current);
    groupRef.current.position.y = 0;

    if (len > 0.01) {
      const angle = Math.atan2(dx, dz);
      groupRef.current.rotation.y = angle;
    }

    // Walk animation
    const isMoving = len > 0.01;
    if (isMoving) walkTime.current += delta * 8;

    const swing = isMoving ? Math.sin(walkTime.current) * 0.5 : 0;
    if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = swing;

    // Attack
    const weapon = store.currentWeapon;
    const cd = WEAPON_COOLDOWN[weapon];
    attackCooldown.current -= delta;

    if (ks.has("Space") && attackCooldown.current <= 0) {
      isAttacking.current = true;
      attackCooldown.current = cd;
      attackTime.current = 0;
      SFX.heroAttack(store.volume);
      window.dispatchEvent(new Event("dz_hero_attack"));
      const dmg = Math.round(WEAPON_DAMAGE[weapon] * getDamageMultiplier());
      localStorage.setItem("dz_weapon_dmg", String(dmg));
    }

    if (isAttacking.current && weaponRef.current) {
      attackTime.current += delta;
      const t = attackTime.current / 0.3;
      weaponRef.current.rotation.x = -Math.PI / 2 + t * Math.PI;
      if (attackTime.current >= 0.3) {
        isAttacking.current = false;
        weaponRef.current.rotation.x = 0;
      }
    }

    onPositionChange(position.current.clone());
  });

  const hpFraction = heroHP / heroMaxHP;

  return (
    <group ref={groupRef} position={[0, 0, 3]}>
      {/* ── HEAD ── */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <primitive object={headMaterial} attach="material" />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.26, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
      </mesh>
      <mesh position={[0.26, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={SKIN_DARK} roughness={0.6} />
      </mesh>

      {/* ── NECK ── */}
      <mesh position={[0, 1.38, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.2, 10]} />
        <meshStandardMaterial color={SKIN} roughness={0.5} />
      </mesh>

      {/* ── TORSO ── */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.28]} />
        <meshStandardMaterial
          color={TORSO_COLOR}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Chest plate detail */}
      <mesh position={[0, 1.1, 0.145]} castShadow>
        <boxGeometry args={[0.36, 0.45, 0.04]} />
        <meshStandardMaterial color="#0d2610" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* Shoulder pads */}
      <mesh position={[-0.32, 1.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.24]} />
        <meshStandardMaterial color="#0f3018" metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0.32, 1.35, 0]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.24]} />
        <meshStandardMaterial color="#0f3018" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* ── LEFT ARM ── */}
      <group ref={leftArmRef} position={[-0.34, 1.25, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -0.14, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.28, 8]} />
          <meshStandardMaterial color={SLEEVE_COLOR} roughness={0.7} />
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        {/* Lower arm */}
        <mesh position={[0, -0.46, 0]} castShadow>
          <cylinderGeometry args={[0.063, 0.055, 0.28, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.64, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
      </group>

      {/* ── RIGHT ARM (holds weapon) ── */}
      <group ref={rightArmRef} position={[0.34, 1.25, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -0.14, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.28, 8]} />
          <meshStandardMaterial color={SLEEVE_COLOR} roughness={0.7} />
        </mesh>
        {/* Elbow joint */}
        <mesh position={[0, -0.3, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        {/* Lower arm */}
        <mesh position={[0, -0.46, 0]} castShadow>
          <cylinderGeometry args={[0.063, 0.055, 0.28, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.64, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>

        {/* ── WEAPON attached to right hand ── */}
        <group position={[0.08, -0.68, 0.1]} rotation={[-0.3, 0, 0]}>
          {currentWeapon === "rifle" && (
            <mesh ref={weaponRef} castShadow>
              <boxGeometry args={[0.08, 0.08, 0.7]} />
              <meshStandardMaterial
                color="#2a2a2a"
                metalness={0.85}
                roughness={0.2}
              />
            </mesh>
          )}

          {currentWeapon === "shotgun" && (
            <group ref={weaponRef}>
              <mesh castShadow>
                <boxGeometry args={[0.13, 0.12, 0.52]} />
                <meshStandardMaterial
                  color="#3a2010"
                  metalness={0.6}
                  roughness={0.4}
                />
              </mesh>
              <mesh position={[0, -0.1, 0.05]} castShadow>
                <boxGeometry args={[0.08, 0.06, 0.18]} />
                <meshStandardMaterial
                  color="#5a3020"
                  metalness={0.3}
                  roughness={0.7}
                />
              </mesh>
            </group>
          )}

          {currentWeapon === "plasma" && (
            <group ref={weaponRef}>
              <mesh castShadow>
                <sphereGeometry args={[0.14, 12, 12]} />
                <meshStandardMaterial
                  color="#001a33"
                  metalness={0.9}
                  roughness={0.1}
                  emissive="#0088cc"
                  emissiveIntensity={1.5}
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial
                  color="#00c8ff"
                  emissive="#00c8ff"
                  emissiveIntensity={4}
                />
              </mesh>
              <pointLight color="#00c8ff" intensity={2} distance={5} />
            </group>
          )}

          {!["rifle", "shotgun", "plasma"].includes(currentWeapon) && (
            <mesh ref={weaponRef} castShadow>
              <boxGeometry args={[0.07, 0.07, 0.65]} />
              <meshStandardMaterial
                color="#1a5a30"
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
          )}
        </group>
      </group>

      {/* ── BELT / WAIST ── */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[0.52, 0.1, 0.3]} />
        <meshStandardMaterial color="#0d0d0d" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* ── LEFT LEG ── */}
      <group ref={leftLegRef} position={[-0.14, 0.6, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.085, 0.44, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Knee */}
        <mesh position={[0, -0.46, 0]} castShadow>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Lower leg */}
        <mesh position={[0, -0.65, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.07, 0.38, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.88, 0.03]} castShadow>
          <boxGeometry args={[0.14, 0.14, 0.22]} />
          <meshStandardMaterial
            color={BOOT_COLOR}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* ── RIGHT LEG ── */}
      <group ref={rightLegRef} position={[0.14, 0.6, 0]}>
        {/* Upper leg */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.085, 0.44, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Knee */}
        <mesh position={[0, -0.46, 0]} castShadow>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Lower leg */}
        <mesh position={[0, -0.65, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.07, 0.38, 8]} />
          <meshStandardMaterial color={PANTS_COLOR} roughness={0.8} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.88, 0.03]} castShadow>
          <boxGeometry args={[0.14, 0.14, 0.22]} />
          <meshStandardMaterial
            color={BOOT_COLOR}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* ── HP BAR ── */}
      <group position={[0, 2.1, 0]}>
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
  );
}
