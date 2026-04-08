import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { GameScene } from "./GameScene";
import { resumeAudio } from "./utils/audioEngine";

interface GameCanvasProps {
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
}

/**
 * GameCanvas — Isometric Alien Shooter
 * Camera: PerspectiveCamera at [0, 15, 12], looking toward [0, 0, 0]
 * This gives the classic top-down 60-degree isometric feel.
 * Canvas is NEVER conditionally unmounted — avoids crash loops.
 */
export function GameCanvas({ keys, joystick }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        willChange: "transform",
        touchAction: "none",
      }}
    >
      <Canvas
        shadows
        frameloop="always"
        dpr={[1, typeof window !== "undefined" ? window.devicePixelRatio : 2]}
        performance={{ min: 0.5 }}
        camera={{
          position: [0, 15, 12],
          fov: 55,
          near: 0.1,
          far: 300,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(
            typeof window !== "undefined" ? window.devicePixelRatio : 2,
          );
          if (typeof window !== "undefined") {
            gl.setSize(window.innerWidth, window.innerHeight);
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: "#030a05",
        }}
        onPointerDown={() => resumeAudio()}
      >
        <Suspense fallback={null}>
          <GameScene keys={keys} joystick={joystick} />
        </Suspense>
      </Canvas>
    </div>
  );
}
