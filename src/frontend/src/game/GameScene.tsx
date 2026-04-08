import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { CoinManager } from "./entities/CoinManager";
import { EnemyManager, type EnemyRef } from "./entities/EnemyManager";
import {
  Ground,
  IndustrialDebris,
  IndustrialWalls,
  NeonDZLogo,
  SceneLighting,
} from "./entities/Environment";
import { Hero } from "./entities/Hero";

interface GameSceneProps {
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
}

/**
 * Isometric camera — smoothly pans to keep hero centered.
 */
function IsometricCameraFollow({
  target,
}: { target: React.MutableRefObject<THREE.Vector3> }) {
  const OFFSET = new THREE.Vector3(0, 15, 12);
  const smoothPos = useRef(new THREE.Vector3(0, 15, 12));
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const heroPos = target.current;
    const desired = heroPos.clone().add(OFFSET);
    smoothPos.current.lerp(desired, Math.min(1, 6 * delta));
    smoothLook.current.lerp(
      heroPos.clone().add(new THREE.Vector3(0, 0.5, 0)),
      Math.min(1, 6 * delta),
    );
    state.camera.position.copy(smoothPos.current);
    state.camera.lookAt(smoothLook.current);
  });

  return null;
}

/**
 * GameScene — Isometric Alien Shooter
 * Always mounted. Entities check gamePhase internally.
 */
export function GameScene({ keys, joystick }: GameSceneProps) {
  const heroPosition = useRef(new THREE.Vector3(0, 0, 0));
  const enemyRefs = useRef<EnemyRef[]>([]);

  const handleHeroPositionChange = useCallback((pos: THREE.Vector3) => {
    heroPosition.current.copy(pos);
  }, []);

  const handleEnemiesUpdate = useCallback((refs: EnemyRef[]) => {
    enemyRefs.current = refs;
  }, []);

  return (
    <>
      <SceneLighting />
      <IsometricCameraFollow target={heroPosition} />

      {/* Environment — industrial dark lab */}
      <Ground />
      <IndustrialWalls />
      <IndustrialDebris />
      <NeonDZLogo />

      {/* Gameplay */}
      <Hero
        onPositionChange={handleHeroPositionChange}
        keys={keys}
        joystick={joystick}
        enemyRefs={enemyRefs}
      />

      <EnemyManager
        heroPosition={heroPosition}
        onEnemiesUpdate={handleEnemiesUpdate}
      />

      <CoinManager heroPosition={heroPosition} />
    </>
  );
}
