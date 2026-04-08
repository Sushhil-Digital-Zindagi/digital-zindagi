import { useCallback, useRef, useState } from "react";

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}

export default function VirtualJoystick({
  onMove,
  onEnd,
}: VirtualJoystickProps) {
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const RADIUS = 50; // outer ring radius for clamping

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    originRef.current = { x: t.clientX, y: t.clientY };
    activeRef.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const rawX = t.clientX - originRef.current.x;
      const rawY = t.clientY - originRef.current.y;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      const clampedDist = Math.min(dist, RADIUS);
      const angle = Math.atan2(rawY, rawX);
      const cx = Math.cos(angle) * clampedDist;
      const cy = Math.sin(angle) * clampedDist;
      setKnobPos({ x: cx, y: cy });
      onMove(cx / RADIUS, cy / RADIUS);
    },
    [onMove],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      activeRef.current = false;
      setKnobPos({ x: 0, y: 0 });
      onEnd();
    },
    [onEnd],
  );

  if (!isTouch) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-4 z-10 select-none"
      style={{ touchAction: "none" }}
      data-ocid="virtual-joystick"
    >
      {/* Outer ring */}
      <div
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 100,
          height: 100,
          background: "rgba(0,0,0,0.35)",
          border: "2px solid rgba(240,192,64,0.35)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Direction hints */}
        <span
          className="absolute top-1 text-xs opacity-30"
          style={{ color: "#f0c040" }}
        >
          ▲
        </span>
        <span
          className="absolute bottom-1 text-xs opacity-30"
          style={{ color: "#f0c040" }}
        >
          ▼
        </span>
        <span
          className="absolute left-1 text-xs opacity-30"
          style={{ color: "#f0c040" }}
        >
          ◀
        </span>
        <span
          className="absolute right-1 text-xs opacity-30"
          style={{ color: "#f0c040" }}
        >
          ▶
        </span>

        {/* Knob — moves with touch */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 40,
            height: 40,
            background: "rgba(240,192,64,0.55)",
            border: "2px solid rgba(240,192,64,0.9)",
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: activeRef.current ? "none" : "transform 0.15s ease-out",
            boxShadow: "0 0 10px rgba(240,192,64,0.4)",
          }}
        />
      </div>
    </div>
  );
}
