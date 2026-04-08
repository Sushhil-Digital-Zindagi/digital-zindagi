/**
 * Creature — all 5 creature types drawn with Canvas 2D geometry.
 * No external assets — all shapes are programmatic.
 */

export type CreatureType = "wolf" | "spider" | "beast" | "swarm" | "boss";

export interface DeadBody {
  x: number;
  y: number;
  type: CreatureType;
  angle: number;
  bloodX: number;
  bloodY: number;
}

export interface Creature {
  id: number;
  type: CreatureType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  coins: number;
  points: number;
  isAlive: boolean;
  angle: number;
  age: number; // for animation
  flashTimer: number; // white flash on hit
  size: number;
  attackCooldown: number;
  webCooldown: number; // for spider
  swarmDots?: { dx: number; dy: number }[]; // for swarm
}

let _nextId = 1;

export function createCreature(
  type: CreatureType,
  x: number,
  y: number,
): Creature {
  const configs: Record<CreatureType, Partial<Creature>> = {
    wolf: {
      health: 60,
      maxHealth: 60,
      speed: 140,
      damage: 12,
      coins: 5,
      points: 10,
      size: 22,
    },
    spider: {
      health: 100,
      maxHealth: 100,
      speed: 80,
      damage: 15,
      coins: 10,
      points: 20,
      size: 28,
    },
    beast: {
      health: 200,
      maxHealth: 200,
      speed: 55,
      damage: 30,
      coins: 15,
      points: 35,
      size: 38,
    },
    swarm: {
      health: 20,
      maxHealth: 20,
      speed: 190,
      damage: 8,
      coins: 5,
      points: 8,
      size: 14,
    },
    boss: {
      health: 1200,
      maxHealth: 1200,
      speed: 35,
      damage: 50,
      coins: 50,
      points: 200,
      size: 70,
    },
  };
  const cfg = configs[type];
  const swarmDots =
    type === "swarm"
      ? Array.from({ length: 18 }, () => ({
          dx: (Math.random() - 0.5) * 30,
          dy: (Math.random() - 0.5) * 30,
        }))
      : undefined;
  return {
    id: _nextId++,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    age: 0,
    flashTimer: 0,
    isAlive: true,
    attackCooldown: 0,
    webCooldown: 0,
    swarmDots,
    ...cfg,
  } as Creature;
}

export function updateCreature(
  c: Creature,
  heroX: number,
  heroY: number,
  dt: number,
): void {
  if (!c.isAlive) return;
  c.age += dt;
  if (c.flashTimer > 0) c.flashTimer -= dt;
  if (c.attackCooldown > 0) c.attackCooldown -= dt;
  if (c.webCooldown > 0) c.webCooldown -= dt;

  const dx = heroX - c.x;
  const dy = heroY - c.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 2) {
    c.angle = Math.atan2(dy, dx);
    const nx = dx / dist;
    const ny = dy / dist;
    // Slight oscillation for natural movement
    const wobble = Math.sin(c.age * 4 + c.id) * 0.15;
    c.vx = (nx + wobble) * c.speed;
    c.vy = (ny + wobble * 0.5) * c.speed;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
  }

  // Swarm: orbit slight offsets
  if (c.type === "swarm" && c.swarmDots) {
    for (const dot of c.swarmDots) {
      dot.dx += (Math.random() - 0.5) * 2;
      dot.dy += (Math.random() - 0.5) * 2;
      dot.dx = Math.max(-15, Math.min(15, dot.dx));
      dot.dy = Math.max(-15, Math.min(15, dot.dy));
    }
  }
}

