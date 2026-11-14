import { PatisserieAudio } from './audio';
import { CAKE_FLAVORS, getFlavorForHeight, getNextFlavorForHeight } from './flavors';
import { renderPatisserieScene } from './renderer';
import type {
  CakeFlavor,
  CreamPuffEffect,
  DebrisPiece,
  FallingTrailMote,
  FloatingCallout,
  FloatingPropOrb,
  GameStatus,
  HudSnapshot,
  LightBeamEffect,
  Particle,
  PropInventory,
  PropType,
  ShockwaveRing,
  SliceLineEffect,
  StackedLayer,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (finalSnapshot: HudSnapshot) => void;
  onFlavorUnlocked: (flavor: CakeFlavor) => void;
}

const GRAVITY = 2500;
const DEBRIS_GRAVITY = 1550;
const MAX_PROP_STOCK = 3;

export class CakeTowerEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: PatisserieAudio;
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private ambientTime = 0;

  private width = 375;
  private height = 667;
  private dpr = 1;

  private backdropImg: HTMLImageElement | null = null;
  private backdropLoaded = false;

  // Game State
  private status: GameStatus = 'TITLE_MENU';
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private bestScore = 0;
  private isNewRecord = false;
  private unlockedIds = new Set<string>(['fraisier']);
  private newlyUnlockedFlavor: CakeFlavor | null = null;

  // Props Inventory & Active Buffs
  private props: PropInventory = { slow: 1, magnet: 1, widen: 1, shield: 1 };
  private slowRemaining = 0;
  private magnetArmed = false;
  private shieldArmed = false;
  private nextPropSpawnHeight = 2;
  private nextOrbId = 1;
  private propOrbs: FloatingPropOrb[] = [];
  private slowHudSyncAccum = 0;

  // World & Camera Metrics
  private pedestalWidth = 220;
  private initialCakeWidth = 160;
  private layerHeight = 34;
  private cameraY = 0;
  private targetCameraY = 0;
  private zoom = 1;
  private targetZoom = 1;

  // Hitstop, Screen Shake & Flash
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;
  private screenFlashAlpha = 0;
  private screenFlashColor = '#FFF8DC';

  // Tower & Active Pendulum Cake
  private stack: StackedLayer[] = [];
  private nextLayerId = 1;
  private activeWidth = 160;
  private activeFlavor: CakeFlavor = CAKE_FLAVORS[0];
  private phase: 'SWINGING' | 'FALLING' | 'GAMEOVER_IDLE' = 'SWINGING';

  // Pendulum Physics
  private pendulumTime = 0;
  private ropeLength = 120;
  private pendulumAngle = 0;
  private swingPivotScreenY = 92;
  private clipOpen = 0;
  private cakeSpawnScale = 1;

  // Falling Cake State
  private fallX = 0;
  private fallY = 0;
  private fallVy = 0;
  private fallRotation = 0;
  private trailSpawnAccum = 0;
  private feverSparkleAccum = 0;

  // Pooled VFX Collections
  private debris: DebrisPiece[] = [];
  private particles: Particle[] = [];
  private callouts: FloatingCallout[] = [];
  private sliceLines: SliceLineEffect[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private lightBeams: LightBeamEffect[] = [];
  private creamPuffs: CreamPuffEffect[] = [];
  private fallingTrails: FallingTrailMote[] = [];

  private bufferedDrop = false;

  constructor(
    canvas: HTMLCanvasElement,
    audio: PatisserieAudio,
    callbacks: EngineCallbacks,
    initialBestScore: number,
    initialUnlockedIds: string[],
    backdropUrl: string
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.audio = audio;
    this.callbacks = callbacks;
    this.bestScore = initialBestScore;
    this.unlockedIds = new Set(initialUnlockedIds);

    this.loadBackdrop(backdropUrl);
    this.resize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
    this.setupTitleDemo();
  }

  private loadBackdrop(url: string): void {
    const img = new Image();
    img.onload = () => {
      this.backdropImg = img;
      this.backdropLoaded = true;
    };
    img.onerror = () => {
      this.backdropLoaded = false;
    };
    img.src = url;
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      this.update(dt);
      this.render();
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.audio.stopMusic();
  }

  public resize(clientW: number, clientH: number): void {
    if (clientW <= 0 || clientH <= 0) return;
    this.width = clientW;
    this.height = clientH;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    this.canvas.width = Math.round(clientW * this.dpr);
    this.canvas.height = Math.round(clientH * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const playfieldW = Math.min(clientW, 520);
    const prevInitialW = this.initialCakeWidth;
    this.pedestalWidth = Math.round(playfieldW * 0.64);
    this.initialCakeWidth = Math.round(playfieldW * 0.45);
    this.layerHeight = Math.round(Math.max(30, Math.min(40, clientH * 0.052)));
    this.ropeLength = Math.round(Math.max(78, Math.min(148, clientH * 0.175)));
    this.swingPivotScreenY = Math.round(Math.max(72, Math.min(104, clientH * 0.115)));

    if (this.stack.length === 0 && prevInitialW > 0 && this.status === 'PLAYING') {
      this.activeWidth = this.initialCakeWidth;
    }
  }

  public syncBestScore(bestScore: number): void {
    this.bestScore = bestScore;
  }

  private clearVfx(): void {
    this.debris = [];
    this.particles = [];
    this.callouts = [];
    this.sliceLines = [];
    this.shockwaves = [];
    this.lightBeams = [];
    this.creamPuffs = [];
    this.fallingTrails = [];
    this.propOrbs = [];
    this.screenFlashAlpha = 0;
  }

  public setupTitleDemo(): void {
    this.audio.stopMusic();
    this.status = 'TITLE_MENU';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.isNewRecord = false;
    this.newlyUnlockedFlavor = null;
    this.props = { slow: 1, magnet: 1, widen: 1, shield: 1 };
    this.slowRemaining = 0;
    this.magnetArmed = false;
    this.shieldArmed = false;
    this.clearVfx();

    this.stack = [
      {
        id: 1,
        x: 0,
        y: 0,
        width: this.initialCakeWidth,
        height: this.layerHeight,
        flavor: CAKE_FLAVORS[0],
        isPerfect: true,
        squashTime: 1,
      },
      {
        id: 2,
        x: 4,
        y: this.layerHeight,
        width: this.initialCakeWidth * 0.9,
        height: this.layerHeight,
        flavor: CAKE_FLAVORS[1],
        isPerfect: false,
        squashTime: 1,
      },
      {
        id: 3,
        x: -2,
        y: this.layerHeight * 2,
        width: this.initialCakeWidth * 0.82,
        height: this.layerHeight,
        flavor: CAKE_FLAVORS[2],
        isPerfect: true,
        squashTime: 1,
      },
    ];
    this.activeWidth = this.initialCakeWidth * 0.78;
    this.activeFlavor = CAKE_FLAVORS[3];
    this.phase = 'SWINGING';
    this.cameraY = 0;
    this.targetCameraY = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.clipOpen = 0;
    this.cakeSpawnScale = 1;
    this.emitHud();
  }

  public startNewGame(): void {
    this.audio.unlock();
    this.audio.setMusicMood(0, false);
    this.audio.startMusic();

    this.status = 'PLAYING';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.isNewRecord = false;
    this.newlyUnlockedFlavor = null;

    // Grant starter patisserie toolkit each run
    this.props = { slow: 1, magnet: 1, widen: 1, shield: 1 };
    this.slowRemaining = 0;
    this.magnetArmed = false;
    this.shieldArmed = false;
    this.nextPropSpawnHeight = 2;
    this.slowHudSyncAccum = 0;

    this.stack = [];
    this.nextLayerId = 1;
    this.activeWidth = this.initialCakeWidth;
    this.activeFlavor = getFlavorForHeight(0);
    this.phase = 'SWINGING';
    this.pendulumTime = Math.PI * 0.25;
    this.clipOpen = 0;
    this.cakeSpawnScale = 0.25;
    this.bufferedDrop = false;

    this.cameraY = 0;
    this.targetCameraY = 0;
    this.zoom = 1;
    this.targetZoom = 1;
    this.hitstopTimer = 0;
    this.shakeTimer = 0;
    this.trailSpawnAccum = 0;
    this.feverSparkleAccum = 0;

    this.clearVfx();
    this.emitHud();
  }

  public pause(): void {
    if (this.status !== 'PLAYING') return;
    this.status = 'PAUSED';
    this.audio.stopMusic();
    this.emitHud();
  }

  public resume(): void {
    if (this.status !== 'PAUSED') return;
    this.status = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.audio.setMusicMood(this.combo, this.slowRemaining > 0);
    this.audio.startMusic();
    this.emitHud();
  }

  public returnToTitle(): void {
    this.setupTitleDemo();
  }

  public handleTap(): void {
    if (this.status !== 'PLAYING') return;
    this.audio.unlock();

    if (this.phase === 'SWINGING') {
      this.releaseCake();
    } else if (this.phase === 'FALLING') {
      this.bufferedDrop = true;
    }
  }

  public activateProp(type: PropType): void {
    if (this.status !== 'PLAYING') return;
    this.audio.unlock();

    if (this.props[type] <= 0) return;

    const bob = this.getPendulumBobWorldPos();

    if (type === 'slow') {
      this.props.slow -= 1;
      this.slowRemaining = Math.min(8, this.slowRemaining + 6.0);
      this.audio.setMusicMood(this.combo, true);
      this.audio.playPropUse('slow');

      this.screenFlashColor = '#EDE2FA';
      this.screenFlashAlpha = 0.16;
      this.callouts.push({
        x: 0,
        y: Math.max(80, this.stack.length * this.layerHeight + 90),
        text: '焦糖緩速 6s',
        color: '#6247AA',
        life: 0.95,
        maxLife: 0.95,
      });
      this.emitHud();
      return;
    }

    if (type === 'magnet') {
      if (this.magnetArmed) return;
      this.props.magnet -= 1;
      this.magnetArmed = true;
      this.audio.playPropUse('magnet');

      this.shockwaves.push({
        x: bob.worldX,
        y: bob.worldY + this.layerHeight * 0.5,
        width: this.activeWidth,
        color: '#D49B38',
        life: 0.42,
        maxLife: 0.42,
        expandScale: 55,
      });
      this.callouts.push({
        x: bob.worldX,
        y: bob.worldY - 10,
        text: '完美磁吸準備！',
        color: '#B87D1B',
        life: 0.85,
        maxLife: 0.85,
      });
      this.emitHud();
      return;
    }

    if (type === 'widen') {
      if (this.activeWidth >= this.initialCakeWidth - 4) {
        this.callouts.push({
          x: bob.worldX,
          y: bob.worldY - 12,
          text: '已是最大寬度',
          color: '#7C5C61',
          life: 0.75,
          maxLife: 0.75,
          scale: 0.88,
        });
        return;
      }

      this.props.widen -= 1;
      const oldW = this.activeWidth;
      this.activeWidth = Math.min(this.initialCakeWidth, Math.round(this.activeWidth * 1.35 + 14));
      this.cakeSpawnScale = 0.82;
      this.audio.playPropUse('widen');

      for (let i = 0; i < 14; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        this.particles.push({
          x: bob.worldX + side * (oldW * 0.45),
          y: bob.worldY + Math.random() * this.layerHeight,
          vx: side * (55 + Math.random() * 85),
          vy: (Math.random() - 0.3) * 90,
          size: 3 + Math.random() * 2.5,
          color: i % 2 === 0 ? '#FCEAE8' : '#D9466E',
          alpha: 1,
          life: 0.55,
          maxLife: 0.55,
          shape: i % 3 === 0 ? 'heart' : 'petal',
          rotation: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 7,
          gravityScale: 0.4,
        });
      }

      this.callouts.push({
        x: bob.worldX,
        y: bob.worldY - 14,
        text: '奶油膨脹 UP!',
        color: '#D9466E',
        life: 0.9,
        maxLife: 0.9,
      });
      this.emitHud();
      return;
    }

    if (type === 'shield') {
      if (this.shieldArmed) return;
      this.props.shield -= 1;
      this.shieldArmed = true;
      this.audio.playPropUse('shield');

      const topLayer = this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
      const sx = topLayer ? topLayer.x : 0;
      const sy = topLayer ? topLayer.y + topLayer.height : 12;

      this.shockwaves.push({
        x: sx,
        y: sy,
        width: topLayer ? topLayer.width + 24 : this.pedestalWidth,
        color: '#2A9BB5',
        life: 0.45,
        maxLife: 0.45,
        expandScale: 64,
      });
      this.callouts.push({
        x: sx,
        y: sy + 42,
        text: '防護盾已啟動！',
        color: '#1C7990',
        life: 0.9,
        maxLife: 0.9,
      });
      this.emitHud();
    }
  }

  private getPendulumParams(): { omega: number; maxAngle: number } {
    const h = this.stack.length;
    const baseOmega = 2.05 + 1.95 * (1 - Math.exp(-h / 22));
    const omega = this.slowRemaining > 0 ? baseOmega * 0.46 : baseOmega;
    const desiredMaxSwing = Math.min(
      this.width * 0.44 - this.activeWidth * 0.5,
      Math.max(115, this.pedestalWidth * 0.72)
    );
    const safeSwing = Math.max(60, desiredMaxSwing);
    const maxAngle = Math.min(0.68, Math.max(0.28, Math.asin(Math.min(0.95, safeSwing / this.ropeLength))));
    return { omega, maxAngle };
  }

  private getPendulumBobWorldPos(): { worldX: number; worldY: number; screenX: number; screenY: number } {
    const angle = this.pendulumAngle;
    const pivotScreenX = this.width / 2;
    const pivotScreenY = this.swingPivotScreenY;

    const bobScreenX = pivotScreenX + Math.sin(angle) * this.ropeLength;
    const bobScreenY = pivotScreenY + Math.cos(angle) * this.ropeLength;

    const baseGroundScreenY = this.height * 0.79;
    const worldX = (bobScreenX - this.width / 2) / this.zoom;
    const cakeTopWorldY = this.cameraY + (baseGroundScreenY - bobScreenY) / this.zoom;
    const worldY = cakeTopWorldY - this.layerHeight;

    return { worldX, worldY, screenX: bobScreenX, screenY: bobScreenY };
  }

  private releaseCake(): void {
    const { worldX, worldY } = this.getPendulumBobWorldPos();
    this.phase = 'FALLING';
    this.fallX = worldX;
    this.fallY = worldY;
    this.fallVy = -140;
    this.fallRotation = 0;
    this.clipOpen = 1;
    this.bufferedDrop = false;
    this.trailSpawnAccum = 0;

    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const spd = 40 + Math.random() * 65;
      this.particles.push({
        x: worldX,
        y: worldY + this.layerHeight,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd + 30,
        size: 2.2 + Math.random() * 1.8,
        color: i % 2 === 0 ? '#FFE8A3' : '#F4A9BC',
        alpha: 1,
        life: 0.34,
        maxLife: 0.34,
        shape: 'diamond',
        rotation: a,
        vRot: 5,
        gravityScale: 0.25,
      });
    }

    this.audio.playRelease();
  }

  private maybeSpawnPropOrb(newHeight: number): void {
    if (newHeight < this.nextPropSpawnHeight) return;
    if (this.propOrbs.some((o) => !o.collected)) return;

    const types: PropType[] = ['slow', 'magnet', 'widen', 'shield'];
    // Favor widen slightly when cake is narrow, otherwise balanced random
    const chosenType =
      this.activeWidth < this.initialCakeWidth * 0.55 && Math.random() < 0.44
        ? 'widen'
        : types[Math.floor(Math.random() * types.length)];

    const supportX = this.stack.length > 0 ? this.stack[this.stack.length - 1].x : 0;
    const bobPos = this.getPendulumBobWorldPos();
    const towerTopY = newHeight * this.layerHeight;
    const midY = towerTopY + Math.max(55, (bobPos.worldY - towerTopY) * 0.48);

    this.propOrbs.push({
      id: this.nextOrbId++,
      type: chosenType,
      baseX: supportX * 0.5,
      x: supportX * 0.5,
      y: midY,
      phase: Math.random() * Math.PI * 2,
      radius: 17,
      collected: false,
    });

    this.nextPropSpawnHeight = newHeight + 3 + Math.floor(Math.random() * 2);
  }

  private update(dt: number): void {
    this.ambientTime += dt;

    if (this.status === 'PAUSED') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    const camSmooth = 1 - Math.exp(-5.5 * dt);
    this.cameraY += (this.targetCameraY - this.cameraY) * camSmooth;
    this.zoom += (this.targetZoom - this.zoom) * camSmooth;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 0.72);
    }

    if (this.cakeSpawnScale < 1) {
      this.cakeSpawnScale = Math.min(1, this.cakeSpawnScale + dt * 5.8);
    }

    if (this.phase === 'SWINGING' && this.clipOpen > 0) {
      this.clipOpen = Math.max(0, this.clipOpen - dt * 6);
    }

    // Slow-motion countdown
    if (this.status === 'PLAYING' && this.slowRemaining > 0) {
      this.slowRemaining = Math.max(0, this.slowRemaining - dt);
      this.slowHudSyncAccum += dt;
      if (this.slowRemaining === 0) {
        this.audio.setMusicMood(this.combo, false);
        this.emitHud();
      } else if (this.slowHudSyncAccum >= 0.2) {
        this.slowHudSyncAccum = 0;
        this.emitHud();
      }
    }

    if (this.status === 'TITLE_MENU') {
      this.pendulumTime += dt * 1.4;
      this.pendulumAngle = Math.sin(this.pendulumTime) * 0.28;
    } else if (this.status === 'PLAYING') {
      const { omega, maxAngle } = this.getPendulumParams();
      this.pendulumTime += dt * omega;
      this.pendulumAngle = Math.sin(this.pendulumTime) * maxAngle;

      // Update floating prop orbs oscillation
      const driftRange = Math.max(55, this.pedestalWidth * 0.42);
      for (const orb of this.propOrbs) {
        if (orb.collected) continue;
        orb.phase += dt * 1.9;
        orb.x = orb.baseX + Math.sin(orb.phase) * driftRange;
      }

      if (this.combo >= 3 && this.stack.length > 0) {
        this.feverSparkleAccum += dt;
        if (this.feverSparkleAccum >= 0.085) {
          this.feverSparkleAccum = 0;
          const topLayer = this.stack[this.stack.length - 1];
          this.particles.push({
            x: topLayer.x + (Math.random() - 0.5) * (topLayer.width + 48),
            y: topLayer.y - Math.random() * 90,
            vx: (Math.random() - 0.5) * 24,
            vy: 85 + Math.random() * 55,
            size: 2.5 + Math.random() * 2.2,
            color: Math.random() > 0.45 ? '#F2C96B' : '#F4A9BC',
            alpha: 1,
            life: 0.75,
            maxLife: 0.75,
            shape: Math.random() > 0.5 ? 'star' : 'heart',
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 4,
            gravityScale: -0.18,
          });
        }
      }
    }

    if (this.status === 'PLAYING' && this.phase === 'FALLING') {
      this.fallVy -= GRAVITY * dt;
      this.fallY += this.fallVy * dt;

      // Magnet assist gently pulls cake horizontally toward target center while falling
      if (this.magnetArmed) {
        const targetX = this.stack.length === 0 ? 0 : this.stack[this.stack.length - 1].x;
        const pull = 1 - Math.exp(-14 * dt);
        this.fallX += (targetX - this.fallX) * pull;
      }

      // Check mid-air collision with floating prop orbs
      const cakeCenterY = this.fallY + this.layerHeight * 0.5;
      for (const orb of this.propOrbs) {
        if (orb.collected) continue;
        const dx = Math.abs(this.fallX - orb.x);
        const dy = Math.abs(cakeCenterY - orb.y);
        if (dx <= this.activeWidth * 0.5 + orb.radius && dy <= this.layerHeight * 0.5 + orb.radius) {
          this.collectPropOrb(orb);
        }
      }

      this.trailSpawnAccum += dt;
      if (this.trailSpawnAccum >= 0.018) {
        this.trailSpawnAccum = 0;
        this.fallingTrails.push({
          x: this.fallX,
          y: this.fallY + this.layerHeight * 0.8,
          width: this.activeWidth * 0.92,
          color: this.magnetArmed ? '#FFE8A3' : this.activeFlavor.frostingColor,
          life: 0.14,
          maxLife: 0.14,
        });
      }

      const targetSurfaceY = this.stack.length * this.layerHeight;
      if (this.fallY <= targetSurfaceY) {
        this.resolveCakeLanding(targetSurfaceY);
      }
    }

    for (let i = Math.max(0, this.stack.length - 6); i < this.stack.length; i++) {
      if (this.stack[i].squashTime < 1) {
        this.stack[i].squashTime += dt;
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy -= DEBRIS_GRAVITY * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rotation += d.vRot * dt;
      if (d.y < this.cameraY - 220) {
        d.alpha -= dt * 2.4;
      }
      if (d.alpha <= 0 || d.y < this.cameraY - 520) {
        this.debris.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      const gScale = p.gravityScale ?? 1;
      p.vy -= 420 * gScale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.life -= dt;
      c.y += 44 * dt;
      if (c.life <= 0) {
        this.callouts.splice(i, 1);
      }
    }

    for (let i = this.sliceLines.length - 1; i >= 0; i--) {
      const s = this.sliceLines[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.sliceLines.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const lb = this.lightBeams[i];
      lb.life -= dt;
      if (lb.life <= 0) {
        this.lightBeams.splice(i, 1);
      }
    }

    for (let i = this.creamPuffs.length - 1; i >= 0; i--) {
      const cp = this.creamPuffs[i];
      cp.life -= dt;
      cp.x += cp.vx * dt;
      cp.y += cp.vy * dt;
      cp.vx *= 0.92;
      if (cp.life <= 0) {
        this.creamPuffs.splice(i, 1);
      }
    }

    for (let i = this.fallingTrails.length - 1; i >= 0; i--) {
      const ft = this.fallingTrails[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.fallingTrails.splice(i, 1);
      }
    }
  }

  private collectPropOrb(orb: FloatingPropOrb): void {
    orb.collected = true;
    this.audio.playPropCollect();

    const prevCount = this.props[orb.type];
    this.props[orb.type] = Math.min(MAX_PROP_STOCK, prevCount + 1);

    const label =
      orb.type === 'slow'
        ? '+1 焦糖緩速'
        : orb.type === 'magnet'
          ? '+1 完美磁吸'
          : orb.type === 'shield'
            ? '+1 糖晶護盾'
            : '+1 奶油膨脹';
    const color =
      orb.type === 'slow'
        ? '#6247AA'
        : orb.type === 'magnet'
          ? '#B87D1B'
          : orb.type === 'shield'
            ? '#1C7990'
            : '#D9466E';

    this.shockwaves.push({
      x: orb.x,
      y: orb.y,
      width: 34,
      color,
      life: 0.35,
      maxLife: 0.35,
      expandScale: 52,
    });

    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      const spd = 65 + Math.random() * 80;
      this.particles.push({
        x: orb.x,
        y: orb.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 3 + Math.random() * 2.5,
        color: i % 2 === 0 ? color : '#FFFDF9',
        alpha: 1,
        life: 0.55,
        maxLife: 0.55,
        shape: 'star',
        rotation: a,
        vRot: 6,
        gravityScale: 0.2,
      });
    }

    this.callouts.push({
      x: orb.x,
      y: orb.y + 12,
      text: prevCount >= MAX_PROP_STOCK ? '道具已滿 +50' : label,
      color,
      life: 0.85,
      maxLife: 0.85,
      scale: 0.92,
    });

    if (prevCount >= MAX_PROP_STOCK) {
      this.score += 50;
    }

    this.emitHud();
  }

  private resolveCakeLanding(surfaceY: number): void {
    const isFirstLayer = this.stack.length === 0;
    const supportX = isFirstLayer ? 0 : this.stack[this.stack.length - 1].x;
    const supportW = isFirstLayer ? this.pedestalWidth : this.stack[this.stack.length - 1].width;

    // If Magnet prop was armed, snap cleanly to target center
    const wasMagnetUsed = this.magnetArmed;
    if (this.magnetArmed) {
      this.fallX = supportX;
      this.magnetArmed = false;
    }

    const currLeft = this.fallX - this.activeWidth / 2;
    const currRight = this.fallX + this.activeWidth / 2;
    const supportLeft = supportX - supportW / 2;
    const supportRight = supportX + supportW / 2;

    const overlapLeft = Math.max(currLeft, supportLeft);
    const overlapRight = Math.min(currRight, supportRight);
    const overlapWidth = overlapRight - overlapLeft;

    if (overlapWidth <= 2) {
      this.triggerMissedGameOver(surfaceY);
      return;
    }

    const tolerance = Math.max(7, Math.min(11, this.activeWidth * 0.065));
    const deltaCenter = Math.abs(this.fallX - supportX);
    const isPerfect = (!isFirstLayer && deltaCenter <= tolerance) || wasMagnetUsed;
    const isWidenedCover =
      !isFirstLayer &&
      this.activeWidth > supportW &&
      currLeft <= supportLeft &&
      currRight >= supportRight;

    let placedX: number;
    let placedW: number;
    let hadTrim = false;

    if (isPerfect) {
      placedX = supportX;
      const baseW = isFirstLayer
        ? this.activeWidth
        : Math.max(Math.min(supportW, this.activeWidth), this.activeWidth);
      const widthGain = isFirstLayer
        ? 0
        : Math.min(
            Math.max(0, this.initialCakeWidth - baseW),
            Math.max(8, Math.round(this.initialCakeWidth * 0.07))
          );
      placedW = Math.min(this.initialCakeWidth, baseW + widthGain);

      this.combo += 1;
      this.perfectCount += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      const pointsEarned = 100 * this.combo;
      this.score += pointsEarned;

      this.hitstopTimer = 0.045;
      this.triggerShake(3.6, 0.16);
      this.spawnPerfectCelebration(
        placedX,
        surfaceY + this.layerHeight,
        placedW,
        pointsEarned,
        widthGain
      );
    } else if (isWidenedCover) {
      placedX = this.fallX;
      placedW = this.activeWidth;
      this.combo = 0;
      this.score += 100;
      this.triggerShake(2.1, 0.1);
      this.spawnNormalLandingEffects(placedX, surfaceY, placedW, this.activeFlavor);
    } else {
      placedX = (overlapLeft + overlapRight) / 2;
      placedW = overlapWidth;
      this.combo = 0;
      this.score += 100;

      if (currLeft < overlapLeft - 1.5) {
        hadTrim = true;
        const trimW = overlapLeft - currLeft;
        this.spawnDebris((currLeft + overlapLeft) / 2, surfaceY, trimW, -1);
        this.sliceLines.push({
          x: overlapLeft,
          yTop: surfaceY + this.layerHeight,
          yBottom: surfaceY,
          life: 0.28,
          maxLife: 0.28,
        });
      }
      if (currRight > overlapRight + 1.5) {
        hadTrim = true;
        const trimW = currRight - overlapRight;
        this.spawnDebris((overlapRight + currRight) / 2, surfaceY, trimW, 1);
        this.sliceLines.push({
          x: overlapRight,
          yTop: surfaceY + this.layerHeight,
          yBottom: surfaceY,
          life: 0.28,
          maxLife: 0.28,
        });
      }

      this.triggerShake(2.1, 0.1);
      this.spawnNormalLandingEffects(placedX, surfaceY, placedW, this.activeFlavor);
    }

    if (this.score > this.bestScore) {
      this.isNewRecord = true;
    }

    this.audio.setMusicMood(this.combo, this.slowRemaining > 0);
    this.audio.playLand(isPerfect, this.combo, hadTrim);

    this.stack.push({
      id: this.nextLayerId++,
      x: placedX,
      y: surfaceY,
      width: placedW,
      height: this.layerHeight,
      flavor: this.activeFlavor,
      isPerfect,
      squashTime: 0,
    });

    for (let offset = 2; offset <= 4; offset++) {
      const idx = this.stack.length - offset;
      if (idx >= 0) {
        this.stack[idx].squashTime = 0.08 * (offset - 1);
      }
    }

    this.activeWidth = placedW;
    const newHeight = this.stack.length;
    const nextLayerFlavor = getFlavorForHeight(newHeight);

    if (nextLayerFlavor.id !== this.activeFlavor.id) {
      this.spawnFlavorMilestoneConfetti(placedX, surfaceY + this.layerHeight, nextLayerFlavor);
      if (!this.unlockedIds.has(nextLayerFlavor.id)) {
        this.unlockedIds.add(nextLayerFlavor.id);
        this.newlyUnlockedFlavor = nextLayerFlavor;
        this.audio.playUnlock();
        this.callbacks.onFlavorUnlocked(nextLayerFlavor);
      } else {
        this.newlyUnlockedFlavor = null;
      }
    } else {
      this.newlyUnlockedFlavor = null;
    }
    this.activeFlavor = nextLayerFlavor;

    const desiredTowerFocusY = Math.max(0, (newHeight - 3) * this.layerHeight);
    this.targetCameraY = desiredTowerFocusY;

    // Clean up any uncollected prop orbs that fell below camera view
    this.propOrbs = this.propOrbs.filter((o) => !o.collected && o.y > desiredTowerFocusY - 40);
    this.maybeSpawnPropOrb(newHeight);

    this.phase = 'SWINGING';
    this.cakeSpawnScale = 0.2;
    this.emitHud();

    if (this.bufferedDrop) {
      this.bufferedDrop = false;
      this.releaseCake();
    }
  }

  private triggerMissedGameOver(surfaceY: number): void {
    // Protective Sugar Shield intercepts fatal misses and rescues the round!
    if (this.shieldArmed || this.props.shield > 0) {
      if (this.shieldArmed) {
        this.shieldArmed = false;
      } else {
        this.props.shield -= 1;
      }
      this.triggerShieldRescue(surfaceY);
      return;
    }

    const supportX = this.stack.length === 0 ? 0 : this.stack[this.stack.length - 1].x;
    const dir = this.fallX >= supportX ? 1 : -1;
    this.debris.push({
      x: this.fallX,
      y: surfaceY,
      width: this.activeWidth,
      height: this.layerHeight,
      vx: dir * 75,
      vy: -90,
      rotation: 0,
      vRot: dir * 3.4,
      alpha: 1,
      flavor: this.activeFlavor,
    });

    this.triggerShake(6.5, 0.3);
    this.screenFlashColor = '#FCEAE8';
    this.screenFlashAlpha = 0.14;
    this.slowRemaining = 0;
    this.magnetArmed = false;
    this.shieldArmed = false;
    this.audio.stopMusic();
    this.audio.playGameOver();

    this.status = 'GAME_OVER';
    this.phase = 'GAMEOVER_IDLE';

    const totalTowerH = Math.max(160, this.stack.length * this.layerHeight + 130);
    const availableH = this.height * 0.62;
    this.targetZoom = Math.min(1, Math.max(0.28, availableH / totalTowerH));
    this.targetCameraY = 0;

    const snapshot = this.buildSnapshot();
    this.callbacks.onHudUpdate(snapshot);
    this.callbacks.onGameOver(snapshot);
  }

  private triggerShieldRescue(surfaceY: number): void {
    const supportX = this.stack.length === 0 ? 0 : this.stack[this.stack.length - 1].x;
    this.combo = 0;
    this.audio.setMusicMood(0, this.slowRemaining > 0);
    this.audio.playShieldSave();

    this.triggerShake(4.4, 0.22);
    this.screenFlashColor = '#E0F4FA';
    this.screenFlashAlpha = 0.22;

    this.shockwaves.push({
      x: supportX,
      y: surfaceY + 8,
      width: this.activeWidth + 30,
      color: '#2A9BB5',
      life: 0.55,
      maxLife: 0.55,
      expandScale: 110,
    });
    this.shockwaves.push({
      x: this.fallX,
      y: surfaceY + 14,
      width: this.activeWidth,
      color: '#FFFFFF',
      life: 0.42,
      maxLife: 0.42,
      expandScale: 80,
    });

    const shieldPalette = ['#68CEE6', '#E0F4FA', '#FFFFFF', '#F2C96B'];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.2;
      const spd = 95 + Math.random() * 145;
      this.particles.push({
        x: this.fallX + (Math.random() - 0.5) * 30,
        y: surfaceY + 12,
        vx: Math.cos(angle) * spd,
        vy: Math.abs(Math.sin(angle)) * spd + 80,
        size: 3.4 + Math.random() * 3,
        color: shieldPalette[i % shieldPalette.length],
        alpha: 1,
        life: 0.78,
        maxLife: 0.78,
        shape: i % 2 === 0 ? 'diamond' : 'star',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 9,
        gravityScale: 0.65,
      });
    }

    this.callouts.push({
      x: supportX,
      y: surfaceY + 56,
      text: '防護盾拯救！',
      subtext: '免於結束 · 再試一次',
      color: '#1C7990',
      life: 1.15,
      maxLife: 1.15,
      scale: 1.05,
    });

    this.phase = 'SWINGING';
    this.cakeSpawnScale = 0.22;
    this.bufferedDrop = false;
    this.emitHud();
  }

  private spawnDebris(x: number, y: number, width: number, dir: -1 | 1): void {
    if (width <= 1) return;
    this.debris.push({
      x,
      y,
      width,
      height: this.layerHeight,
      vx: dir * (78 + Math.random() * 58),
      vy: 55,
      rotation: 0,
      vRot: dir * (2.8 + Math.random() * 2.4),
      alpha: 1,
      flavor: this.activeFlavor,
    });

    const cutX = x - dir * (width / 2);
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: cutX,
        y: y + Math.random() * this.layerHeight,
        vx: dir * (45 + Math.random() * 130) + (Math.random() - 0.5) * 45,
        vy: 55 + Math.random() * 150,
        size: 2.5 + Math.random() * 3.2,
        color:
          i % 3 === 0
            ? this.activeFlavor.fillingColor
            : i % 2 === 0
              ? this.activeFlavor.frostingColor
              : this.activeFlavor.spongeTop,
        alpha: 1,
        life: 0.45 + Math.random() * 0.28,
        maxLife: 0.73,
        shape: i % 4 === 0 ? 'diamond' : 'circle',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
        gravityScale: 1,
      });
    }
  }

  private spawnNormalLandingEffects(x: number, y: number, width: number, flavor: CakeFlavor): void {
    for (const side of [-1, 1]) {
      for (let j = 0; j < 2; j++) {
        this.creamPuffs.push({
          x: x + side * (width * 0.44),
          y: y + 3 + j * 4,
          vx: side * (55 + j * 30),
          vy: 12 + j * 14,
          radius: 7 + j * 2.5,
          color: flavor.frostingColor,
          life: 0.32,
          maxLife: 0.32,
        });
      }
    }

    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.particles.push({
        x: x + side * (width * 0.35),
        y: y + 2,
        vx: side * (40 + Math.random() * 75),
        vy: 35 + Math.random() * 80,
        size: 2.4 + Math.random() * 2.4,
        color: i % 3 === 0 ? flavor.accentColor : flavor.frostingColor,
        alpha: 1,
        life: 0.42,
        maxLife: 0.42,
        shape: i % 3 === 0 ? 'petal' : 'circle',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 6,
        gravityScale: 0.85,
      });
    }
  }

  private spawnPerfectCelebration(
    x: number,
    topY: number,
    width: number,
    pointsEarned: number,
    widthGain = 0
  ): void {
    const seamY = topY - this.layerHeight * 0.5;

    this.shockwaves.push({
      x,
      y: seamY,
      width,
      color: '#EAB348',
      life: 0.46,
      maxLife: 0.46,
      expandScale: 72,
    });
    this.shockwaves.push({
      x,
      y: seamY,
      width: width * 0.9,
      color: '#F49BB2',
      life: 0.58,
      maxLife: 0.58,
      expandScale: 108,
    });

    this.lightBeams.push({
      x,
      yBottom: topY - this.layerHeight,
      width,
      color: 'rgba(255, 226, 138, 0.85)',
      life: 0.48,
      maxLife: 0.48,
    });

    if (this.combo >= 2) {
      this.screenFlashColor = '#FFF5D6';
      this.screenFlashAlpha = Math.min(0.14, 0.05 + this.combo * 0.015);
    }

    for (const side of [-1, 1]) {
      this.creamPuffs.push({
        x: x + side * (width * 0.46),
        y: topY - this.layerHeight + 4,
        vx: side * 78,
        vy: 18,
        radius: 9,
        color: '#FFF7E0',
        life: 0.36,
        maxLife: 0.36,
      });
    }

    const shapes: Particle['shape'][] = ['star', 'petal', 'heart', 'diamond', 'circle'];
    const palette = ['#F2C96B', '#FFFDF9', '#F4A9BC', '#FFE8A3', this.activeFlavor.accentColor];
    const count = Math.min(34, 20 + this.combo * 2);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const speed = 85 + Math.random() * 175;
      this.particles.push({
        x: x + (Math.random() - 0.5) * (width * 0.65),
        y: topY - 6,
        vx: Math.cos(angle) * speed,
        vy: Math.abs(Math.sin(angle)) * speed + 85,
        size: 3.2 + Math.random() * 3.8,
        color: palette[i % palette.length],
        alpha: 1,
        life: 0.72 + Math.random() * 0.34,
        maxLife: 1.06,
        shape: shapes[i % shapes.length],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 9,
        gravityScale: 0.78,
      });
    }

    this.callouts.push({
      x,
      y: topY + 28,
      text: this.combo > 1 ? `PERFECT ×${this.combo}` : 'PERFECT!',
      subtext: widthGain > 0 ? `+${pointsEarned} · 寬度回復 +${widthGain}` : `+${pointsEarned}`,
      color: '#D49B38',
      life: 1.0,
      maxLife: 1.0,
      scale: this.combo >= 3 ? 1.1 : 1,
    });
  }

  private spawnFlavorMilestoneConfetti(x: number, topY: number, newFlavor: CakeFlavor): void {
    this.screenFlashColor = newFlavor.spongeTop;
    this.screenFlashAlpha = 0.16;

    const palette = [
      newFlavor.accentColor,
      newFlavor.fillingColor,
      newFlavor.frostingColor,
      '#F2C96B',
      '#F9A8B8',
    ];
    const shapes: Particle['shape'][] = ['petal', 'star', 'heart', 'diamond'];

    for (let i = 0; i < 28; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * this.width * 0.85,
        y: topY + 220 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 95,
        vy: -40 - Math.random() * 75,
        size: 3.6 + Math.random() * 3.5,
        color: palette[i % palette.length],
        alpha: 1,
        life: 1.45 + Math.random() * 0.6,
        maxLife: 2.05,
        shape: shapes[i % shapes.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 7,
        gravityScale: 0.24,
      });
    }
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  private buildSnapshot(): HudSnapshot {
    return {
      status: this.status,
      score: this.score,
      height: this.stack.length,
      combo: this.combo,
      maxCombo: this.maxCombo,
      perfectCount: this.perfectCount,
      currentFlavor: this.activeFlavor,
      nextFlavor: getNextFlavorForHeight(this.stack.length),
      newlyUnlockedFlavor: this.newlyUnlockedFlavor,
      isNewRecord: this.isNewRecord,
      props: { ...this.props },
      slowRemaining: this.slowRemaining,
      magnetArmed: this.magnetArmed,
      shieldArmed: this.shieldArmed,
    };
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate(this.buildSnapshot());
  }

  private render(): void {
    const bob = this.getPendulumBobWorldPos();
    const isFallingVisible =
      this.phase === 'FALLING' && (this.status === 'PLAYING' || this.status === 'PAUSED');
    const isSwingingVisible =
      this.status === 'TITLE_MENU' ||
      (this.phase === 'SWINGING' && (this.status === 'PLAYING' || this.status === 'PAUSED'));

    const comboGlow = this.combo >= 2 ? Math.min(1, (this.combo - 1) / 4) : 0;

    const activeCakeState = isFallingVisible
      ? {
          x: this.fallX,
          y: this.fallY,
          width: this.activeWidth,
          height: this.layerHeight,
          flavor: this.activeFlavor,
          rotation: this.fallRotation,
          scale: 1,
          visible: true,
          comboGlow,
        }
      : {
          x: bob.worldX,
          y: bob.worldY,
          width: this.activeWidth,
          height: this.layerHeight,
          flavor: this.activeFlavor,
          rotation: this.pendulumAngle * 0.14,
          scale: this.cakeSpawnScale,
          visible: isSwingingVisible,
          comboGlow,
        };

    const magnetTargetX = this.stack.length === 0 ? 0 : this.stack[this.stack.length - 1].x;
    const magnetTargetY = this.stack.length * this.layerHeight;

    const shakeMag = this.shakeTimer > 0 ? this.shakeIntensity * (this.shakeTimer / 0.25) : 0;
    const shakeX = shakeMag > 0 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
    const shakeY = shakeMag > 0 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

    renderPatisserieScene(this.ctx, {
      width: this.width,
      height: this.height,
      cameraY: this.cameraY,
      zoom: this.zoom,
      shakeX,
      shakeY,
      backdropImg: this.backdropImg,
      backdropLoaded: this.backdropLoaded,
      pedestalWidth: this.pedestalWidth,
      stack: this.stack,
      activeCake: activeCakeState,
      pendulum: {
        pivotScreenX: this.width / 2,
        pivotScreenY: this.swingPivotScreenY,
        bobScreenX: bob.screenX,
        bobScreenY: bob.screenY,
        clipOpen: this.clipOpen,
        hasCake: isSwingingVisible,
      },
      debris: this.debris,
      particles: this.particles,
      callouts: this.callouts,
      sliceLines: this.sliceLines,
      shockwaves: this.shockwaves,
      lightBeams: this.lightBeams,
      creamPuffs: this.creamPuffs,
      fallingTrails: this.fallingTrails,
      propOrbs: this.propOrbs,
      slowRemaining: this.slowRemaining,
      magnetArmed: this.magnetArmed,
      shieldArmed: this.shieldArmed,
      hasShieldReserve: this.props.shield > 0,
      magnetTargetX,
      magnetTargetY,
      screenFlashAlpha: this.screenFlashAlpha,
      screenFlashColor: this.screenFlashColor,
      ambientTime: this.ambientTime,
      towerHeightCount: this.stack.length,
      comboCount: this.combo,
    });
  }
}
