import { create } from "zustand";

export type GamePhase =
  | "start"
  | "playing"
  | "paused"
  | "wave_complete"
  | "level_complete"
  | "gameover"
  | "victory";
export type WeaponType =
  | "pistol"
  | "rifle"
  | "shotgun"
  | "plasma"
  | "flamethrower";

export interface WeaponData {
  id: WeaponType;
  name: string;
  cost: number;
  damage: number;
  fireRate: number; // shots per second
  ammoMax: number; // -1 = infinite
  spread: number; // 0-1
  aoe: number; // 0 = none, >0 = radius
  color: string;
}

export const WEAPONS: Record<WeaponType, WeaponData> = {
  pistol: {
    id: "pistol",
    name: "Pistol",
    cost: 0,
    damage: 15,
    fireRate: 2,
    ammoMax: -1,
    spread: 0,
    aoe: 0,
    color: "#aaa",
  },
  rifle: {
    id: "rifle",
    name: "Assault Rifle",
    cost: 100,
    damage: 20,
    fireRate: 8,
    ammoMax: 200,
    spread: 0.05,
    aoe: 0,
    color: "#4af",
  },
  shotgun: {
    id: "shotgun",
    name: "Shotgun",
    cost: 150,
    damage: 35,
    fireRate: 1.5,
    ammoMax: 60,
    spread: 0.3,
    aoe: 0,
    color: "#fa4",
  },
  plasma: {
    id: "plasma",
    name: "Plasma Gun",
    cost: 200,
    damage: 80,
    fireRate: 1,
    ammoMax: 30,
    spread: 0,
    aoe: 60,
    color: "#a4f",
  },
  flamethrower: {
    id: "flamethrower",
    name: "Flamethrower",
    cost: 250,
    damage: 12,
    fireRate: 15,
    ammoMax: 100,
    spread: 0.4,
    aoe: 0,
    color: "#f84",
  },
};

export interface GameState {
  gamePhase: GamePhase;
  score: number;
  coins: number;
  heroHP: number;
  heroMaxHP: number;
  currentWave: number; // 1-3 within a level
  currentLevel: number; // 1-12
  enemiesRemaining: number;
  currentWeapon: WeaponType;
  ownedWeapons: WeaponType[];
  ammo: Record<WeaponType, number>;
  volume: number;
  leaderboardVisible: boolean;
  spawnInvincible: boolean;
  armor: number; // 0-3, damage reduction
  speedBoost: number; // 0-3

  // Actions
  setGamePhase: (p: GamePhase) => void;
  addScore: (pts: number) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  damageHero: (dmg: number) => void;
  healHero: (amt: number) => void;
  setEnemiesRemaining: (n: number) => void;
  decrementEnemies: () => void;
  nextWave: () => void;
  nextLevel: () => void;
  setWeapon: (w: WeaponType) => void;
  buyWeapon: (w: WeaponType) => boolean;
  buyUpgrade: (type: "health" | "armor" | "speed") => boolean;
  useAmmo: (w: WeaponType) => void;
  resetGame: () => void;
  setVolume: (v: number) => void;
  setLeaderboardVisible: (v: boolean) => void;
  setSpawnInvincible: (v: boolean) => void;
}

const STORAGE_HIGH_SCORE = "dz_ws_high_score";
const STORAGE_VOLUME = "dz_ws_volume";
const STORAGE_COINS = "dz_ws_coins";

function initialAmmo(): Record<WeaponType, number> {
  return { pistol: -1, rifle: 200, shotgun: 60, plasma: 30, flamethrower: 100 };
}

