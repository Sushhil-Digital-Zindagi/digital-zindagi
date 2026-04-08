import { type Bullet, renderBullets, updateBullets } from "../entities/Bullet";
/**
 * BulletManager — manages bullet pool and collision detection
 */
import type { Creature } from "../entities/Creature";
import { damageCreature } from "../entities/Creature";
import type { Particle } from "../entities/Particle";
import { activateParticle } from "../entities/Particle";

export class BulletManager {
  pool: Bullet[];

  constructor(poolSize = 200) {
    this.pool = [];
    for (let i = 0; i < poolSize; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        damage: 10,
        weapon: "pistol",
        active: false,
        age: 0,
        maxAge: 2,
        aoe: 0,
        color: "#fff",
      });
    }
  }

  update(
    dt: number,
    creatures: Creature[],
    particles: Particle[],
    canvasW: number,
    canvasH: number,
    camX: number,
    camY: number,
  ): number {
    updateBullets(this.pool, dt);
    let totalScoreGain = 0;

    for (const b of this.pool) {
      if (!b.active) continue;
      // Cull if far off screen
      const sx = b.x - camX;
      const sy = b.y - camY;
      if (sx < -100 || sx > canvasW + 100 || sy < -100 || sy > canvasH + 100) {
        b.active = false;
        continue;
      }

      for (const c of creatures) {
        if (!c.isAlive) continue;
        const dx = c.x - b.x;
        const dy = c.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = b.aoe > 0 ? b.aoe : c.size;
        if (dist < hitRadius) {
          damageCreature(c, b.damage);
          b.active = false;
          // Hit flash particle
          activateParticle(particles, b.x, b.y, 0, 0, "#ffffff", 5, "hit");
          const SCORE_MAP: Record<string, number> = {
            wolf: 10,
            spider: 20,
            beast: 35,
            swarm: 8,
            boss: 200,
          };
          if (!c.isAlive) {
            totalScoreGain += SCORE_MAP[c.type] ?? 10;
          }
          if (b.aoe > 0) {
            // AOE — hit all in radius
            for (const c2 of creatures) {
              if (!c2.isAlive || c2 === c) continue;
              const d2 = Math.sqrt((c2.x - b.x) ** 2 + (c2.y - b.y) ** 2);
              if (d2 < b.aoe) {
                damageCreature(c2, b.damage * 0.6);
                if (!c2.isAlive) {
                  totalScoreGain += SCORE_MAP[c2.type] ?? 10;
                }
              }
            }
            // AOE particle ring
            for (let i = 0; i < 12; i++) {
              const a = (i / 12) * Math.PI * 2;
              activateParticle(
                particles,
                b.x,
                b.y,
                Math.cos(a) * 80,
                Math.sin(a) * 80,
                "#cc88ff",
                4,
                "hit",
              );
            }
          }
          break;
        }
      }
    }
    return totalScoreGain;
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    renderBullets(ctx, this.pool, camX, camY);
  }
}
