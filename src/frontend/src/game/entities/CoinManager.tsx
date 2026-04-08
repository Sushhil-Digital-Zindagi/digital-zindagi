import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";

interface CoinData {
  id: string;
  position: THREE.Vector3;
  type: "normal" | "mega";
  collected: boolean;
  bobOffset: number;
  spinOffset: number;
  spawnTimer?: number; // for mega coins
}

let coinId = 0;

function randomCoinPosition(): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const r = 2 + Math.random() * 14;
  return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r - 3);
}

export function CoinManager({
  heroPosition,
}: {
  heroPosition: React.MutableRefObject<THREE.Vector3>;
}) {
  const { addCoins, addScore } = useGameStore();

  const coins = useRef<CoinData[]>([]);
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const megaSpawnTimer = useRef(0);
  const initialized = useRef(false);

  // Static coin positions (seeded)
  const initialCoins = useMemo(() => {
    const arr: CoinData[] = [];
    for (let i = 0; i < 25; i++) {
      arr.push({
        id: `coin-${++coinId}`,
        position: randomCoinPosition(),
        type: "normal",
        collected: false,
        bobOffset: Math.random() * Math.PI * 2,
        spinOffset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const store = useGameStore.getState();
    if (store.gamePhase !== "playing") return;

    if (!initialized.current) {
      initialized.current = true;
      coins.current = [...initialCoins];
    }

    const t = Date.now() * 0.001;
    const heroPos = heroPosition.current;

    // Mega coin spawn
    megaSpawnTimer.current -= delta;
    if (megaSpawnTimer.current <= 0) {
      megaSpawnTimer.current = 25;
      for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
        coins.current.push({
          id: `mega-${++coinId}`,
          position: randomCoinPosition(),
          type: "mega",
          collected: false,
          bobOffset: Math.random() * Math.PI * 2,
          spinOffset: Math.random() * Math.PI * 2,
          spawnTimer: 15,
        });
      }
    }

    for (const coin of coins.current) {
      if (coin.collected) continue;

      // Mega coin timeout
      if (coin.type === "mega" && coin.spawnTimer !== undefined) {
        coin.spawnTimer -= delta;
        if (coin.spawnTimer <= 0) {
          coin.collected = true;
          const m = meshRefs.current.get(coin.id);
          if (m) m.visible = false;
          continue;
        }
      }

      const mesh = meshRefs.current.get(coin.id);
      if (!mesh) continue;

      // Bob animation
      const bob = Math.sin(t * 2.5 + coin.bobOffset) * 0.15;
      const baseY = coin.type === "mega" ? 0.6 : 0.35;
      mesh.position.y = baseY + bob;

      // Spin animation
      mesh.rotation.y = t * (coin.type === "mega" ? 3 : 2) + coin.spinOffset;

      // Collection check
      const coinWorldPos = coin.position.clone();
      coinWorldPos.y = heroPos.y;
      const dist = heroPos.distanceTo(coinWorldPos);
      const collectRadius = coin.type === "mega" ? 2.5 : 2.0;

      if (dist < collectRadius) {
        coin.collected = true;
        mesh.visible = false;
        const value = coin.type === "mega" ? 5 : 1;
        addCoins(value);
        addScore(coin.type === "mega" ? 100 : 25);
        if (coin.type === "mega") {
          SFX.megaCoinCollect(store.volume);
        } else {
          SFX.coinCollect(store.volume);
        }
      }
    }

    // Remove fully collected coins from array periodically
    if (coins.current.filter((c) => c.collected).length > 15) {
      coins.current = coins.current.filter((c) => !c.collected);
    }
  });

  return (
    <group>
      {initialCoins.map((coin) => (
        <CoinMesh
          key={coin.id}
          coin={coin}
          onRef={(m) => {
            if (m) meshRefs.current.set(coin.id, m);
            else meshRefs.current.delete(coin.id);
          }}
        />
      ))}
      {/* Mega coins are spawned dynamically — we render a pool */}
      {Array.from({ length: 8 }, (_, i) => `mega-pool-${i}`).map((id) => (
        <CoinMesh
          key={id}
          coin={{
            id,
            position: new THREE.Vector3(999, 0, 999),
            type: "mega",
            collected: true,
            bobOffset: 0,
            spinOffset: 0,
          }}
          onRef={(m) => {
            if (m) meshRefs.current.set(id, m);
            else meshRefs.current.delete(id);
          }}
        />
      ))}
    </group>
  );
}

function CoinMesh({
  coin,
  onRef,
}: {
  coin: CoinData;
  onRef: (m: THREE.Mesh | null) => void;
}) {
  const radius = coin.type === "mega" ? 0.6 : 0.3;
  const color = coin.type === "mega" ? "#ffdd00" : "#ffc000";
  const emissive = coin.type === "mega" ? "#ffee44" : "#ffa000";
  const intensity = coin.type === "mega" ? 4 : 2.5;

  return (
    <mesh
      ref={onRef}
      position={[
        coin.position.x,
        coin.type === "mega" ? 0.6 : 0.35,
        coin.position.z,
      ]}
      visible={!coin.collected}
      castShadow
    >
      <sphereGeometry
        args={[
          radius,
          coin.type === "mega" ? 12 : 8,
          coin.type === "mega" ? 12 : 8,
        ]}
      />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={intensity}
        metalness={0.8}
        roughness={0.1}
      />
    </mesh>
  );
}