export function getHighScore(): number {
  return Number(localStorage.getItem(STORAGE_HIGH_SCORE) || "0");
}

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: "start",
  score: 0,
  coins: Number(localStorage.getItem(STORAGE_COINS) || "0"),
  heroHP: 100,
  heroMaxHP: 100,
  currentWave: 1,
  currentLevel: 1,
  enemiesRemaining: 0,
  currentWeapon: "pistol",
  ownedWeapons: ["pistol"],
  ammo: initialAmmo(),
  volume: Number(localStorage.getItem(STORAGE_VOLUME) || "0.7"),
  leaderboardVisible: false,
  spawnInvincible: false,
  armor: 0,
  speedBoost: 0,

  setGamePhase: (gamePhase) => set({ gamePhase }),

  addScore: (pts) =>
    set((s) => {
      const score = s.score + pts;
      const best = getHighScore();
      if (score > best) localStorage.setItem(STORAGE_HIGH_SCORE, String(score));
      return { score };
    }),

  addCoins: (n) =>
    set((s) => {
      const coins = s.coins + n;
      localStorage.setItem(STORAGE_COINS, String(coins));
      return { coins };
    }),

  spendCoins: (n) => {
    const { coins } = get();
    if (coins < n) return false;
    const updated = coins - n;
    localStorage.setItem(STORAGE_COINS, String(updated));
    set({ coins: updated });
    return true;
  },

  damageHero: (dmg) =>
    set((s) => {
      if (s.spawnInvincible) return {};
      const reduced = Math.max(0, dmg - s.armor * 3);
      const heroHP = Math.max(0, s.heroHP - reduced);
      if (heroHP === 0 && s.gamePhase === "playing") {
        const best = getHighScore();
        if (s.score > best)
          localStorage.setItem(STORAGE_HIGH_SCORE, String(s.score));
        return { heroHP, gamePhase: "gameover" };
      }
      return { heroHP };
    }),

  healHero: (amt) =>
    set((s) => ({ heroHP: Math.min(s.heroMaxHP, s.heroHP + amt) })),

  setEnemiesRemaining: (n) => set({ enemiesRemaining: n }),

  decrementEnemies: () =>
    set((s) => ({ enemiesRemaining: Math.max(0, s.enemiesRemaining - 1) })),

  nextWave: () =>
    set((s) => {
      const nextWave = s.currentWave + 1;
      if (nextWave > 3) {
        // Level complete
        const nextLevel = s.currentLevel + 1;
        if (nextLevel > 12) return { gamePhase: "victory" };
        return {
          currentWave: 1,
          currentLevel: nextLevel,
          gamePhase: "level_complete",
          heroHP: Math.min(s.heroMaxHP, s.heroHP + 20),
        };
      }
      return { currentWave: nextWave, gamePhase: "wave_complete" };
    }),

  nextLevel: () =>
    set((s) => ({
      gamePhase: "playing",
      currentWave: 1,
      heroHP: Math.min(s.heroMaxHP, s.heroHP + 30),
    })),

  setWeapon: (w) =>
    set((s) => {
      if (!s.ownedWeapons.includes(w)) return {};
      return { currentWeapon: w };
    }),

  buyWeapon: (w) => {
    const s = get();
    if (s.ownedWeapons.includes(w)) return false;
    const cost = WEAPONS[w].cost;
    if (!s.spendCoins(cost)) return false;
    set((prev) => ({
      ownedWeapons: [...prev.ownedWeapons, w],
      currentWeapon: w,
    }));
    return true;
  },

  buyUpgrade: (type) => {
    const s = get();
    let cost = 0;
    if (type === "health") cost = 75;
    if (type === "armor") cost = 100;
    if (type === "speed") cost = 150;
    if (!s.spendCoins(cost)) return false;
    if (type === "health")
      set((prev) => ({ heroHP: Math.min(prev.heroMaxHP, prev.heroHP + 50) }));
    if (type === "armor")
      set((prev) => ({ armor: Math.min(3, prev.armor + 1) }));
    if (type === "speed")
      set((prev) => ({ speedBoost: Math.min(3, prev.speedBoost + 1) }));
    return true;
  },

  useAmmo: (w) =>
    set((s) => {
      const ammo = { ...s.ammo };
      if (ammo[w] === -1) return {};
      ammo[w] = Math.max(0, ammo[w] - 1);
      if (ammo[w] === 0 && w !== "pistol") {
        return { ammo, currentWeapon: "pistol" };
      }
      return { ammo };
    }),

  resetGame: () =>
    set({
      gamePhase: "playing",
      score: 0,
      heroHP: 100,
      heroMaxHP: 100,
      currentWave: 1,
      currentLevel: 1,
      enemiesRemaining: 0,
      currentWeapon: "pistol",
      ownedWeapons: ["pistol"],
      ammo: initialAmmo(),
      spawnInvincible: true,
      armor: 0,
      speedBoost: 0,
    }),

  setVolume: (volume) => {
    localStorage.setItem(STORAGE_VOLUME, String(volume));
    set({ volume });
  },

  setLeaderboardVisible: (leaderboardVisible) => set({ leaderboardVisible }),
  setSpawnInvincible: (spawnInvincible) => set({ spawnInvincible }),
}));
