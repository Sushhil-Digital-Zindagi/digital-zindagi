import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { CoinManager } from "./entities/CoinManager";
import { EnemyManager, type EnemyRef } from "./entities/EnemyManager";
import {
  BuildingWall,
  BurningVehicles,
  CityRuins,
  Debris,
  GiantDZLogo,
  Ground,
  SceneLighting,
  Skeletons,
} from "./entities/Environment";
import { Hero } from "./entities/Hero";
import { Partners } from "./entities/Partners";
import { useGameStore } from "./stores/gameStore";

interface GameSceneProps {
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
}

function CameraFollow({
  target,
}: { target: React.MutableRefObject<THREE.Vector3> }) {
  const camPos = useRef(new THREE.Vector3(0, 8, 14));
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const hero = target.current;
    const desired = new THREE.Vector3(hero.x, hero.y + 8, hero.z + 14);
    camPos.current.lerp(desired, 8 * delta);
    camTarget.current.lerp(
      new THREE.Vector3(hero.x, hero.y + 1, hero.z),
      10 * delta,
    );
    state.camera.position.copy(camPos.current);
    state.camera.lookAt(camTarget.current);
  });

  return null;
}

/**
 * GameScene is ALWAYS mounted (never conditionally unmounted).
 * Entities check gamePhase themselves via useGameStore.getState().
 * This prevents the crash loop caused by Canvas/Scene re-initialization.
 */
export function GameScene({ keys, joystick }: GameSceneProps) {
  const heroPosition = useRef(new THREE.Vector3(0, 0, 3));
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
      <CameraFollow target={heroPosition} />

      {/* Environment — always visible (atmospheric background) */}
      <Ground />
      <Debris />
      <Skeletons />
      <BurningVehicles />
      <BuildingWall />
      <CityRuins />
      <GiantDZLogo />

      {/* Gameplay entities */}
      <Hero
        onPositionChange={handleHeroPositionChange}
        keys={keys}
        joystick={joystick}
      />

      <Partners heroPosition={heroPosition} enemyPositions={enemyRefs} />

      <EnemyManager
        heroPosition={heroPosition}
        onEnemiesUpdate={handleEnemiesUpdate}
      />

      <CoinManager heroPosition={heroPosition} />
    </>
  );
}
