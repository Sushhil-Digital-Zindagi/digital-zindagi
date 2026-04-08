import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { GameScene } from "./GameScene";
import { resumeAudio } from "./utils/audioEngine";

interface GameCanvasProps {
  keys: React.MutableRefObject<Set<string>>;
  joystick: React.MutableRefObject<{ x: number; y: number }>;
}

/**
 * GameCanvas — renders the Three.js scene.
 *
 * IMPORTANT: This component must NEVER conditionally unmount/remount the <Canvas>.
 * Conditionally removing <Canvas> causes the crash loop.
 * Instead, the GameScene is always mounted and responds to gamePhase internally.
 *
 * FIX 5 — Visual clarity:
 * - dpr={[1, window.devicePixelRatio]} for High-DPI / Retina sharpness
 * - onCreated: explicitly calls gl.setPixelRatio(window.devicePixelRatio)
 *   and gl.setSize() as requested
 * - gl: antialias + high-performance powerPreference
 * - Canvas style: width/height 100%, display block (no gaps)
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
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          alpha: false,
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          // FIX 5: Explicitly set pixel ratio and size for maximum visual clarity
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
          background: "#020503",
        }}
        onPointerDown={() => resumeAudio()}
      >
        <Suspense fallback={null}>
          {/* GameScene is ALWAYS mounted — it checks gamePhase internally */}
          <GameScene keys={keys} joystick={joystick} />
        </Suspense>
      </Canvas>
    </div>
  );
}
