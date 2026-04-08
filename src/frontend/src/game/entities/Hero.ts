/**
 * Hero — Canvas 2D player entity (not a React component)
 */
import { WEAPONS, type WeaponType } from "../stores/gameStore";
import type { Bullet } from "./Bullet";
import { fireBullet } from "./Bullet";

export interface Hero {
  x: number;
  y: number;
  angle: number;
  speed: number;
  health: number;
  maxHealth: number;
  weapon: WeaponType;
  fireCooldown: number;
  walkTime: number;
  invincibleTimer: number;
  damageFlash: number; // red flash on damage
  muzzleFlash: number; // muzzle flash timer
}

export function createHero(): Hero {
  return {
    x: 1000,
    y: 1000,
    angle: 0,
    speed: 180,
    health: 100,
    maxHealth: 100,
    weapon: "pistol",
    fireCooldown: 0,
    walkTime: 0,
    invincibleTimer: 0,
    damageFlash: 0,
    muzzleFlash: 0,
  };
}

export function updateHero(
  hero: Hero,
  inputX: number,
  inputY: number,
  dt: number,
  nearestEnemyX: number | null,
  nearestEnemyY: number | null,
  bullets: Bullet[],
  speedBoost: number,
  onShoot: () => void,
): void {
  hero.fireCooldown -= dt;
  hero.walkTime += dt;
  if (hero.damageFlash > 0) hero.damageFlash -= dt;
  if (hero.muzzleFlash > 0) hero.muzzleFlash -= dt;
  if (hero.invincibleTimer > 0) hero.invincibleTimer -= dt;

  const spd = hero.speed * (1 + speedBoost * 0.15);
  const len = Math.sqrt(inputX * inputX + inputY * inputY);
  if (len > 0) {
    const nx = len > 1 ? inputX / len : inputX;
    const ny = len > 1 ? inputY / len : inputY;
    hero.x = Math.max(50, Math.min(1950, hero.x + nx * spd * dt));
    hero.y = Math.max(50, Math.min(1950, hero.y + ny * spd * dt));
  }

  // Auto-aim at nearest enemy
  if (nearestEnemyX !== null && nearestEnemyY !== null) {
    hero.angle = Math.atan2(nearestEnemyY - hero.y, nearestEnemyX - hero.x);

    // Auto-fire when enemy is nearby
    const weapon = WEAPONS[hero.weapon];
    const fireRate = weapon.fireRate;
    if (hero.fireCooldown <= 0) {
      hero.fireCooldown = 1 / fireRate;
      // Fire bullets
      const shotCount = hero.weapon === "shotgun" ? 5 : 1;
      for (let i = 0; i < shotCount; i++) {
        fireBullet(
          bullets,
          hero.x,
          hero.y,
          hero.angle,
          weapon.spread,
          weapon.damage,
          hero.weapon,
          weapon.aoe,
        );
      }
      hero.muzzleFlash = 0.08;
      onShoot();
    }
  }
}

export function damageHero(hero: Hero, dmg: number): boolean {
  if (hero.invincibleTimer > 0) return false;
  hero.health = Math.max(0, hero.health - dmg);
  hero.damageFlash = 0.18;
  hero.invincibleTimer = 0.6; // brief invincibility after hit
  return hero.health === 0;
}

export function drawHero(
  ctx: CanvasRenderingContext2D,
  hero: Hero,
  camX: number,
  camY: number,
): void {
  const sx = hero.x - camX;
  const sy = hero.y - camY;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(hero.angle + Math.PI / 2);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (walking animation)
  const legSwing = Math.sin(hero.walkTime * 8) * 6;
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 7;
  // Left leg
  ctx.beginPath();
  ctx.moveTo(-7, 5);
  ctx.lineTo(-8, 20 + legSwing);
  ctx.stroke();
  // Right leg
  ctx.beginPath();
  ctx.moveTo(7, 5);
  ctx.lineTo(8, 20 - legSwing);
  ctx.stroke();
  // Boots
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(-8, 22 + legSwing, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 22 - legSwing, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body — military green jacket
  ctx.fillStyle = hero.damageFlash > 0 ? "#ff4444" : "#1e3a1e";
  ctx.beginPath();
  ctx.roundRect(-11, -14, 22, 22, 4);
  ctx.fill();
  // Jacket detail
  ctx.strokeStyle = "#2d4a2d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(0, 8);
  ctx.stroke();

  // Arms (with weapon)
  const armSwing = Math.sin(hero.walkTime * 8) * 4;
  ctx.strokeStyle = hero.damageFlash > 0 ? "#ff4444" : "#2d4a1e";
  ctx.lineWidth = 6;
  // Left arm
  ctx.beginPath();
  ctx.moveTo(-11, -8);
  ctx.lineTo(-18, 2 + armSwing);
  ctx.stroke();
  // Right arm (weapon side)
  ctx.beginPath();
  ctx.moveTo(11, -8);
  ctx.lineTo(18, 2 - armSwing);
  ctx.stroke();

  // Head
  ctx.fillStyle = hero.damageFlash > 0 ? "#ff4444" : "#C68642";
  ctx.beginPath();
  ctx.arc(0, -22, 10, 0, Math.PI * 2);
  ctx.fill();
  // Helmet
  ctx.fillStyle = "#1a2a1a";
  ctx.beginPath();
  ctx.arc(0, -25, 10, Math.PI, 0);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-3.5, -22, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.5, -22, 2, 0, Math.PI * 2);
  ctx.fill();

  // Weapon in hand
  drawWeapon(ctx, hero.weapon, hero.muzzleFlash);

  ctx.restore();
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponType,
  muzzleFlash: number,
) {
  ctx.save();
  ctx.translate(16, -2);
  switch (weapon) {
    case "pistol":
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.roundRect(-2, -3, 12, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.roundRect(-2, 0, 7, 5, 1);
      ctx.fill();
      break;
    case "rifle":
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.roundRect(-2, -3, 24, 6, 2);
      ctx.fill();
      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.roundRect(0, 0, 10, 5, 1);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.roundRect(16, -2, 8, 4, 1);
      ctx.fill();
      break;
    case "shotgun":
      ctx.fillStyle = "#3a2010";
      ctx.beginPath();
      ctx.roundRect(-2, -4, 20, 8, 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.roundRect(10, -3, 8, 6, 1);
      ctx.fill();
      break;
    case "plasma":
      ctx.fillStyle = "#001a33";
      ctx.beginPath();
      ctx.roundRect(-2, -3, 18, 6, 3);
      ctx.fill();
      ctx.shadowColor = "#00c8ff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#00c8ff";
      ctx.beginPath();
      ctx.arc(16, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    case "flamethrower":
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.roundRect(-2, -4, 22, 8, 2);
      ctx.fill();
      ctx.fillStyle = "#550000";
      ctx.beginPath();
      ctx.roundRect(8, -3, 12, 6, 1);
      ctx.fill();
      break;
  }

  // Muzzle flash
  if (muzzleFlash > 0) {
    const flashX = weapon === "pistol" ? 12 : weapon === "plasma" ? 18 : 24;
    ctx.save();
    ctx.globalAlpha = muzzleFlash / 0.08;
    ctx.fillStyle = weapon === "plasma" ? "#00c8ff" : "#ffee00";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(flashX, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    // Rays
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(flashX, 0);
      ctx.lineTo(flashX + Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}