export function damageCreature(c: Creature, dmg: number): void {
  c.health = Math.max(0, c.health - dmg);
  c.flashTimer = 0.1;
  if (c.health === 0) c.isAlive = false;
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

export function drawCreature(
  ctx: CanvasRenderingContext2D,
  c: Creature,
  camX: number,
  camY: number,
): void {
  if (!c.isAlive) return;
  const sx = c.x - camX;
  const sy = c.y - camY;
  ctx.save();
  ctx.translate(sx, sy);
  if (c.flashTimer > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.8;
  }
  switch (c.type) {
    case "wolf":
      drawWolf(ctx, c);
      break;
    case "spider":
      drawSpider(ctx, c);
      break;
    case "beast":
      drawBeast(ctx, c);
      break;
    case "swarm":
      drawSwarm(ctx, c);
      break;
    case "boss":
      drawBoss(ctx, c);
      break;
  }
  ctx.restore();

  // Health bar for boss and beast
  if (c.type === "boss" || c.type === "beast") {
    const barW = c.size * 2;
    const bx = sx - barW / 2;
    const by = sy - c.size - 10;
    ctx.fillStyle = "#300";
    ctx.fillRect(bx, by, barW, 5);
    ctx.fillStyle = c.type === "boss" ? "#f00" : "#a00";
    ctx.fillRect(bx, by, barW * (c.health / c.maxHealth), 5);
  }
}

function drawWolf(ctx: CanvasRenderingContext2D, c: Creature) {
  const s = c.size;
  const legAnim = Math.sin(c.age * 10) * 5;
  ctx.rotate(c.angle + Math.PI / 2);

  // Body — elongated ellipse
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#3a3a3a";
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.45, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fur texture streaks
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 6, -s * 0.4);
    ctx.lineTo(i * 6, s * 0.4);
    ctx.stroke();
  }

  // Legs (4 legs)
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 3;
  const legPairs = [
    [-s * 0.4, -s * 0.25],
    [s * 0.4, -s * 0.25],
    [-s * 0.4, s * 0.25],
    [s * 0.4, s * 0.25],
  ];
  for (const [lx, ly] of legPairs) {
    const anim = Math.abs(lx) > 0 ? (lx > 0 ? legAnim : -legAnim) : 0;
    ctx.beginPath();
    ctx.moveTo(lx * 0.5, ly);
    ctx.lineTo(lx, ly + anim);
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#444";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.65, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snout / teeth
  ctx.fillStyle = "#666";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.75, s * 0.18, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Teeth
  ctx.fillStyle = "#eee";
  for (const tx of [-s * 0.08, 0, s * 0.08]) {
    ctx.beginPath();
    ctx.moveTo(tx, -s * 0.7);
    ctx.lineTo(tx - 3, -s * 0.82);
    ctx.lineTo(tx + 3, -s * 0.82);
    ctx.closePath();
    ctx.fill();
  }

  // Glowing red eyes
  ctx.fillStyle = "#ff1a1a";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-s * 0.13, -s * 0.68, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.13, -s * 0.68, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Tail
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.6);
  ctx.quadraticCurveTo(s * 0.4, s * 0.7 + legAnim * 0.5, s * 0.2, s * 0.9);
  ctx.stroke();
}

