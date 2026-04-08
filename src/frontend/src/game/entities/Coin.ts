/**
 * Coin — glowing collectible entity
 */

export interface Coin {
  x: number;
  y: number;
  value: number;
  active: boolean;
  age: number; // for bounce animation
}

export function createCoin(x: number, y: number, value: number): Coin {
  return { x, y, value, active: true, age: Math.random() * Math.PI * 2 };
}

export function updateCoins(
  coins: Coin[],
  heroX: number,
  heroY: number,
  dt: number,
): number {
  let collected = 0;
  for (const c of coins) {
    if (!c.active) continue;
    c.age += dt * 3;
    const dx = heroX - c.x;
    const dy = heroY - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 35) {
      c.active = false;
      collected += c.value;
    }
  }
  return collected;
}

export function renderCoins(
  ctx: CanvasRenderingContext2D,
  coins: Coin[],
  camX: number,
  camY: number,
): void {
  for (const c of coins) {
    if (!c.active) continue;
    const sx = c.x - camX;
    const sy = c.y - camY + Math.sin(c.age) * 4; // bounce
    ctx.save();
    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(sx, sy, c.value >= 50 ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Coin symbol
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff9";
    ctx.font = `bold ${c.value >= 50 ? 9 : 7}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("₹", sx, sy);
    ctx.restore();
  }
}
