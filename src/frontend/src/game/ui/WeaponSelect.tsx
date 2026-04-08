import { motion } from "motion/react";
import type { WeaponType } from "../stores/gameStore";

const WEAPONS: {
  id: WeaponType;
  icon: string;
  name: string;
  stat: string;
  color: string;
  glow: string;
}[] = [
  {
    id: "rifle",
    icon: "🔫",
    name: "Assault Rifle",
    stat: "Fast | Long Range",
    color: "rgba(0,255,136,0.12)",
    glow: "#00ff88",
  },
  {
    id: "shotgun",
    icon: "💥",
    name: "Shotgun",
    stat: "Heavy | Close Range",
    color: "rgba(255,80,80,0.12)",
    glow: "#ff5050",
  },
  {
    id: "plasma",
    icon: "⚡",
    name: "Plasma Gun",
    stat: "Medium | Energy",
    color: "rgba(0,200,255,0.12)",
    glow: "#00c8ff",
  },
];

interface Props {
  selected: WeaponType;
  onSelect: (weapon: WeaponType) => void;
}

export default function WeaponSelect({ selected, onSelect }: Props) {
  return (
    <div>
      <div
        className="text-xs font-semibold mb-2 text-center"
        style={{ color: "#f0c040" }}
      >
        ⚔ Weapon Chuno
      </div>
      <div className="grid grid-cols-3 gap-2">
        {WEAPONS.map((w) => {
          const isActive = selected === w.id;
          return (
            <motion.button
              key={w.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelect(w.id)}
              className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
              style={{
                background: isActive ? w.color : "rgba(255,255,255,0.04)",
                border: isActive
                  ? `1.5px solid ${w.glow}`
                  : "1.5px solid rgba(255,255,255,0.1)",
                boxShadow: isActive ? `0 0 10px ${w.glow}44` : "none",
              }}
              data-ocid={`weapon-choice-${w.id}`}
              aria-label={`Select ${w.name}`}
              aria-pressed={isActive}
            >
              <span className="text-2xl">{w.icon}</span>
              <span
                className="text-xs font-bold leading-tight text-center"
                style={{ color: isActive ? w.glow : "#ccc" }}
              >
                {w.name}
              </span>
              <span
                className="text-xs leading-tight text-center"
                style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem" }}
              >
                {w.stat}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