function drawSpider(ctx: CanvasRenderingContext2D, c: Creature) {
  const s = c.size;
  const legAnim = Math.sin(c.age * 6) * 8;

  // 8 legs
  ctx.strokeStyle = c.flashTimer > 0 ? "#fff" : "#1a1a1a";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const idx = i < 4 ? i : i - 4;
    const baseAngle = (idx - 1.5) * 0.5;
    const anim = Math.sin(c.age * 6 + i) * legAnim;
    const lx = side * s * 0.25;
    const ly = (idx - 1.5) * s * 0.3;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + side * s * 0.7 * Math.cos(baseAngle), ly + anim);
    ctx.lineTo(
      lx + side * s * 1.1 * Math.cos(baseAngle * 0.7),
      ly + s * 0.35 + anim * 0.5,
    );
    ctx.stroke();
  }

  // Abdomen (rear body)
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#111";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.25, s * 0.4, s * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Abdomen markings
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.1);
  ctx.lineTo(0, s * 0.7);
  ctx.stroke();

  // Cephalothorax (front body)
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#1c1c1c";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, s * 0.32, s * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye cluster (4 red eyes)
  ctx.fillStyle = "#cc0000";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 6;
  const eyePositions = [
    [-s * 0.12, -s * 0.25],
    [s * 0.12, -s * 0.25],
    [-s * 0.06, -s * 0.15],
    [s * 0.06, -s * 0.15],
  ];
  for (const [ex, ey] of eyePositions) {
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawBeast(ctx: CanvasRenderingContext2D, c: Creature) {
  const s = c.size;
  const breathe = Math.sin(c.age * 2) * 2;
  ctx.rotate(c.angle + Math.PI / 2);

  // Main body — large rectangle with rounded corners
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#2d1a0e";
  ctx.beginPath();
  ctx.roundRect(-s * 0.5, -s * 0.6, s, s * 1.2, 8);
  ctx.fill();
  // Body texture
  ctx.strokeStyle = "#4a2a0e";
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * s * 0.15, -s * 0.4);
    ctx.lineTo(i * s * 0.18, s * 0.4);
    ctx.stroke();
  }

  // Head — large and square
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#3a2010";
  ctx.beginPath();
  ctx.roundRect(-s * 0.42, -s * 0.9 + breathe, s * 0.84, s * 0.55, 6);
  ctx.fill();

  // TWO CURVED HORNS
  ctx.strokeStyle = c.flashTimer > 0 ? "#fff" : "#8B4513";
  ctx.lineWidth = 5;
  // Left horn
  ctx.beginPath();
  ctx.moveTo(-s * 0.35, -s * 0.88 + breathe);
  ctx.quadraticCurveTo(-s * 0.6, -s * 1.4, -s * 0.25, -s * 1.5);
  ctx.stroke();
  // Right horn
  ctx.beginPath();
  ctx.moveTo(s * 0.35, -s * 0.88 + breathe);
  ctx.quadraticCurveTo(s * 0.6, -s * 1.4, s * 0.25, -s * 1.5);
  ctx.stroke();

  // Orange glowing eyes
  ctx.fillStyle = "#ff6600";
  ctx.shadowColor = "#ff4400";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.68 + breathe, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.68 + breathe, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Nostrils
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.ellipse(-s * 0.08, -s * 0.55 + breathe, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.08, -s * 0.55 + breathe, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSwarm(ctx: CanvasRenderingContext2D, c: Creature) {
  if (!c.swarmDots) return;
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#111";
  for (const dot of c.swarmDots) {
    const wiggle = Math.sin(c.age * 8 + dot.dx) * 3;
    ctx.beginPath();
    ctx.arc(dot.dx + wiggle, dot.dy, 4, 0, Math.PI * 2);
    ctx.fill();
    // Red eye
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();
    ctx.arc(dot.dx + wiggle, dot.dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#111";
  }
}

function drawBoss(ctx: CanvasRenderingContext2D, c: Creature) {
  const s = c.size;
  const breathe = Math.sin(c.age * 1.5) * 4;

  // 6 thick legs
  ctx.strokeStyle = c.flashTimer > 0 ? "#fff" : "#1a0a00";
  ctx.lineWidth = 6;
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const idx = i < 3 ? i : i - 3;
    const baseAngle = (idx - 1) * 0.7;
    const legAnim = Math.sin(c.age * 3 + i * 1.2) * 12;
    ctx.beginPath();
    ctx.moveTo(side * s * 0.35, (idx - 1) * s * 0.45);
    ctx.lineTo(
      side * s * 0.85 * Math.cos(baseAngle),
      (idx - 1) * s * 0.45 + legAnim,
    );
    ctx.lineTo(
      side * s * 1.3 * Math.cos(baseAngle * 0.8),
      (idx - 1) * s * 0.45 + s * 0.4 + legAnim * 0.5,
    );
    ctx.stroke();
  }

  // Abdomen
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#180800";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.2 + breathe, s * 0.55, s * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  // Abdomen markings
  ctx.strokeStyle = "#300";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(0, s * 0.2 + breathe, (i + 1) * s * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cephalothorax
  ctx.fillStyle = c.flashTimer > 0 ? "#fff" : "#220e00";
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.35, s * 0.48, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horns on boss
  ctx.strokeStyle = "#5a2000";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.6);
  ctx.quadraticCurveTo(-s * 0.7, -s * 1.1, -s * 0.4, -s * 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.3, -s * 0.6);
  ctx.quadraticCurveTo(s * 0.7, -s * 1.1, s * 0.4, -s * 1.3);
  ctx.stroke();

  // 6 glowing red eyes
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 15;
  const eyePos = [
    [-s * 0.22, -s * 0.42],
    [s * 0.22, -s * 0.42],
    [-s * 0.1, -s * 0.3],
    [s * 0.1, -s * 0.3],
    [-s * 0.18, -s * 0.2],
    [s * 0.18, -s * 0.2],
  ];
  for (const [ex, ey] of eyePos) {
    const pulse = 0.7 + Math.sin(c.age * 4 + ex) * 0.3;
    ctx.fillStyle = `rgba(255, ${Math.floor(pulse * 30)}, 0, 1)`;
    ctx.beginPath();
    ctx.arc(ex, ey, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

export function drawDeadBody(
  ctx: CanvasRenderingContext2D,
  body: DeadBody,
  camX: number,
  camY: number,
): void {
  const sx = body.x - camX;
  const sy = body.y - camY;
  ctx.save();
  ctx.globalAlpha = 0.45;

  // Blood stain
  ctx.fillStyle = "#4a0000";
  ctx.beginPath();
  ctx.ellipse(
    body.bloodX - camX,
    body.bloodY - camY,
    20,
    14,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.translate(sx, sy);
  ctx.rotate(body.angle);
  ctx.fillStyle = "#1a1a1a";

  switch (body.type) {
    case "wolf":
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spider":
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        ctx.stroke();
      }
      break;
    case "beast":
      ctx.beginPath();
      ctx.roundRect(-14, -20, 28, 40, 5);
      ctx.fill();
      break;
    case "swarm":
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      break;
    case "boss":
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}
