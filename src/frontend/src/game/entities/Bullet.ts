/**
 * Bullet — pooled projectile entity
 */
import type { WeaponType } from "../stores/gameStore";

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  weapon: WeaponType;
  active: boolean;
  age: number; // seconds alive
  maxAge: number; // deactivate after this
  aoe: number; // AOE radius (0 = none)
  color: string;
}

export function createBulletPool(size: number): Bullet[] {
  const pool: Bullet[] = [];
  for (let i = 0; i < size; i++) {
    pool.push({
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
  return pool;
}

const BULLET_SPEED: Record<WeaponType, number> = {
  pistol: 500,
  rifle: 700,
  shotgun: 550,
  plasma: 380,
  flamethrower: 300,
};

const BULLET_COLORS: Record<WeaponType, string> = {
  pistol: "#ffee88",
  rifle: "#88ccff",
  shotgun: "#ffaa44",
  plasma: "#cc88ff",
  flamethrower: "#ff6622",
};

export function fireBullet(
  pool: Bullet[],
  x: number,
  y: number,
  angle: number,
  spread: number,
  damage: number,
  weapon: WeaponType,
  aoe: number,
): void {
  const b = pool.find((bb) => !bb.active);
  if (!b) return;
  const spreadAngle = (Math.random() - 0.5) * spread * 1.5;
  const finalAngle = angle + spreadAngle;
  const speed = BULLET_SPEED[weapon];
  b.x = x;
  b.y = y;
  b.vx = Math.cos(finalAngle) * speed;
  b.vy = Math.sin(finalAngle) * speed;
  b.damage = damage;
  b.weapon = weapon;
  b.active = true;
  b.age = 0;
  b.maxAge = weapon === "flamethrower" ? 0.35 : 1.8;
  b.aoe = aoe;
  b.color = BULLET_COLORS[weapon];
}

export function updateBullets(pool: Bullet[], dt: number): void {
  for (const b of pool) {
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.age += dt;
    if (b.age >= b.maxAge) b.active = false;
  }
}

export function renderBullets(
  ctx: CanvasRenderingContext2D,
  pool: Bullet[],
  camX: number,
  camY: number,
): void {
  for (const b of pool) {
    if (!b.active) continue;
    const sx = b.x - camX;
    const sy = b.y - camY;
    ctx.save();
    const alpha = b.weapon === "flamethrower" ? 1 - b.age / b.maxAge : 0.95;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = b.color;
    if (b.weapon === "plasma") {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.weapon === "flamethrower") {
      ctx.beginPath();
      ctx.arc(sx, sy, 10 * (1 - b.age / b.maxAge) + 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Bullet trail
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - b.vx * 0.02, sy - b.vy * 0.02);
      ctx.stroke();
    }
    ctx.restore();
  }
}
