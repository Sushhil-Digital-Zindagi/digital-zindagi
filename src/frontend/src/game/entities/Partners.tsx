import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as ReactTypes from "react";
import * as THREE from "three";
import { useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";

type EnemyEntry = {
  id: string;
  position: THREE.Vector3;
  applyDamage: (dmg: number) => void;
};

interface PartnersProps {
  heroPosition: ReactTypes.MutableRefObject<THREE.Vector3>;
  enemyPositions: ReactTypes.MutableRefObject<EnemyEntry[]>;
}

export function Partners({ heroPosition, enemyPositions }: PartnersProps) {
  return (
    <group>
      <Partner
        index={0}
        color="#1a3a6a"
        emissiveColor="#2244aa"
        partnerRole="warrior"
        heroPosition={heroPosition}
        enemyPositions={enemyPositions}
        offsetX={-3}
      />
      <Partner
        index={1}
        color="#3a1a5a"
        emissiveColor="#6622aa"
        partnerRole="mage"
        heroPosition={heroPosition}
        enemyPositions={enemyPositions}
        offsetX={3}
      />
    </group>
  );
}

interface PartnerProps {
  index: 0 | 1;
  color: string;
  emissiveColor: string;
  partnerRole: "warrior" | "mage";
  heroPosition: ReactTypes.MutableRefObject<THREE.Vector3>;
  enemyPositions: ReactTypes.MutableRefObject<EnemyEntry[]>;
  offsetX: number;
}

function Partner({
  index,
  color,
  emissiveColor,
  partnerRole: role,
  heroPosition,
  enemyPositions,
  offsetX,
}: PartnerProps) {
  const { partnerHP, partnerMaxHP, setPartnerHP } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(offsetX, 0, 4));
  const attackCooldown = useRef(Math.random() * 2);
  const regenTimer = useRef(0);
  const lastAttacked = useRef(0);
  const projectiles = useRef<
    Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }>
  >([]);

  const hpFraction = partnerHP[index] / partnerMaxHP;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const store = useGameStore.getState();
    if (store.gamePhase !== "playing") return;

    // Follow hero with flocking offset
    const heroPos = heroPosition.current;
    const target = new THREE.Vector3(heroPos.x + offsetX, 0, heroPos.z + 2);

    // Find nearest enemy
    let nearestEnemy: EnemyEntry | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const e of enemyPositions.current) {
      const d = position.current.distanceTo(e.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = e;
      }
    }

    // Move: rush enemy if in range, else follow hero
    const attackRange = role === "warrior" ? 8 : 12;
    if (nearestEnemy && nearestDist < attackRange) {
      const dir = nearestEnemy.position
        .clone()
        .sub(position.current)
        .normalize();
      const stopDist = role === "warrior" ? 2.5 : 6;
      if (nearestDist > stopDist) {
        position.current.addScaledVector(dir, 4 * delta);
      }
      groupRef.current.lookAt(nearestEnemy.position.clone().setY(0));
    } else {
      const diff = target.clone().sub(position.current);
      if (diff.length() > 0.5) {
        diff.normalize().multiplyScalar(4 * delta);
        position.current.add(diff);
      }
    }
    position.current.x = Math.max(-20, Math.min(20, position.current.x));
    position.current.z = Math.max(-20, Math.min(20, position.current.z));
    groupRef.current.position.copy(position.current);

    // Attack
    attackCooldown.current -= delta;
    if (
      nearestEnemy &&
      nearestDist < attackRange &&
      attackCooldown.current <= 0
    ) {
      const cooldown = role === "warrior" ? 1.5 : 2.0;
      attackCooldown.current = cooldown;
      const dmg = role === "warrior" ? 18 : 12;
      if (role === "warrior") {
        nearestEnemy.applyDamage(dmg);
        SFX.heroAttack(store.volume * 0.5);
      } else {
        // Shoot projectile
        spawnProjectile(nearestEnemy, state.scene, store.volume);
        SFX.demonShoot(store.volume * 0.4);
      }
    }

    // Update projectiles
    for (let i = projectiles.current.length - 1; i >= 0; i--) {
      const p = projectiles.current[i];
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.life -= delta;
      if (p.life <= 0) {
        state.scene.remove(p.mesh);
        projectiles.current.splice(i, 1);
      }
    }

    // HP regeneration
    lastAttacked.current += delta;
    if (lastAttacked.current > 3) {
      regenTimer.current += delta;
      if (regenTimer.current > 1) {
        regenTimer.current = 0;
        const hp = store.partnerHP[index];
        if (hp < store.partnerMaxHP) {
          setPartnerHP(index, hp + 5);
        }
      }
    }
  });

  function spawnProjectile(
    enemy: (typeof enemyPositions.current)[0],
    scene: THREE.Scene,
    volume: number,
  ) {
    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: "#8833ff",
      emissive: "#9944ff",
      emissiveIntensity: 3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position.current).add(new THREE.Vector3(0, 1.2, 0));
    const dir = enemy.position
      .clone()
      .add(new THREE.Vector3(0, 0.8, 0))
      .sub(mesh.position)
      .normalize();
    const vel = dir.multiplyScalar(12);
    scene.add(mesh);
    projectiles.current.push({ mesh, velocity: vel, life: 2.0 });

    // Check hit after brief delay
    const eRef = enemy;
    setTimeout(() => {
      eRef.applyDamage(12);
      SFX.projectileHit(volume * 0.4);
    }, 300);
  }

  return (
    <group ref={groupRef} position={[offsetX, 0, 4]}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.9, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <sphereGeometry args={[0.24, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Role weapon */}
      {role === "warrior" ? (
        <mesh position={[0.35, 1.1, 0]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.08, 1.2, 0.08]} />
          <meshStandardMaterial
            color="#6688cc"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ) : (
        <group position={[0.35, 1.3, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial
              color="#aa44ff"
              emissive="#9944ff"
              emissiveIntensity={4}
            />
          </mesh>
          <pointLight color="#8833ff" intensity={1} distance={5} />
        </group>
      )}
      {/* Glow aura */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial
          color={emissiveColor}
          emissive={emissiveColor}
          emissiveIntensity={0.4}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>

      {/* HP bar */}
      <group position={[0, 2.3, 0]}>
        <mesh>
          <planeGeometry args={[0.7, 0.09]} />
          <meshBasicMaterial color="#220000" />
        </mesh>
        <mesh position={[(hpFraction - 1) * 0.35, 0, 0.001]}>
          <planeGeometry args={[0.7 * hpFraction, 0.07]} />
          <meshBasicMaterial
            color={role === "warrior" ? "#2244ff" : "#9944ff"}
          />
        </mesh>
      </group>
    </group>
  );
}
