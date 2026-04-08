/**
 * Particle — pooled blood/effect particle
 */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number; // 0-1, decreases over time
  size: number;
  active: boolean;
  type: "blood" | "muzzle" | "hit" | "ember";
}

export function createParticlePool(size: number): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      color: "#f00",
      alpha: 1,
      life: 0,
      size: 4,
      active: false,
      type: "blood",
    });
  }
  return pool;
}

export function activateParticle(
  pool: Particle[],
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  size: number,
  type: Particle["type"] = "blood",
): void {
  const p = pool.find((pp) => !pp.active);
  if (!p) return;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.color = color;
  p.size = size;
  p.life = 1;
  p.alpha = 1;
  p.active = true;
  p.type = type;
}

export function updateParticles(pool: Particle[], dt: number): void {
  for (const p of pool) {
    if (!p.active) continue;
    const speed = p.type === "muzzle" ? 6 : 1;
    p.x += p.vx * dt * speed;
    p.y += p.vy * dt * speed;
    p.vy += p.type !== "muzzle" ? dt * 20 : 0; // gravity
    p.life -= dt * (p.type === "muzzle" ? 8 : 2);
    p.alpha = Math.max(0, p.life);
    if (p.life <= 0) p.active = false;
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  pool: Particle[],
  camX: number,
  camY: number,
): void {
  for (const p of pool) {
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y - camY, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
