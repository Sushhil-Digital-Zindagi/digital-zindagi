import type { Coin } from "../entities/Coin";
import { createCoin } from "../entities/Coin";
/**
 * CreatureManager — wave spawning and management
 */
import {
  type Creature,
  type CreatureType,
  type DeadBody,
  createCreature,
  updateCreature,
} from "../entities/Creature";
import type { Particle } from "../entities/Particle";
import { activateParticle } from "../entities/Particle";

// WAVE_CONFIG: [level][wave] = { counts per type }
const WAVE_CONFIG: Array<Array<Partial<Record<CreatureType, number>>>> = [
  // Level 1
  [{ wolf: 3 }, { wolf: 4, swarm: 2 }, { wolf: 5, swarm: 3 }],
  // Level 2
  [
    { wolf: 5, swarm: 2 },
    { wolf: 6, spider: 1 },
    { wolf: 7, spider: 2 },
  ],
  // Level 3
  [
    { wolf: 6, spider: 2 },
    { wolf: 8, swarm: 4 },
    { spider: 3, beast: 1 },
  ],
  // Level 4
  [
    { wolf: 8, spider: 2 },
    { beast: 2, swarm: 5 },
    { wolf: 10, beast: 2 },
  ],
  // Level 5
  [
    { wolf: 10, spider: 4 },
    { beast: 3, swarm: 8 },
    { wolf: 12, spider: 5 },
  ],
  // Level 6
  [
    { wolf: 12, beast: 3 },
    { spider: 6, swarm: 10 },
    { wolf: 15, beast: 4 },
  ],
  // Level 7
  [
    { wolf: 15, spider: 5, beast: 3 },
    { swarm: 20, wolf: 10 },
    { beast: 6, spider: 8 },
  ],
  // Level 8 — has boss
  [
    { wolf: 20, spider: 5 },
    { beast: 5, swarm: 15 },
    { wolf: 20, beast: 5, boss: 1 },
  ],
  // Level 9
  [
    { wolf: 20, spider: 10, beast: 5 },
    { swarm: 30, wolf: 15 },
    { spider: 12, beast: 8 },
  ],
  // Level 10 — has boss
  [
    { wolf: 25, spider: 10 },
    { beast: 8, swarm: 20 },
    { wolf: 30, beast: 10, boss: 1 },
  ],
  // Level 11
  [
    { wolf: 30, spider: 15, beast: 8 },
    { swarm: 40, wolf: 20 },
    { beast: 12, spider: 15 },
  ],
  // Level 12 — final, has boss
  [
    { wolf: 35, spider: 15 },
    { beast: 10, swarm: 30 },
    { wolf: 40, beast: 15, boss: 1 },
  ],
];

export class CreatureManager {
  creatures: Creature[] = [];
  deadBodies: DeadBody[] = [];
  coins: Coin[] = [];

  private spawnQueue: CreatureType[] = [];
  private spawnTimer = 0;
  private spawnInterval = 0.35;

  getWaveConfig(
    level: number,
    wave: number,
  ): Partial<Record<CreatureType, number>> {
    const l = Math.min(Math.max(0, level - 1), WAVE_CONFIG.length - 1);
    const w = Math.min(Math.max(0, wave - 1), WAVE_CONFIG[l].length - 1);
    return WAVE_CONFIG[l][w];
  }

  startWave(level: number, wave: number): number {
    const cfg = this.getWaveConfig(level, wave);
    this.spawnQueue = [];
    for (const [type, count] of Object.entries(cfg)) {
      for (let i = 0; i < (count ?? 0); i++) {
        this.spawnQueue.push(type as CreatureType);
      }
    }
    // Shuffle
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.spawnQueue[i];
      this.spawnQueue[i] = this.spawnQueue[j];
      this.spawnQueue[j] = tmp;
    }
    this.spawnTimer = 0;
    return this.spawnQueue.length;
  }

  clearForNewLevel() {
    this.creatures = [];
    this.deadBodies = [];
    this.coins = [];
    this.spawnQueue = [];
  }

  getAliveCount(): number {
    return this.creatures.filter((c) => c.isAlive).length;
  }

  getTotalRemaining(): number {
    return this.getAliveCount() + this.spawnQueue.length;
  }

  private spawnCreature(
    worldW: number,
    worldH: number,
    heroX: number,
    heroY: number,
  ) {
    if (this.spawnQueue.length === 0) return;
    const type = this.spawnQueue.pop()!;
    // Spawn at edge of world, away from hero
    let x = 0;
    let y = 0;
    do {
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0:
          x = Math.random() * worldW;
          y = 50;
          break;
        case 1:
          x = Math.random() * worldW;
          y = worldH - 50;
          break;
        case 2:
          x = 50;
          y = Math.random() * worldH;
          break;
        default:
          x = worldW - 50;
          y = Math.random() * worldH;
          break;
      }
    } while (Math.sqrt((x - heroX) ** 2 + (y - heroY) ** 2) < 200);
    this.creatures.push(createCreature(type, x, y));
  }

  update(
    dt: number,
    heroX: number,
    heroY: number,
    worldW: number,
    worldH: number,
    particles: Particle[],
  ): {
    heroHit: number; // total damage to hero this frame
    coinsCollected: number;
  } {
    // Spawn from queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnCreature(worldW, worldH, heroX, heroY);
        this.spawnTimer = this.spawnInterval;
      }
    }

    // Update alive creatures
    let heroHit = 0;
    for (const c of this.creatures) {
      if (!c.isAlive) continue;
      updateCreature(c, heroX, heroY, dt);

      // Check hero contact
      const dx = heroX - c.x;
      const dy = heroY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = c.type === "swarm" ? 25 : c.size + 12;
      if (dist < hitRadius && c.attackCooldown <= 0) {
        heroHit += c.damage;
        c.attackCooldown = 0.8;
      }

      // Handle death
      if (!c.isAlive) {
        this.deadBodies.push({
          x: c.x,
          y: c.y,
          type: c.type,
          angle: c.angle,
          bloodX: c.x + (Math.random() - 0.5) * 20,
          bloodY: c.y + (Math.random() - 0.5) * 20,
        });
        // Blood splatter particles
        for (
          let i = 0;
          i < (c.type === "boss" ? 20 : c.type === "swarm" ? 3 : 10);
          i++
        ) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 120;
          activateParticle(
            particles,
            c.x,
            c.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            "#cc0000",
            3 + Math.random() * 4,
            "blood",
          );
        }
        // Drop coins
        const coinValue =
          c.type === "boss"
            ? 50
            : c.type === "beast"
              ? 15
              : c.type === "spider"
                ? 10
                : 5;
        this.coins.push(
          createCoin(
            c.x + (Math.random() - 0.5) * 30,
            c.y + (Math.random() - 0.5) * 30,
            coinValue,
          ),
        );
      }
    }
    // Remove dead creatures from active list (keep for dead bodies)
    this.creatures = this.creatures.filter((c) => c.isAlive);

    return { heroHit, coinsCollected: 0 };
  }
}
