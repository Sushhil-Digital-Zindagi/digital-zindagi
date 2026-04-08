import { create } from "zustand";

export type GamePhase = "start" | "playing" | "paused" | "gameover";
export type WeaponType = "rifle" | "shotgun" | "plasma";
export type UpgradeType = "damage_boost" | "heal" | "revive_partner" | "shield";

export interface Enemy {
  id: string;
  type: "hound" | "demon" | "triHound" | "alienDemon";
  position: [number, number, number];
  hp: number;
  maxHp: number;
  state: "idle" | "chase" | "attack" | "retreat" | "dead";
}

export interface Coin {
  id: string;
  position: [number, number, number];
  type: "normal" | "mega";
  collected: boolean;
}

export interface GameState {
  heroHP: number;
  heroMaxHP: number;
  partnerHP: [number, number];
  partnerMaxHP: number;
  score: number;
  waveCount: number;
  coins: number;
  gamePhase: GamePhase;
  heroFace: string | null;
  volume: number;

  // Combat modifiers
  damageMultiplier: number;
  shieldActive: boolean;

  // Spawn invincibility — prevents immediate death on game start
  spawnInvincible: boolean;

  // Checkpoint system
  checkpointWave: number;

  // Weapon system
  currentWeapon: WeaponType;
  setWeapon: (weapon: WeaponType) => void;

  // Leaderboard UI
  leaderboardVisible: boolean;
  setLeaderboardVisible: (visible: boolean) => void;

  // Actions
  setHeroHP: (hp: number) => void;
  damageHero: (dmg: number) => void;
  healHero: (amt: number) => void;
  setPartnerHP: (index: 0 | 1, hp: number) => void;
  damagePartner: (index: 0 | 1, dmg: number) => void;
  addScore: (pts: number) => void;
  addCoins: (n: number) => void;
  /** Deduct coins if balance sufficient. Returns true on success, false if not enough. */
  spendCoins: (amount: number) => boolean;
  /** Apply a store upgrade effect to the current game state. */
  applyUpgrade: (type: UpgradeType) => void;
  setGamePhase: (phase: GamePhase) => void;
  setHeroFace: (face: string | null) => void;
  setVolume: (v: number) => void;
  nextWave: () => void;
  resetGame: () => void;
  /** Restart from the saved checkpoint wave — does NOT reset to start screen */
  restartFromCheckpoint: () => void;
  /** Save current wave as checkpoint */
  saveCheckpoint: (wave: number) => void;
  setSpawnInvincible: (val: boolean) => void;
}

const STORAGE_HIGH_SCORE = "dz_game_high_score";
const STORAGE_HERO_FACE = "dz_game_hero_face";
const STORAGE_COINS = "dz_game_coins_session";
const STORAGE_VOLUME = "dz_game_volume";
const STORAGE_WEAPON = "dz_game_weapon";
const STORAGE_CHECKPOINT = "dz_game_checkpoint_wave";

function loadInitial(): Omit<
  GameState,
  | "setWeapon"
  | "setLeaderboardVisible"
  | "setHeroHP"
  | "damageHero"
  | "healHero"
  | "setPartnerHP"
  | "damagePartner"
  | "addScore"
  | "addCoins"
  | "spendCoins"
  | "applyUpgrade"
  | "setGamePhase"
  | "setHeroFace"
  | "setVolume"
  | "nextWave"
  | "resetGame"
  | "restartFromCheckpoint"
  | "saveCheckpoint"
  | "setSpawnInvincible"
