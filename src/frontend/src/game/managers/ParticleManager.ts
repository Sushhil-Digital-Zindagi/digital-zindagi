/**
 * ParticleManager — manages blood/effect particle pool
 */
import {
  type Particle,
  activateParticle,
  createParticlePool,
  renderParticles,
  updateParticles,
} from "../entities/Particle";

export class ParticleManager {
  pool: Particle[];

  constructor(poolSize = 300) {
    this.pool = createParticlePool(poolSize);
  }

  bloodSplatter(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      activateParticle(
        this.pool,
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        "#cc0000",
        3 + Math.random() * 5,
        "blood",
      );
    }
  }

  muzzleFlash(x: number, y: number, angle: number): void {
    for (let i = 0; i < 5; i++) {
      const spread = angle + (Math.random() - 0.5) * 0.4;
      const speed = 200 + Math.random() * 150;
      activateParticle(
        this.pool,
        x,
        y,
        Math.cos(spread) * speed,
        Math.sin(spread) * speed,
        "#ffee44",
        3,
        "muzzle",
      );
    }
  }

  hitEffect(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      activateParticle(
        this.pool,
        x,
        y,
        Math.cos(a) * 80,
        Math.sin(a) * 80,
        "#ffffff",
        2,
        "hit",
      );
    }
  }

  ember(x: number, y: number): void {
    const a = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    activateParticle(
      this.pool,
      x,
      y,
      Math.cos(a) * speed,
      Math.sin(a) * speed - 30,
      "#ff6600",
      2 + Math.random() * 3,
      "ember",
    );
  }

  update(dt: number): void {
    updateParticles(this.pool, dt);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    renderParticles(ctx, this.pool, camX, camY);
  }
}
