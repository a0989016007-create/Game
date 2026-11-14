export type GameStatus = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type ToppingStyle = 'berry' | 'pistachio' | 'pearl' | 'caramel' | 'meringue' | 'gold';

export type PropType = 'slow' | 'magnet' | 'widen' | 'shield';

export interface PropInventory {
  slow: number;
  magnet: number;
  widen: number;
  shield: number;
}

export interface FloatingPropOrb {
  id: number;
  type: PropType;
  baseX: number;
  x: number;
  y: number;
  phase: number;
  radius: number;
  collected: boolean;
}

export interface CakeFlavor {
  id: string;
  nameZh: string;
  nameFr: string;
  unlockHeight: number;
  descriptionZh: string;
  spongeTop: string;
  spongeBottom: string;
  fillingColor: string;
  frostingColor: string;
  frostingShadow: string;
  accentColor: string;
  sprinkleColors: string[];
  toppingStyle: ToppingStyle;
}

export interface StackedLayer {
  id: number;
  x: number; // Horizontal center relative to world center (0)
  y: number; // Bottom Y in world units (upward from pedestal = 0)
  width: number;
  height: number;
  flavor: CakeFlavor;
  isPerfect: boolean;
  squashTime: number; // Elapsed time since landing for squash-and-stretch
}

export interface DebrisPiece {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  flavor: CakeFlavor;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'star' | 'petal' | 'heart' | 'diamond';
  rotation: number;
  vRot: number;
  gravityScale?: number;
}

export interface FloatingCallout {
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export interface SliceLineEffect {
  x: number;
  yTop: number;
  yBottom: number;
  life: number;
  maxLife: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
  expandScale: number;
}

export interface LightBeamEffect {
  x: number;
  yBottom: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface CreamPuffEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FallingTrailMote {
  x: number;
  y: number;
  width: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface HudSnapshot {
  status: GameStatus;
  score: number;
  height: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  currentFlavor: CakeFlavor;
  nextFlavor: CakeFlavor | null;
  newlyUnlockedFlavor: CakeFlavor | null;
  isNewRecord: boolean;
  props: PropInventory;
  slowRemaining: number;
  magnetArmed: boolean;
  shieldArmed: boolean;
}