> {
  return {
    heroHP: 100,
    heroMaxHP: 100,
    partnerHP: [80, 80],
    partnerMaxHP: 80,
    score: 0,
    waveCount: 1,
    coins: Number(localStorage.getItem(STORAGE_COINS) || "0"),
    gamePhase: "start" as GamePhase,
    heroFace: localStorage.getItem(STORAGE_HERO_FACE),
    volume: Number(localStorage.getItem(STORAGE_VOLUME) || "0.7"),
    currentWeapon:
      (localStorage.getItem(STORAGE_WEAPON) as WeaponType) || "rifle",
    leaderboardVisible: false,
    damageMultiplier: 1,
    shieldActive: false,
    spawnInvincible: false,
    checkpointWave: Number(localStorage.getItem(STORAGE_CHECKPOINT) || "1"),
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  ...loadInitial(),

  setWeapon: (weapon) => {
    localStorage.setItem(STORAGE_WEAPON, weapon);
    set({ currentWeapon: weapon });
  },

  setLeaderboardVisible: (leaderboardVisible) => set({ leaderboardVisible }),

  setHeroHP: (hp) => set({ heroHP: Math.max(0, Math.min(100, hp)) }),

  damageHero: (dmg) =>
    set((s) => {
      // FIX 2: Spawn invincibility — skip damage in first 2 seconds
      if (s.spawnInvincible) return {};
      // Shield absorbs damage completely
      if (s.shieldActive) return { shieldActive: false };
      const heroHP = Math.max(0, s.heroHP - dmg);
      if (heroHP === 0 && s.gamePhase === "playing") {
        const best = Number(localStorage.getItem(STORAGE_HIGH_SCORE) || "0");
        if (s.score > best)
          localStorage.setItem(STORAGE_HIGH_SCORE, String(s.score));
        return { heroHP, gamePhase: "gameover" };
      }
      return { heroHP };
    }),

  healHero: (amt) =>
    set((s) => ({ heroHP: Math.min(s.heroMaxHP, s.heroHP + amt) })),

  setPartnerHP: (index, hp) =>
    set((s) => {
      const ph: [number, number] = [...s.partnerHP] as [number, number];
      ph[index] = Math.max(0, Math.min(s.partnerMaxHP, hp));
      return { partnerHP: ph };
    }),

  damagePartner: (index, dmg) =>
    set((s) => {
      const ph: [number, number] = [...s.partnerHP] as [number, number];
      ph[index] = Math.max(0, ph[index] - dmg);
      return { partnerHP: ph };
    }),

  addScore: (pts) =>
    set((s) => {
      const score = s.score + pts;
      const best = Number(localStorage.getItem(STORAGE_HIGH_SCORE) || "0");
      if (score > best) localStorage.setItem(STORAGE_HIGH_SCORE, String(score));
      return { score };
    }),

  addCoins: (n) =>
    set((s) => {
      const coins = s.coins + n;
      localStorage.setItem(STORAGE_COINS, String(coins));
      return { coins };
    }),

  spendCoins: (amount) => {
    const { coins } = get();
    if (coins < amount) return false;
    const updated = coins - amount;
    localStorage.setItem(STORAGE_COINS, String(updated));
    set({ coins: updated });
    return true;
  },

  applyUpgrade: (type) =>
    set((s) => {
      switch (type) {
        case "damage_boost":
          return { damageMultiplier: Math.min(s.damageMultiplier + 0.5, 3) };
        case "heal":
          return { heroHP: Math.min(s.heroMaxHP, s.heroHP + 40) };
        case "revive_partner": {
          const ph: [number, number] = [...s.partnerHP] as [number, number];
          ph[0] = ph[0] <= 0 ? s.partnerMaxHP : ph[0];
          ph[1] = ph[1] <= 0 ? s.partnerMaxHP : ph[1];
          return { partnerHP: ph };
        }
        case "shield":
          return { shieldActive: true };
        default:
          return {};
      }
    }),

  setGamePhase: (gamePhase) => set({ gamePhase }),

  setHeroFace: (heroFace) => {
    if (heroFace) localStorage.setItem(STORAGE_HERO_FACE, heroFace);
    else localStorage.removeItem(STORAGE_HERO_FACE);
    set({ heroFace });
  },

  setVolume: (volume) => {
    localStorage.setItem(STORAGE_VOLUME, String(volume));
    set({ volume });
  },

  nextWave: () =>
    set((s) => {
      const nextWave = s.waveCount + 1;
      // Auto-save checkpoint every wave
      localStorage.setItem(STORAGE_CHECKPOINT, String(nextWave));
      return {
        waveCount: nextWave,
        heroHP: Math.min(s.heroMaxHP, s.heroHP + 30),
        shieldActive: false,
        checkpointWave: nextWave,
      };
    }),

  saveCheckpoint: (wave) => {
    localStorage.setItem(STORAGE_CHECKPOINT, String(wave));
    set({ checkpointWave: wave });
  },

  setSpawnInvincible: (val) => set({ spawnInvincible: val }),

  /** Full reset — goes back to wave 1, used only on fresh new game */
  resetGame: () =>
    set({
      heroHP: 100,
      partnerHP: [80, 80],
      score: 0,
      waveCount: 1,
      gamePhase: "playing",
      damageMultiplier: 1,
      shieldActive: false,
      spawnInvincible: true, // 2-second invincibility on spawn
    }),

  /** FIX 3: Checkpoint restart — resumes from saved wave, not wave 1 */
  restartFromCheckpoint: () =>
    set((s) => ({
      heroHP: 100,
      partnerHP: [80, 80],
      gamePhase: "playing",
      damageMultiplier: 1,
      shieldActive: false,
      spawnInvincible: true, // 2-second invincibility on respawn
      waveCount: Math.max(1, s.checkpointWave),
      // Preserve score so the session continues
    })),
}));

export function getHighScore(): number {
  return Number(localStorage.getItem(STORAGE_HIGH_SCORE) || "0");
}
