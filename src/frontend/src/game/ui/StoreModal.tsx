import { Heart, Shield, Users, X, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { type WeaponType, useGameStore } from "../stores/gameStore";
import { SFX } from "../utils/audioEngine";

// ─── Weapon unlock storage ────────────────────────────────────────────────────
const UNLOCK_KEY = "dz_unlocked_weapons";

function getUnlockedWeapons(): Set<WeaponType> {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return new Set<WeaponType>(["rifle"]);
    const arr = JSON.parse(raw) as WeaponType[];
    return new Set<WeaponType>(["rifle", ...arr]);
  } catch {
    return new Set<WeaponType>(["rifle"]);
  }
}

function saveUnlockedWeapon(weapon: WeaponType) {
  const unlocked = getUnlockedWeapons();
  unlocked.add(weapon);
  const arr = Array.from(unlocked).filter((w) => w !== "rifle");
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(arr));
  } catch {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────

interface WeaponCard {
  id: WeaponType;
  icon: string;
  name: string;
  stats: string;
  description: string;
  cost: number; // 0 = free/default
  borderColor: string;
  glowColor: string;
}

const WEAPONS: WeaponCard[] = [
  {
    id: "rifle",
    icon: "🔫",
    name: "Assault Rifle",
    stats: "DMG: 20 | Speed: Fast",
    description: "Rapid-fire precision. Default weapon — always free.",
    cost: 0,
    borderColor: "rgba(0,255,136,0.5)",
    glowColor: "#00ff88",
  },
  {
    id: "shotgun",
    icon: "💥",
    name: "Shotgun",
    stats: "DMG: 30 | Speed: Medium",
    description: "Massive close-range blast. One shot, huge impact.",
    cost: 100,
    borderColor: "rgba(255,80,80,0.5)",
    glowColor: "#ff5050",
  },
  {
    id: "plasma",
    icon: "⚡",
    name: "Digital Plasma Gun",
    stats: "DMG: 45 | Speed: Slow",
    description: "Advanced energy weapon. Maximum damage per shot.",
    cost: 200,
    borderColor: "rgba(0,200,255,0.6)",
    glowColor: "#00c8ff",
  },
];

interface UpgradeItem {
  id: string;
  icon: React.ReactNode;
  titleHindi: string;
  titleEnglish: string;
  description: string;
  cost: number;
  upgradeKey: string;
}

const UPGRADES: UpgradeItem[] = [
  {
    id: "heal",
    icon: <Heart size={22} className="text-red-400" />,
    titleHindi: "💊 Heal +30 HP",
    titleEnglish: "Heal +30 HP",
    description: "Hero ko 30 HP wapas milega",
    cost: 50,
    upgradeKey: "heal",
  },
  {
    id: "shield",
    icon: <Shield size={22} className="text-blue-400" />,
    titleHindi: "🛡️ Shield (5 hits)",
    titleEnglish: "Shield — 5 Hit Immune",
    description: "Agले 5 attacks immune rahega",
    cost: 75,
    upgradeKey: "shield",
  },
  {
    id: "damage_boost",
    icon: <Zap size={22} className="text-yellow-400" />,
    titleHindi: "💥 Damage Boost +50% (30s)",
    titleEnglish: "Damage +50% for 30s",
    description: "30 seconds ke liye 50% zyada damage",
    cost: 75,
    upgradeKey: "damage_boost",
  },
  {
    id: "revive_partner",
    icon: <Users size={22} className="text-purple-400" />,
    titleHindi: "🤝 Revive Partner",
    titleEnglish: "Revive a Partner",
    description: "Ek dead partner ko 50 HP ke saath wapas lao",
    cost: 75,
    upgradeKey: "revive_partner",
  },
];

// ─── Apply upgrades to game state ─────────────────────────────────────────────
function applyUpgrade(key: string) {
  const store = useGameStore.getState();
  switch (key) {
    case "heal":
      store.healHero(30);
      break;
    case "shield":
      // Store 5-hit shield count in localStorage for the hero entity to read
      localStorage.setItem("dz_shield_hits", "5");
      break;
    case "damage_boost":
      localStorage.setItem("dz_damage_boost_until", String(Date.now() + 30000));
      break;
    case "revive_partner":
      if (store.partnerHP[0] === 0) store.setPartnerHP(0, 50);
      else if (store.partnerHP[1] === 0) store.setPartnerHP(1, 50);
      break;
    default:
      break;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function StoreModal({ onClose }: Props) {
  const { coins, spendCoins, currentWeapon, setWeapon } = useGameStore();
  const [activeTab, setActiveTab] = useState<"weapons" | "upgrades">("weapons");
  const [unlockedWeapons, setUnlockedWeapons] = useState<Set<WeaponType>>(() =>
    getUnlockedWeapons(),
  );
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
  }, []);

  // ── Weapon selection / purchase ──
  const handleWeaponClick = useCallback(
    (w: WeaponCard) => {
      const isUnlocked = unlockedWeapons.has(w.id);

      if (w.cost === 0 || isUnlocked) {
        // Just equip
        setWeapon(w.id);
        SFX.storePurchase(0.5);
        showToast(`${w.icon} ${w.name} equipped!`, true);
        setTimeout(onClose, 500);
        return;
      }

      // Try to purchase
      const success = spendCoins(w.cost);
      if (!success) {
        showToast(`Coins kam hain! ❌ (${w.cost} chahiye)`, false);
        return;
      }

      // Unlock and equip
      saveUnlockedWeapon(w.id);
      setUnlockedWeapons(getUnlockedWeapons());
      setWeapon(w.id);
      SFX.storePurchase(0.6);
      showToast(`🎉 ${w.name} unlock ho gaya!`, true);
      setTimeout(onClose, 600);
    },
    [unlockedWeapons, spendCoins, setWeapon, onClose, showToast],
  );

  // ── Upgrade purchase ──
  const handleUpgradeClick = useCallback(
    (item: UpgradeItem) => {
      const success = spendCoins(item.cost);
      if (!success) {
        showToast(`Coins kam hain! ❌ (${item.cost} chahiye)`, false);
        return;
      }
      applyUpgrade(item.upgradeKey);
      SFX.storePurchase(0.6);
      showToast(`✅ ${item.titleHindi}!`, true);
    },
    [spendCoins, showToast],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      data-ocid="store-modal"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="game-hud-bg rounded-2xl p-5 max-w-sm w-full mx-4 relative flex flex-col"
        style={{
          border: "2px solid rgba(240,192,64,0.5)",
          maxHeight: "88vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#f0c040" }}>
              🏪 डिजिटल ज़िंदगी स्टोर
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>
              Coins se weapons aur upgrades kharido
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            style={{ color: "#f0c040" }}
            aria-label="Close store"
            data-ocid="store-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* Coin balance */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl mb-3 flex-shrink-0"
          style={{
            background: "rgba(240,192,64,0.12)",
            border: "1px solid rgba(240,192,64,0.3)",
          }}
        >
          <span className="text-2xl">🪙</span>
          <div>
            <div className="text-xs opacity-60" style={{ color: "#aaa" }}>
              Aapke paas hain
            </div>
            <div className="text-xl font-bold" style={{ color: "#f0c040" }}>
              {coins} Coins
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-2 px-4 py-2 rounded-xl text-sm font-bold text-center flex-shrink-0"
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

        {/* Tabs */}
        <div
          className="flex rounded-xl mb-3 p-1 gap-1 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("weapons")}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background:
                activeTab === "weapons"
                  ? "rgba(0,255,136,0.15)"
                  : "transparent",
              color: activeTab === "weapons" ? "#00ff88" : "#888",
              border:
                activeTab === "weapons"
                  ? "1px solid rgba(0,255,136,0.4)"
                  : "1px solid transparent",
            }}
            data-ocid="store-tab-weapons"
          >
            ⚔️ Weapons
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upgrades")}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background:
                activeTab === "upgrades"
                  ? "rgba(240,192,64,0.2)"
                  : "transparent",
              color: activeTab === "upgrades" ? "#f0c040" : "#888",
              border:
                activeTab === "upgrades"
                  ? "1px solid rgba(240,192,64,0.4)"
                  : "1px solid transparent",
            }}
            data-ocid="store-tab-upgrades"
          >
            🗡️ Upgrades
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {/* ── Weapons Tab ── */}
          {activeTab === "weapons" && (
            <div className="space-y-3 pb-2">
              {WEAPONS.map((w) => {
                const isEquipped = currentWeapon === w.id;
                const isUnlocked = unlockedWeapons.has(w.id);
                const canAfford = coins >= w.cost;

                return (
                  <motion.div
                    key={w.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-3 rounded-xl relative"
                    style={{
                      background: isEquipped
                        ? `${w.glowColor}10`
                        : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${isEquipped ? w.borderColor : "rgba(255,255,255,0.08)"}`,
                      boxShadow: isEquipped
                        ? `0 0 12px ${w.glowColor}30`
                        : "none",
                    }}
                    data-ocid={`weapon-card-${w.id}`}
                  >
                    {/* Equipped badge */}
                    {isEquipped && (
                      <div
                        className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `${w.glowColor}25`,
                          color: w.glowColor,
                          border: `1px solid ${w.glowColor}50`,
                        }}
                      >
                        ✓ EQUIPPED
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                        style={{
                          background: `${w.glowColor}18`,
                          border: `1px solid ${w.glowColor}40`,
                        }}
                      >
                        {w.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-white">
                          {w.name}
                        </div>
                        <div
                          className="text-xs font-semibold mt-0.5"
                          style={{ color: "#f0c040" }}
                        >
                          {w.stats}
                        </div>
                        <div
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: "#aaa" }}
                        >
                          {w.description}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleWeaponClick(w)}
                      disabled={!isUnlocked && !canAfford}
                      className="mt-3 w-full py-2 rounded-lg font-bold text-sm transition-all"
                      style={
                        isEquipped
                          ? {
                              background: `${w.glowColor}20`,
                              color: w.glowColor,
                              border: `1px solid ${w.glowColor}50`,
                            }
                          : isUnlocked
                            ? {
                                background: "rgba(0,255,136,0.12)",
                                color: "#00ff88",
                                border: "1px solid rgba(0,255,136,0.4)",
                                cursor: "pointer",
                              }
                            : canAfford
                              ? {
                                  background:
                                    "linear-gradient(135deg, #f0c040, #c89820)",
                                  color: "#020503",
                                  border: "1px solid #f0c040",
                                  cursor: "pointer",
                                }
                              : {
                                  background: "rgba(255,255,255,0.04)",
                                  color: "#555",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  cursor: "not-allowed",
                                }
                      }
                      data-ocid={`weapon-btn-${w.id}`}
                    >
                      {isEquipped
                        ? "EQUIPPED ✓"
                        : isUnlocked
                          ? "Equip →"
                          : canAfford
                            ? `🪙 ${w.cost} — Unlock Karo`
                            : `🪙 ${w.cost} — Coins kam hain`}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── Upgrades Tab ── */}
          {activeTab === "upgrades" && (
            <div className="space-y-3 pb-2">
              <div className="text-xs px-1 mb-1" style={{ color: "#888" }}>
                Per-session consumable upgrades. Use karoge to usi game mein
                kaam aayenge.
              </div>
              {UPGRADES.map((item) => {
                const canAfford = coins >= item.cost;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${canAfford ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.06)"}`,
                      opacity: canAfford ? 1 : 0.55,
                    }}
                    data-ocid={`upgrade-item-${item.id}`}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-bold text-sm"
                        style={{ color: canAfford ? "#f0c040" : "#888" }}
                      >
                        {item.titleHindi}
                      </div>
                      <div className="text-xs" style={{ color: "#aaa" }}>
                        {item.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleUpgradeClick(item)}
                      className="flex-shrink-0 px-3 py-2 rounded-xl font-bold text-sm transition-all"
                      style={{
                        background: canAfford
                          ? "linear-gradient(135deg, #f0c040, #c89820)"
                          : "rgba(255,255,255,0.05)",
                        color: canAfford ? "#020503" : "#555",
                        border: `1px solid ${canAfford ? "#f0c040" : "transparent"}`,
                        cursor: canAfford ? "pointer" : "not-allowed",
                        minWidth: 60,
                      }}
                      data-ocid={`upgrade-btn-${item.id}`}
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
