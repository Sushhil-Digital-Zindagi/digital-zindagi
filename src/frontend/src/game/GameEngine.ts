/**
 * GameEngine — Core Canvas 2D game engine.
 * Initialized ONCE per React mount. Use engineRef to prevent re-init.
 */
import { GameAudio, SFX } from "./audio/AudioEngine";
import { type Bullet, fireBullet } from "./entities/Bullet";
import { renderCoins, updateCoins } from "./entities/Coin";
import { type Creature, drawCreature, drawDeadBody } from "./entities/Creature";
import { createHero, damageHero, drawHero, updateHero } from "./entities/Hero";
import type { Hero } from "./entities/Hero";
import { BulletManager } from "./managers/BulletManager";
import { CreatureManager } from "./managers/CreatureManager";
import { ParticleManager } from "./managers/ParticleManager";
import { useGameStore } from "./stores/gameStore";

const WORLD_W = 2000;
const WORLD_H = 2000;

type EngineCallback = (data: {
  score?: number;
  coins?: number;
  heroHP?: number;
  enemiesRemaining?: number;
}) => void;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId = 0;
  private lastTime = 0;
  private hero: Hero;
  private bulletManager: BulletManager;
  private creatureManager: CreatureManager;
  private particleManager: ParticleManager;
  private keysPressed: Set<string> = new Set();
  private joystick = { x: 0, y: 0 };
  private fireHeld = false;
  private screenShake = 0;
  private emberTimer = 0;
  private wavePauseTimer = 0;
  private onStateUpdate: EngineCallback;
  private destroyed = false;

  // Bound event handlers (store refs for cleanup)
  private _keyDown: (e: KeyboardEvent) => void;
  private _keyUp: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, onStateUpdate: EngineCallback) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get 2D context");
    this.ctx = ctx;
    this.onStateUpdate = onStateUpdate;
    this.hero = createHero();
    this.bulletManager = new BulletManager(300);
    this.creatureManager = new CreatureManager();
    this.particleManager = new ParticleManager(400);

    this._keyDown = (e: KeyboardEvent) => {
      this.keysPressed.add(e.code);
      if (e.code === "Space") e.preventDefault();
    };
    this._keyUp = (e: KeyboardEvent) => this.keysPressed.delete(e.code);

    window.addEventListener("keydown", this._keyDown);
    window.addEventListener("keyup", this._keyUp);

    this.resize();
  }

  setJoystick(x: number, y: number) {
    this.joystick = { x, y };
  }
  setFireHeld(held: boolean) {
    this.fireHeld = held;
  }

  startGameLoop() {
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  }

  private gameLoop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const store = useGameStore.getState();
    if (store.gamePhase === "playing") {
      this.update(dt, store);
    }
    this.render(store);
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  startWave(level: number, wave: number) {
    this.creatureManager.clearForNewLevel();
    const total = this.creatureManager.startWave(level, wave);
    useGameStore.getState().setEnemiesRemaining(total);
    this.wavePauseTimer = 0;
  }

  private update(dt: number, store: ReturnType<typeof useGameStore.getState>) {
    // Input
    let ix = this.joystick.x;
    let iy = this.joystick.y;
    if (this.keysPressed.has("KeyW") || this.keysPressed.has("ArrowUp"))
      iy -= 1;
    if (this.keysPressed.has("KeyS") || this.keysPressed.has("ArrowDown"))
      iy += 1;
    if (this.keysPressed.has("KeyA") || this.keysPressed.has("ArrowLeft"))
      ix -= 1;
    if (this.keysPressed.has("KeyD") || this.keysPressed.has("ArrowRight"))
      ix += 1;

    // Find nearest alive creature
    const alive = this.creatureManager.creatures.filter(
      (c: Creature) => c.isAlive,
    );
    let nearestX: number | null = null;
    let nearestY: number | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const c of alive) {
      const d = Math.sqrt((c.x - this.hero.x) ** 2 + (c.y - this.hero.y) ** 2);
      if (d < nearestDist && d < 500) {
        nearestDist = d;
        nearestX = c.x;
        nearestY = c.y;
      }
    }

    // Force fire if fire button held
    if (this.fireHeld && nearestX === null) {
      nearestX = this.hero.x + Math.cos(this.hero.angle) * 300;
      nearestY = this.hero.y + Math.sin(this.hero.angle) * 300;
    }

    // Update hero
    this.hero.weapon = store.currentWeapon;
    updateHero(
      this.hero,
      ix,
      iy,
      dt,
      nearestX,
      nearestY,
      this.bulletManager.pool,
      store.speedBoost,
      () => {
        SFX.gunshot(store.volume * 0.5);
        this.particleManager.muzzleFlash(
          this.hero.x,
          this.hero.y,
          this.hero.angle,
        );
      },
    );

    // Update bullets & check creature hits
    const camX = this.hero.x - this.canvas.width / 2;
    const camY = this.hero.y - this.canvas.height / 2;
    const scoreGain = this.bulletManager.update(
      dt,
      this.creatureManager.creatures,
      this.particleManager.pool,
      this.canvas.width,
      this.canvas.height,
      camX,
      camY,
    );

    if (scoreGain > 0) {
      store.addScore(scoreGain);
      store.decrementEnemies();
      SFX.creatureDie(store.volume * 0.4);
    }

    // Update creatures
    const { heroHit } = this.creatureManager.update(
      dt,
      this.hero.x,
      this.hero.y,
      WORLD_W,
      WORLD_H,
      this.particleManager.pool,
    );

    if (heroHit > 0 && !store.spawnInvincible) {
      const dead = damageHero(this.hero, heroHit);
      store.damageHero(heroHit);
      this.screenShake = 0.3;
      SFX.playerDamage(store.volume * 0.4);
      if (dead) GameAudio.stopTheme();
    }

    // Collect coins
    const coinsCollected = updateCoins(
      this.creatureManager.coins,
      this.hero.x,
      this.hero.y,
      dt,
    );
    if (coinsCollected > 0) {
      store.addCoins(coinsCollected);
      SFX.coinCollect(store.volume * 0.35);
    }

    // Update particles
    this.particleManager.update(dt);

    // Ember spawner
    this.emberTimer -= dt;
    if (this.emberTimer <= 0) {
      this.emberTimer = 0.08 + Math.random() * 0.15;
      this.particleManager.ember(
        this.hero.x + (Math.random() - 0.5) * 800,
        this.hero.y + (Math.random() - 0.5) * 600,
      );
    }

    if (this.screenShake > 0) this.screenShake -= dt;

    // Check wave completion
    const remaining = this.creatureManager.getTotalRemaining();
    const prevRemaining = store.enemiesRemaining;
    if (remaining !== prevRemaining) {
      store.setEnemiesRemaining(remaining);
    }

    if (
      remaining === 0 &&
      this.wavePauseTimer === 0 &&
      store.gamePhase === "playing"
    ) {
      this.wavePauseTimer = 0.1;
    }
    if (this.wavePauseTimer > 0) {
      this.wavePauseTimer -= dt;
      if (this.wavePauseTimer <= 0) {
        this.wavePauseTimer = 0;
        store.nextWave();
        if (store.currentWave <= 3 && store.currentLevel <= 12) {
          this.startWave(
            store.currentLevel,
            store.currentWave + 1 > 3 ? 1 : store.currentWave + 1,
          );
        }
        SFX.levelComplete(store.volume * 0.5);
      }
    }

    this.onStateUpdate({ heroHP: this.hero.health });
  }

  private render(store: ReturnType<typeof useGameStore.getState>) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const camX = this.hero.x - W / 2;
    const camY = this.hero.y - H / 2;

    ctx.save();
    if (this.screenShake > 0) {
      const shake = this.screenShake * 8;
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake,
      );
    }

    // Background
    ctx.fillStyle = "#0a0602";
    ctx.fillRect(0, 0, W, H);

    // Draw ground tiles
    this.drawGround(ctx, camX, camY, W, H);

    // Background DZ watermark
    this.drawWatermark(ctx, W, H);

    // Dead bodies (stay on ground)
    for (const body of this.creatureManager.deadBodies) {
      drawDeadBody(ctx, body, camX, camY);
    }

    // Coins
    renderCoins(ctx, this.creatureManager.coins, camX, camY);

    // Bullets
    this.bulletManager.render(ctx, camX, camY);

    // Creatures
    for (const c of this.creatureManager.creatures) {
      drawCreature(ctx, c, camX, camY);
    }

    // Hero
    if (store.gamePhase === "playing") {
      drawHero(ctx, this.hero, camX, camY);
    }

    // Particles (on top)
    this.particleManager.render(ctx, camX, camY);

    // Edge fog
    this.drawFog(ctx, W, H);

    // Screen red flash on damage
    if (this.hero.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.hero.damageFlash * 0.5;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    W: number,
    H: number,
  ) {
    // Tile the ground
    const tileSize = 80;
    const startX = Math.floor(camX / tileSize) * tileSize;
    const startY = Math.floor(camY / tileSize) * tileSize;

    for (let tx = startX; tx < camX + W + tileSize; tx += tileSize) {
      for (let ty = startY; ty < camY + H + tileSize; ty += tileSize) {
        const sx = tx - camX;
        const sy = ty - camY;
        // Alternate dark stone tiles
        const col = (tx / tileSize + ty / tileSize) % 2;
        ctx.fillStyle = col === 0 ? "#0e0a06" : "#110c07";
        ctx.fillRect(sx, sy, tileSize, tileSize);
        // Tile edge
        ctx.strokeStyle = "#1a1208";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, tileSize, tileSize);
      }
    }

    // Red glowing cracks
    ctx.save();
    ctx.strokeStyle = "#550000";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 4;
    // Pre-seeded cracks (deterministic positions)
    const cracks = [
      [200, 300, 350, 280],
      [500, 150, 520, 310],
      [800, 400, 750, 450],
      [1200, 600, 1300, 580],
      [1600, 200, 1620, 380],
      [400, 900, 450, 1000],
      [900, 1200, 850, 1100],
      [1400, 1400, 1500, 1350],
      [300, 1600, 350, 1700],
      [1700, 800, 1800, 850],
      [600, 1800, 700, 1750],
      [1100, 300, 1050, 450],
      [1800, 1600, 1850, 1700],
      [700, 700, 750, 800],
      [1300, 1100, 1250, 1200],
    ];
    for (const [x1, y1, x2, y2] of cracks) {
      ctx.beginPath();
      ctx.moveTo(x1 - camX, y1 - camY);
      ctx.lineTo(x2 - camX, y2 - camY);
      ctx.stroke();
    }
    ctx.restore();

    // Scattered bones & debris
    this.drawDebris(ctx, camX, camY);
  }

  private drawDebris(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
  ) {
    const debris = [
      { x: 350, y: 200 },
      { x: 750, y: 450 },
      { x: 1100, y: 800 },
      { x: 1500, y: 300 },
      { x: 200, y: 1200 },
      { x: 900, y: 1600 },
      { x: 1700, y: 1100 },
      { x: 600, y: 600 },
      { x: 1350, y: 1700 },
      { x: 450, y: 1500 },
      { x: 1200, y: 200 },
      { x: 1800, y: 600 },
    ];
    ctx.strokeStyle = "#4a3a20";
    ctx.lineWidth = 2;
    for (const d of debris) {
      const sx = d.x - camX;
      const sy = d.y - camY;
      if (
        sx < -50 ||
        sx > this.canvas.width + 50 ||
        sy < -50 ||
        sy > this.canvas.height + 50
      )
        continue;
      // Bone shape
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy - 5);
      ctx.lineTo(sx + 10, sy + 5);
      ctx.stroke();
      ctx.fillStyle = "#5a4a28";
      ctx.beginPath();
      ctx.arc(sx - 11, sy - 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + 11, sy + 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWatermark(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.font = "bold 88px sans-serif";
    ctx.fillStyle = "#ff4400";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Pulsing ember glow
    ctx.shadowColor = "#ff6600";
    ctx.shadowBlur = 30;
    ctx.fillText("डिजिटल ज़िंदगी", W / 2, H / 2 - 40);
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("WILD SIEGE", W / 2, H / 2 + 60);
    ctx.restore();
  }

  private drawFog(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const grad = ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.3,
      W / 2,
      H / 2,
      H * 0.8,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.canvas.style.width = `${W}px`;
    this.canvas.style.height = `${H}px`;
    this.canvas.width = W * dpr;
    this.canvas.height = H * dpr;
    this.ctx.scale(dpr, dpr);
    // After resize, ctx scale is reset — reapply
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("keydown", this._keyDown);
    window.removeEventListener("keyup", this._keyUp);
    GameAudio.stopTheme();
  }
}
