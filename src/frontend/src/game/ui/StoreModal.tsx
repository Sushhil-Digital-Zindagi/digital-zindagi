/**
 * StoreModal — shop between levels
 */
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { SFX } from "../audio/AudioEngine";
import { WEAPONS, type WeaponType, useGameStore } from "../stores/gameStore";

interface Props {
  onClose: () => void;
}

export default function StoreModal({ onClose }: Props) {
  const {
    coins,
    currentWeapon,
    ownedWeapons,
    buyWeapon,
    buyUpgrade,
    setWeapon,
    volume,
  } = useGameStore();
  const [activeTab, setActiveTab] = useState<"weapons" | "upgrades">("weapons");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const handleWeapon = useCallback(
    (w: WeaponType) => {
      if (ownedWeapons.includes(w)) {
        setWeapon(w);
        SFX.storePurchase(volume * 0.5);
        setToast({ msg: `${WEAPONS[w].name} equipped!`, ok: true });
        return;
      }
      const ok = buyWeapon(w);
      if (!ok) {
        setToast({
          msg: `🪙 ${WEAPONS[w].cost} chahiye — Coins kam hain`,
          ok: false,
        });
        return;
      }
      SFX.storePurchase(volume * 0.6);
      setToast({ msg: `🎉 ${WEAPONS[w].name} unlock ho gaya!`, ok: true });
    },
    [ownedWeapons, buyWeapon, setWeapon, volume],
  );

  const handleUpgrade = useCallback(
    (type: "health" | "armor" | "speed", cost: number, label: string) => {
      const ok = buyUpgrade(type);
      if (!ok) {
        setToast({ msg: `🪙 ${cost} chahiye — Coins kam hain`, ok: false });
        return;
      }
      SFX.storePurchase(volume * 0.6);
      setToast({ msg: `✅ ${label}!`, ok: true });
    },
    [buyUpgrade, volume],
  );

  const weaponList = Object.values(WEAPONS);
  const UPGRADE_LIST = [
    {
      type: "health" as const,
      icon: "💊",
      label: "Health Pack +50 HP",
      cost: 75,
    },
    {
      type: "armor" as const,
      icon: "🛡️",
      label: "Armor +1 (damage reduce)",
      cost: 100,
    },
    {
      type: "speed" as const,
      icon: "⚡",
      label: "Speed Boost +15%",
      cost: 150,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)" }}
      data-ocid="store-modal"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-2xl p-5 max-w-sm w-full mx-4 relative flex flex-col"
        style={{
          background: "#0a0804",
          border: "2px solid rgba(240,192,64,0.5)",
          maxHeight: "88vh",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f0c040" }}>
              🏪 डिजिटल ज़िंदगी स्टोर
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#888" }}>
              Coins se weapons aur upgrades kharido
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl"
            style={{ color: "#f0c040" }}
            aria-label="Close"
            data-ocid="store-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl mb-3"
          style={{
            background: "rgba(240,192,64,0.1)",
            border: "1px solid rgba(240,192,64,0.3)",
          }}
        >
          <span className="text-2xl">🪙</span>
          <div>
            <div className="text-xs" style={{ color: "#888" }}>
              Coins
            </div>
            <div className="text-xl font-bold" style={{ color: "#f0c040" }}>
              {coins}
            </div>
          </div>
        </div>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 px-4 py-2 rounded-xl text-sm font-bold text-center"
            style={{
              background: toast.ok
                ? "rgba(0,255,136,0.15)"
                : "rgba(220,38,38,0.15)",
              border: `1px solid ${toast.ok ? "rgba(0,255,136,0.4)" : "rgba(220,38,38,0.4)"}`,
              color: toast.ok ? "#00ff88" : "#ff6666",
            }}
          >
            {toast.msg}
          </motion.div>
        )}

        <div
          className="flex rounded-xl mb-3 p-1 gap-1"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {(["weapons", "upgrades"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize"
              style={{
                background:
                  activeTab === tab ? "rgba(0,255,136,0.15)" : "transparent",
                color: activeTab === tab ? "#00ff88" : "#666",
                border: `1px solid ${activeTab === tab ? "rgba(0,255,136,0.4)" : "transparent"}`,
              }}
              data-ocid={`store-tab-${tab}`}
            >
              {tab === "weapons" ? "⚔️ Weapons" : "🗡️ Upgrades"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {activeTab === "weapons" && (
            <div className="space-y-3 pb-2">
              {weaponList.map((w) => {
                const isOwned = ownedWeapons.includes(w.id);
                const isEquipped = currentWeapon === w.id;
                const canAfford = coins >= w.cost;
                return (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl"
                    style={{
                      background: isEquipped
                        ? `${w.color}15`
                        : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${isEquipped ? `${w.color}60` : "rgba(255,255,255,0.08)"}`,
                    }}
                    data-ocid={`weapon-card-${w.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{
                          background: `${w.color}20`,
                          border: `1px solid ${w.color}50`,
                        }}
                      >
                        {w.id === "pistol"
                          ? "🔫"
                          : w.id === "rifle"
                            ? "🪖"
                            : w.id === "shotgun"
                              ? "💥"
                              : w.id === "plasma"
                                ? "⚡"
                                : "🔥"}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white">
                          {w.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "#888" }}
                        >{`DMG ${w.damage} · Rate ${w.fireRate}/s · ${w.ammoMax === -1 ? "∞" : `${w.ammoMax} rounds`}`}</div>
                      </div>
                      {isEquipped && (
                        <div
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${w.color}25`,
                            color: w.color,
                            border: `1px solid ${w.color}50`,
                          }}
                        >
                          ✓ EQ
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleWeapon(w.id)}
                      disabled={!isOwned && !canAfford}
                      className="mt-3 w-full py-2 rounded-lg font-bold text-sm"
                      style={
                        isEquipped
                          ? {
                              background: `${w.color}20`,
                              color: w.color,
                              border: `1px solid ${w.color}50`,
                            }
                          : isOwned
                            ? {
                                background: "rgba(0,255,136,0.12)",
                                color: "#00ff88",
                                border: "1px solid rgba(0,255,136,0.4)",
                              }
                            : canAfford
                              ? {
                                  background:
                                    "linear-gradient(135deg,#f0c040,#c89820)",
                                  color: "#020503",
                                }
                              : {
                                  background: "rgba(255,255,255,0.04)",
                                  color: "#444",
                                }
                      }
                      data-ocid={`weapon-btn-${w.id}`}
                    >
                      {isEquipped
                        ? "EQUIPPED ✓"
                        : isOwned
                          ? "Equip →"
                          : w.cost === 0
                            ? "Free — Select"
                            : canAfford
                              ? `🪙 ${w.cost} Unlock`
                              : `🪙 ${w.cost} — Kam coins`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "upgrades" && (
            <div className="space-y-3 pb-2">
              {UPGRADE_LIST.map((item) => {
                const canAfford = coins >= item.cost;
                return (
                  <div
                    key={item.type}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${canAfford ? "rgba(240,192,64,0.25)" : "rgba(255,255,255,0.06)"}`,
                      opacity: canAfford ? 1 : 0.55,
                    }}
                    data-ocid={`upgrade-${item.type}`}
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <div
                        className="font-bold text-sm"
                        style={{ color: canAfford ? "#f0c040" : "#666" }}
                      >
                        {item.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() =>
                        handleUpgrade(item.type, item.cost, item.label)
                      }
                      className="px-3 py-2 rounded-xl font-bold text-sm"
                      style={{
                        background: canAfford
                          ? "linear-gradient(135deg,#f0c040,#c89820)"
                          : "rgba(255,255,255,0.05)",
                        color: canAfford ? "#020503" : "#444",
                        minWidth: 56,
                      }}
                    >
                      🪙{item.cost}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
