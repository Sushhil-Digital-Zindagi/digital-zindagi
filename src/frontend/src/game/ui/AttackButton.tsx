import { useCallback, useRef, useState } from "react";
import { resumeAudio } from "../utils/audioEngine";

interface AttackButtonProps {
  onAttack: () => void;
}

export default function AttackButton({ onAttack }: AttackButtonProps) {
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  const cooldownRef = useRef(false);
  const [pulsing, setPulsing] = useState(false);
  const COOLDOWN_MS = 500;

  const handleAttack = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      resumeAudio();
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      onAttack();
      setPulsing(true);
      setTimeout(() => {
        cooldownRef.current = false;
        setPulsing(false);
      }, COOLDOWN_MS);
    },
    [onAttack],
  );

  if (!isTouch) return null;

  return (
    <div
      className="absolute bottom-6 right-4 z-10 select-none"
      style={{ touchAction: "none" }}
      data-ocid="attack-button"
    >
      <button
        type="button"
        onTouchStart={handleAttack}
        className="rounded-full flex items-center justify-center font-bold text-3xl transition-transform active:scale-90"
        aria-label="Attack"
        style={{
          width: 80,
          height: 80,
          background: pulsing
            ? "radial-gradient(circle, #ff6600 0%, #cc2200 100%)"
            : "radial-gradient(circle, #ff3300 0%, #aa1100 100%)",
          border: `3px solid ${pulsing ? "#ff9900" : "#ff4400"}`,
          boxShadow: pulsing
            ? "0 0 24px rgba(255,100,0,0.8), inset 0 1px 2px rgba(255,200,0,0.3)"
            : "0 0 12px rgba(255,50,0,0.5), inset 0 1px 2px rgba(255,150,0,0.2)",
          color: "#fff",
          touchAction: "none",
          animation: !pulsing ? "none" : "pulse 0.3s ease-out",
        }}
      >
        ⚔
      </button>
    </div>
  );
}
