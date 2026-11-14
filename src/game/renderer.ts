import type {
  CakeFlavor,
  CreamPuffEffect,
  DebrisPiece,
  FallingTrailMote,
  FloatingCallout,
  FloatingPropOrb,
  LightBeamEffect,
  Particle,
  PropType,
  ShockwaveRing,
  SliceLineEffect,
  StackedLayer,
} from './types';

export interface RenderContextState {
  width: number;
  height: number;
  cameraY: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
  backdropImg: HTMLImageElement | null;
  backdropLoaded: boolean;
  pedestalWidth: number;
  stack: StackedLayer[];
  activeCake: {
    x: number;
    y: number;
    width: number;
    height: number;
    flavor: CakeFlavor;
    rotation: number;
    scale: number;
    visible: boolean;
    comboGlow: number;
  };
  pendulum: {
    pivotScreenX: number;
    pivotScreenY: number;
    bobScreenX: number;
    bobScreenY: number;
    clipOpen: number;
    hasCake: boolean;
  };
  debris: DebrisPiece[];
  particles: Particle[];
  callouts: FloatingCallout[];
  sliceLines: SliceLineEffect[];
  shockwaves: ShockwaveRing[];
  lightBeams: LightBeamEffect[];
  creamPuffs: CreamPuffEffect[];
  fallingTrails: FallingTrailMote[];
  propOrbs: FloatingPropOrb[];
  slowRemaining: number;
  magnetArmed: boolean;
  shieldArmed: boolean;
  hasShieldReserve: boolean;
  magnetTargetX: number;
  magnetTargetY: number;
  screenFlashAlpha: number;
  screenFlashColor: string;
  ambientTime: number;
  towerHeightCount: number;
  comboCount: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, clamped));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, clamped));
  const bl = Math.round(lerp(a & 255, b & 255, clamped));
  return `rgb(${r}, ${g}, ${bl})`;
}

export function renderPatisserieScene(ctx: CanvasRenderingContext2D, state: RenderContextState): void {
  const { width, height, cameraY, zoom, shakeX, shakeY, ambientTime, comboCount } = state;

  ctx.save();

  // 1. Atmospheric Sky Gradient based on altitude
  const altitudeRatio = Math.min(1, cameraY / 1100);
  let topColor: string;
  let bottomColor: string;

  if (altitudeRatio < 0.35) {
    const t = altitudeRatio / 0.35;
    topColor = lerpColor('#FFF5F3', '#FBE3E8', t);
    bottomColor = lerpColor('#FCEAE8', '#FFF2DF', t);
  } else if (altitudeRatio < 0.7) {
    const t = (altitudeRatio - 0.35) / 0.35;
    topColor = lerpColor('#FBE3E8', '#E4D4F4', t);
    bottomColor = lerpColor('#FFF2DF', '#F8DFEC', t);
  } else {
    const t = (altitudeRatio - 0.7) / 0.3;
    topColor = lerpColor('#E4D4F4', '#2A2242', t);
    bottomColor = lerpColor('#F8DFEC', '#5E4775', t);
  }

  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  skyGrad.addColorStop(0, topColor);
  skyGrad.addColorStop(1, bottomColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Generated French Patisserie Salon Backdrop
  const salonOpacity = Math.max(0.06, 0.52 * (1 - Math.min(1, cameraY / 420)));
  if (state.backdropLoaded && state.backdropImg) {
    ctx.save();
    ctx.globalAlpha = salonOpacity;
    const img = state.backdropImg;
    const imgAspect = img.width / Math.max(1, img.height);
    const viewAspect = width / Math.max(1, height);

    let drawW = width;
    let drawH = height;
    if (viewAspect > imgAspect) {
      drawW = width * 1.08;
      drawH = drawW / imgAspect;
    } else {
      drawH = height * 1.08;
      drawW = drawH * imgAspect;
    }

    const driftX = Math.sin(ambientTime * 0.18) * 10;
    const parallaxY = Math.min(height * 0.25, cameraY * 0.22);
    const drawX = (width - drawW) / 2 + driftX;
    const drawY = (height - drawH) / 2 + parallaxY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const veilGrad = ctx.createLinearGradient(0, 0, 0, height);
    veilGrad.addColorStop(0, 'rgba(255, 247, 245, 0.55)');
    veilGrad.addColorStop(0.55, 'rgba(255, 245, 243, 0.32)');
    veilGrad.addColorStop(1, 'rgba(252, 234, 232, 0.45)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = veilGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 2b. Slow-Mo Lavender Time-Sugar Vignette
  if (state.slowRemaining > 0) {
    const fade = Math.min(1, state.slowRemaining / 0.8);
    const slowAura = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      Math.min(width, height) * 0.22,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.72
    );
    slowAura.addColorStop(0, 'rgba(131, 103, 199, 0)');
    slowAura.addColorStop(1, `rgba(131, 103, 199, ${0.22 * fade})`);
    ctx.fillStyle = slowAura;
    ctx.fillRect(0, 0, width, height);
  }

  // 2c. Combo Fever Warm Rose-Gold Vignette Aura (when combo >= 3)
  if (comboCount >= 3) {
    const feverStrength = Math.min(1, (comboCount - 2) / 5);
    const pulse = 0.78 + 0.22 * Math.sin(ambientTime * 5.2);
    const aura = ctx.createRadialGradient(
      width / 2,
      height * 0.48,
      Math.min(width, height) * 0.25,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.75
    );
    aura.addColorStop(0, 'rgba(255, 236, 179, 0)');
    aura.addColorStop(1, `rgba(232, 168, 72, ${0.18 * feverStrength * pulse})`);
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Twinkling Stars at high altitude + ambient sunlit sugar motes
  if (altitudeRatio > 0.55) {
    const starAlpha = (altitudeRatio - 0.55) / 0.45;
    ctx.save();
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 173.7) % 1) * width;
      const sy = ((i * 97.3) % 0.72) * height;
      const twinkle = 0.35 + 0.65 * Math.sin(ambientTime * 2.2 + i * 1.7);
      ctx.globalAlpha = starAlpha * twinkle * 0.75;
      ctx.fillStyle = i % 3 === 0 ? '#FFE8A3' : '#FFFFFF';
      const r = i % 4 === 0 ? 2.2 : 1.4;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  for (let i = 0; i < 14; i++) {
    const px = ((i * 0.19 + Math.sin(ambientTime * 0.25 + i) * 0.03 + 1) % 1) * width;
    const py = (((i * 0.23 - ambientTime * 0.015) % 1) + 1) % 1 * height;
    ctx.globalAlpha = 0.28 + 0.18 * Math.sin(ambientTime * 1.4 + i);
    ctx.fillStyle = i % 2 === 0 ? '#FFFDF9' : '#F9D6DF';
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const baseGroundScreenY = height * 0.79;
  const worldToScreen = (wx: number, wy: number) => ({
    x: width / 2 + shakeX + wx * zoom,
    y: baseGroundScreenY + shakeY - (wy - cameraY) * zoom,
  });

  // 4. Vertical Light Beams
  for (const beam of state.lightBeams) {
    const pos = worldToScreen(beam.x, beam.yBottom);
    const t = beam.life / beam.maxLife;
    const beamW = beam.width * (1.05 + (1 - t) * 0.22) * zoom;
    const beamH = 260 * zoom;

    const grad = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y - beamH);
    grad.addColorStop(0, beam.color);
    grad.addColorStop(1, 'rgba(255, 248, 220, 0)');

    ctx.save();
    ctx.globalAlpha = t * 0.45;
    ctx.fillStyle = grad;
    ctx.fillRect(pos.x - beamW / 2, pos.y - beamH, beamW, beamH);
    ctx.restore();
  }

  // 5. Patisserie Table Counter & Ornate Porcelain Cake Stand
  const groundPos = worldToScreen(0, 0);
  if (groundPos.y < height + 160) {
    drawTableAndPedestal(ctx, width, height, groundPos.x, groundPos.y, state.pedestalWidth * zoom, zoom);
  }

  // 6. Stacked Cake Layers
  for (let i = 0; i < state.stack.length; i++) {
    const layer = state.stack[i];
    const screenBottom = worldToScreen(layer.x, layer.y);
    const drawH = layer.height * zoom;
    const drawW = layer.width * zoom;

    if (screenBottom.y < -80 || screenBottom.y - drawH > height + 80) {
      continue;
    }

    let scaleX = 1;
    let scaleY = 1;
    if (layer.squashTime < 0.38) {
      const t = layer.squashTime / 0.38;
      const damp = Math.exp(-t * 6.2) * Math.sin(t * Math.PI * 3);
      scaleY = 1 - damp * 0.2;
      scaleX = 1 + damp * 0.12;
    }

    ctx.save();
    ctx.translate(screenBottom.x, screenBottom.y);
    ctx.scale(scaleX, scaleY);
    drawCakeSlice(
      ctx,
      -drawW / 2,
      -drawH,
      drawW,
      drawH,
      layer.flavor,
      layer.isPerfect,
      zoom
    );
    ctx.restore();
  }

  // 6a. Protective Sugar Shield Dome around tower top (active armed glow or reserve shimmer)
  if (state.shieldArmed || state.hasShieldReserve) {
    const topLayer = state.stack.length > 0 ? state.stack[state.stack.length - 1] : null;
    const shieldCenterX = topLayer ? topLayer.x : 0;
    const shieldTopY = topLayer ? topLayer.y + topLayer.height : 0;
    const shieldW = (topLayer ? topLayer.width + 44 : state.pedestalWidth + 24) * zoom;
    const shieldScreen = worldToScreen(shieldCenterX, shieldTopY);
    const pulse = 0.82 + 0.18 * Math.sin(ambientTime * 4.2);

    ctx.save();
    const rx = shieldW * 0.54;
    const ry = Math.max(26 * zoom, shieldW * 0.28);

    if (state.shieldArmed) {
      const domeGrad = ctx.createRadialGradient(
        shieldScreen.x,
        shieldScreen.y,
        rx * 0.15,
        shieldScreen.x,
        shieldScreen.y,
        rx
      );
      domeGrad.addColorStop(0, 'rgba(165, 232, 245, 0.06)');
      domeGrad.addColorStop(0.75, 'rgba(104, 206, 230, 0.22)');
      domeGrad.addColorStop(1, 'rgba(56, 178, 209, 0.45)');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.ellipse(shieldScreen.x, shieldScreen.y, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(42, 155, 181, ${0.88 * pulse})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(shieldScreen.x, shieldScreen.y, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    } else {
      // Subtle standby shield halo indicating automatic rescue reserve is ready
      ctx.strokeStyle = `rgba(42, 155, 181, ${0.35 * pulse})`;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.ellipse(shieldScreen.x, shieldScreen.y, rx, ry * 0.8, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6b. Magnet Armed Guide Tether (shows magnetic target alignment)
  if (state.magnetArmed && state.activeCake.visible) {
    const cakePos = worldToScreen(state.activeCake.x, state.activeCake.y);
    const targetPos = worldToScreen(state.magnetTargetX, state.magnetTargetY);
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 155, 56, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -ambientTime * 36;
    ctx.beginPath();
    ctx.moveTo(cakePos.x, cakePos.y);
    ctx.lineTo(targetPos.x, targetPos.y);
    ctx.stroke();

    // Target beacon star on tower top
    ctx.setLineDash([]);
    ctx.fillStyle = '#EAB348';
    drawMiniStar(ctx, targetPos.x, targetPos.y, 4, 8 * zoom, 3 * zoom);
    ctx.restore();
  }

  // 7. Floating Patisserie Prop Orbs in Airspace
  for (const orb of state.propOrbs) {
    if (orb.collected) continue;
    const pos = worldToScreen(orb.x, orb.y);
    drawFloatingPropOrb(ctx, pos.x, pos.y, orb.radius * zoom, orb.type, ambientTime, zoom);
  }

  // 8. Landing Cream Puff Clouds
  for (const puff of state.creamPuffs) {
    const pos = worldToScreen(puff.x, puff.y);
    const t = puff.life / puff.maxLife;
    const r = puff.radius * (1 + (1 - t) * 0.7) * zoom;
    ctx.save();
    ctx.globalAlpha = Math.max(0, t * 0.72);
    ctx.fillStyle = puff.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 9. Expanding Perfect Shockwave Rings
  for (const ring of state.shockwaves) {
    const pos = worldToScreen(ring.x, ring.y);
    const progress = 1 - ring.life / ring.maxLife;
    const expandW = (ring.width + progress * ring.expandScale) * zoom;
    const expandH = (12 + progress * (ring.expandScale * 0.36)) * zoom;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress) * 0.88;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = Math.max(1.5, 3.2 * (1 - progress));
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y, expandW / 2, expandH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 10. Falling Speed Trail Motes
  for (const trail of state.fallingTrails) {
    const pos = worldToScreen(trail.x, trail.y);
    const t = trail.life / trail.maxLife;
    const w = trail.width * t * zoom;
    const h = 14 * zoom;
    ctx.save();
    ctx.globalAlpha = t * 0.32;
    ctx.fillStyle = trail.color;
    roundRectPath(ctx, pos.x - w / 2, pos.y - h / 2, w, h, 4 * zoom);
    ctx.fill();
    ctx.restore();
  }

  // 11. Active Swinging or Falling Cake
  if (state.activeCake.visible) {
    const activePos = worldToScreen(state.activeCake.x, state.activeCake.y);
    const drawW = state.activeCake.width * zoom;
    const drawH = state.activeCake.height * zoom;

    ctx.save();
    ctx.translate(activePos.x, activePos.y - drawH / 2);
    ctx.rotate(state.activeCake.rotation);
    ctx.scale(state.activeCake.scale, state.activeCake.scale);

    if (state.magnetArmed) {
      ctx.shadowColor = 'rgba(234, 179, 72, 0.85)';
      ctx.shadowBlur = 18 * zoom;
    } else if (state.activeCake.comboGlow > 0) {
      ctx.shadowColor = `rgba(234, 179, 72, ${0.65 * state.activeCake.comboGlow})`;
      ctx.shadowBlur = 16 * zoom;
    }

    drawCakeSlice(
      ctx,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH,
      state.activeCake.flavor,
      state.magnetArmed,
      zoom
    );
    ctx.restore();
  }

  // 12. Pendulum Satin Rope & Golden Tongs
  drawPendulumRope(ctx, width, state.pendulum);

  // 13. Cut Debris Pieces
  for (const piece of state.debris) {
    const pos = worldToScreen(piece.x, piece.y);
    const drawW = piece.width * zoom;
    const drawH = piece.height * zoom;
    if (pos.y > height + 120) continue;

    ctx.save();
    ctx.globalAlpha = Math.max(0, piece.alpha);
    ctx.translate(pos.x, pos.y - drawH / 2);
    ctx.rotate(piece.rotation);
    drawCakeSlice(
      ctx,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH,
      piece.flavor,
      false,
      zoom
    );
    ctx.restore();
  }

  // 14. Slice Flash Blade Lines & Glint
  for (const sl of state.sliceLines) {
    const topP = worldToScreen(sl.x, sl.yTop);
    const botP = worldToScreen(sl.x, sl.yBottom);
    const t = Math.max(0, sl.life / sl.maxLife);
    const midY = (topP.y + botP.y) / 2;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 2.8 * t + 1;
    ctx.shadowColor = '#D9466E';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(topP.x, topP.y - 22 * (1 - t) - 10);
    ctx.lineTo(botP.x, botP.y + 22 * (1 - t) + 10);
    ctx.stroke();

    ctx.fillStyle = '#FFFDF9';
    drawMiniStar(ctx, topP.x, midY, 4, 11 * t, 2.5 * t);
    ctx.restore();
  }

  // 15. Rich Particles
  for (const pt of state.particles) {
    const pos = worldToScreen(pt.x, pt.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    ctx.translate(pos.x, pos.y);
    ctx.rotate(pt.rotation);
    ctx.fillStyle = pt.color;

    const s = pt.size * zoom;
    if (pt.shape === 'star') {
      drawMiniStar(ctx, 0, 0, 4, s * 1.3, s * 0.45);
    } else if (pt.shape === 'diamond') {
      drawMiniStar(ctx, 0, 0, 4, s * 1.4, s * 0.25);
    } else if (pt.shape === 'heart') {
      drawMiniHeart(ctx, s * 1.05);
    } else if (pt.shape === 'petal') {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.2, s * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 16. Floating Callouts
  for (const c of state.callouts) {
    const pos = worldToScreen(c.x, c.y);
    const progress = 1 - c.life / c.maxLife;
    const alpha = progress < 0.16 ? progress / 0.16 : Math.max(0, 1 - (progress - 0.16) / 0.84);
    const popScale =
      progress < 0.2
        ? 0.7 + (progress / 0.2) * 0.48
        : 1.18 - Math.min(1, (progress - 0.2) / 0.25) * 0.18;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pos.x, pos.y);
    ctx.scale(popScale * (c.scale ?? 1), popScale * (c.scale ?? 1));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 ${Math.round(21 * Math.max(0.85, zoom))}px "Fraunces", "Noto Serif TC", serif`;
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(255, 253, 249, 0.94)';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);

    if (c.subtext) {
      ctx.font = `700 ${Math.round(13 * Math.max(0.85, zoom))}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
      ctx.strokeText(c.subtext, 0, 23);
      ctx.fillStyle = '#3D262A';
      ctx.fillText(c.subtext, 0, 23);
    }
    ctx.restore();
  }

  // 17. Subtle Screen Flash Shimmer
  if (state.screenFlashAlpha > 0.002) {
    ctx.save();
    ctx.globalAlpha = state.screenFlashAlpha;
    ctx.fillStyle = state.screenFlashColor;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
}

function drawFloatingPropOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  type: PropType,
  ambientTime: number,
  zoom: number
): void {
  ctx.save();

  const palette =
    type === 'slow'
      ? { bg: '#EDE2FA', ring: '#8367C7', icon: '#6247AA', label: '緩速' }
      : type === 'magnet'
        ? { bg: '#FFF3D6', ring: '#D49B38', icon: '#B87D1B', label: '磁吸' }
        : type === 'shield'
          ? { bg: '#E0F4FA', ring: '#2A9BB5', icon: '#1C7990', label: '護盾' }
          : { bg: '#FCEAE8', ring: '#D9466E', icon: '#C5385F', label: '加寬' };

  // Outer rotating dashed aura
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ambientTime * 1.8);
  ctx.strokeStyle = palette.ring;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, r + 5 * zoom, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Crystal bubble sphere
  ctx.fillStyle = palette.bg;
  ctx.strokeStyle = palette.ring;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner gloss highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.3, y - r * 0.32, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Crisp vector icon inside orb
  ctx.strokeStyle = palette.icon;
  ctx.fillStyle = palette.icon;
  ctx.lineWidth = 2 * zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'slow') {
    // Hourglass / clock hands
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.25);
    ctx.lineTo(x, y);
    ctx.lineTo(x + r * 0.22, y + r * 0.14);
    ctx.stroke();
  } else if (type === 'magnet') {
    // Sparkle star emblem
    drawMiniStar(ctx, x, y, 4, r * 0.56, r * 0.22);
  } else if (type === 'shield') {
    // Crisp protective shield outline
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.48);
    ctx.lineTo(x + r * 0.38, y - r * 0.3);
    ctx.quadraticCurveTo(x + r * 0.38, y + r * 0.2, x, y + r * 0.48);
    ctx.quadraticCurveTo(x - r * 0.38, y + r * 0.2, x - r * 0.38, y - r * 0.3);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Widen horizontal arrows
    ctx.beginPath();
    ctx.moveTo(x - r * 0.45, y);
    ctx.lineTo(x + r * 0.45, y);
    ctx.moveTo(x - r * 0.25, y - r * 0.22);
    ctx.lineTo(x - r * 0.45, y);
    ctx.lineTo(x - r * 0.25, y + r * 0.22);
    ctx.moveTo(x + r * 0.25, y - r * 0.22);
    ctx.lineTo(x + r * 0.45, y);
    ctx.lineTo(x + r * 0.25, y + r * 0.22);
    ctx.stroke();
  }

  // Compact legible tag underneath
  ctx.font = `700 ${Math.round(10 * Math.max(0.85, zoom))}px "Plus Jakarta Sans", "Noto Sans TC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 253, 249, 0.92)';
  ctx.strokeText(palette.label, x, y + r + 5 * zoom);
  ctx.fillStyle = palette.icon;
  ctx.fillText(palette.label, x, y + r + 5 * zoom);

  ctx.restore();
}

function drawTableAndPedestal(
  ctx: CanvasRenderingContext2D,
  viewportW: number,
  viewportH: number,
  centerX: number,
  topY: number,
  pedestalW: number,
  zoom: number
): void {
  ctx.save();

  const plateThickness = 12 * zoom;
  const stemH = 38 * zoom;
  const tableTopY = topY + plateThickness + stemH;

  if (tableTopY < viewportH + 40) {
    const counterGrad = ctx.createLinearGradient(0, tableTopY, 0, viewportH + 40);
    counterGrad.addColorStop(0, '#F6E8E4');
    counterGrad.addColorStop(0.14, '#EAD3CE');
    counterGrad.addColorStop(1, '#D7B8B2');
    ctx.fillStyle = counterGrad;
    ctx.fillRect(0, tableTopY, viewportW, Math.max(120, viewportH - tableTopY + 40));

    ctx.fillStyle = 'rgba(212, 155, 56, 0.45)';
    ctx.fillRect(0, tableTopY, viewportW, Math.max(2, 2.5 * zoom));

    ctx.fillStyle = 'rgba(61, 38, 42, 0.14)';
    ctx.beginPath();
    ctx.ellipse(centerX, tableTopY + 3 * zoom, pedestalW * 0.34, 6 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stemGrad = ctx.createLinearGradient(centerX - pedestalW * 0.25, 0, centerX + pedestalW * 0.25, 0);
  stemGrad.addColorStop(0, '#EFE7E5');
  stemGrad.addColorStop(0.35, '#FFFFFF');
  stemGrad.addColorStop(1, '#DDD0CD');
  ctx.fillStyle = stemGrad;

  ctx.beginPath();
  ctx.moveTo(centerX - pedestalW * 0.14, topY + plateThickness);
  ctx.quadraticCurveTo(centerX - pedestalW * 0.08, topY + plateThickness + stemH * 0.55, centerX - pedestalW * 0.28, tableTopY);
  ctx.lineTo(centerX + pedestalW * 0.28, tableTopY);
  ctx.quadraticCurveTo(centerX + pedestalW * 0.08, topY + plateThickness + stemH * 0.55, centerX + pedestalW * 0.14, topY + plateThickness);
  ctx.closePath();
  ctx.fill();

  const plateGrad = ctx.createLinearGradient(centerX - pedestalW / 2, topY, centerX + pedestalW / 2, topY);
  plateGrad.addColorStop(0, '#EBE2DF');
  plateGrad.addColorStop(0.45, '#FFFFFF');
  plateGrad.addColorStop(1, '#E3D6D3');

  ctx.fillStyle = plateGrad;
  ctx.strokeStyle = 'rgba(212, 155, 56, 0.55)';
  ctx.lineWidth = Math.max(1, 1.5 * zoom);
  roundRectPath(ctx, centerX - pedestalW / 2, topY, pedestalW, plateThickness, 5 * zoom);
  ctx.fill();
  ctx.stroke();

  const scallopCount = Math.max(6, Math.round(pedestalW / (18 * zoom)));
  const scallopW = pedestalW / scallopCount;
  ctx.fillStyle = '#FFFDF9';
  for (let i = 0; i < scallopCount; i++) {
    const sx = centerX - pedestalW / 2 + (i + 0.5) * scallopW;
    ctx.beginPath();
    ctx.arc(sx, topY + plateThickness, scallopW * 0.42, 0, Math.PI);
    ctx.fill();
  }

  ctx.restore();
}

function drawPendulumRope(
  ctx: CanvasRenderingContext2D,
  viewportW: number,
  pendulum: RenderContextState['pendulum']
): void {
  const { pivotScreenX, pivotScreenY, bobScreenX, bobScreenY, clipOpen, hasCake } = pendulum;
  ctx.save();

  const railGrad = ctx.createLinearGradient(0, pivotScreenY - 8, 0, pivotScreenY);
  railGrad.addColorStop(0, 'rgba(212, 155, 56, 0.18)');
  railGrad.addColorStop(1, 'rgba(212, 155, 56, 0.45)');
  ctx.fillStyle = railGrad;
  ctx.fillRect(viewportW * 0.12, pivotScreenY - 4, viewportW * 0.76, 2);

  ctx.fillStyle = '#D49B38';
  ctx.beginPath();
  ctx.arc(pivotScreenX, pivotScreenY - 3, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6DF';
  ctx.beginPath();
  ctx.arc(pivotScreenX - 1.5, pivotScreenY - 4.5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#E58AA3';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pivotScreenX, pivotScreenY);
  ctx.lineTo(bobScreenX, bobScreenY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 247, 245, 0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pivotScreenX - 0.5, pivotScreenY);
  ctx.lineTo(bobScreenX - 0.5, bobScreenY);
  ctx.stroke();

  const ropeAngle = Math.atan2(bobScreenX - pivotScreenX, bobScreenY - pivotScreenY);

  ctx.translate(bobScreenX, bobScreenY);
  ctx.rotate(-ropeAngle);

  ctx.fillStyle = '#D49B38';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  const spread = hasCake ? clipOpen * 0.42 : 0.34;
  ctx.strokeStyle = '#C98A2E';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';

  ctx.save();
  ctx.rotate(spread);
  ctx.beginPath();
  ctx.moveTo(-2, 2);
  ctx.quadraticCurveTo(-11, 8, -7, 14);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-spread);
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.quadraticCurveTo(11, 8, 7, 14);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

export function drawCakeSlice(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  flavor: CakeFlavor,
  isPerfect: boolean,
  zoom: number
): void {
  if (w < 1 || h < 1) return;

  ctx.save();
  const radius = Math.min(6 * zoom, w * 0.25, h * 0.25);

  ctx.fillStyle = 'rgba(61, 38, 42, 0.08)';
  roundRectPath(ctx, x + 1, y + 2, w, h, radius);
  ctx.fill();

  const spongeGrad = ctx.createLinearGradient(x, y, x, y + h);
  spongeGrad.addColorStop(0, flavor.spongeTop);
  spongeGrad.addColorStop(1, flavor.spongeBottom);
  ctx.fillStyle = spongeGrad;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.clip();

  const fillingY = y + h * 0.52;
  const fillingH = Math.max(3, h * 0.16);
  ctx.fillStyle = flavor.fillingColor;
  ctx.fillRect(x, fillingY, w, fillingH);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(x, fillingY - Math.max(1.5, h * 0.05), w, Math.max(1.5, h * 0.05));

  const frostingH = h * 0.28;
  ctx.fillStyle = flavor.frostingColor;
  ctx.fillRect(x, y, w, frostingH);

  const dripSpacing = Math.max(10 * zoom, 11);
  const dripCount = Math.max(1, Math.floor(w / dripSpacing));
  const actualSpacing = w / dripCount;

  ctx.fillStyle = flavor.frostingShadow;
  for (let i = 0; i < dripCount; i++) {
    const dx = x + (i + 0.5) * actualSpacing;
    const dripR = Math.min(actualSpacing * 0.45, h * 0.14);
    ctx.beginPath();
    ctx.arc(dx, y + frostingH + 1, dripR, 0, Math.PI);
    ctx.fill();
  }

  ctx.fillStyle = flavor.frostingColor;
  for (let i = 0; i < dripCount; i++) {
    const dx = x + (i + 0.5) * actualSpacing;
    const dripR = Math.min(actualSpacing * 0.44, h * 0.12);
    ctx.beginPath();
    ctx.arc(dx, y + frostingH - 0.5, dripR, 0, Math.PI);
    ctx.fill();
  }

  const sprinkleCount = Math.max(1, Math.floor(w / (18 * zoom)));
  for (let i = 0; i < sprinkleCount; i++) {
    const tx = x + ((i + 0.5) / sprinkleCount) * w;
    const ty = y + frostingH * 0.46;
    const color = flavor.sprinkleColors[i % flavor.sprinkleColors.length];
    ctx.fillStyle = color;

    if (flavor.toppingStyle === 'berry' && w > 24 && i % 2 === 0) {
      ctx.beginPath();
      ctx.arc(tx, ty + 0.5, Math.min(3.5 * zoom, actualSpacing * 0.25), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.beginPath();
      ctx.arc(tx - 1, ty - 0.5, Math.max(0.8, 1 * zoom), 0, Math.PI * 2);
      ctx.fill();
    } else if (flavor.toppingStyle === 'gold') {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(i * 0.7);
      ctx.fillRect(-2.5 * zoom, -1.2 * zoom, 5 * zoom, 2.4 * zoom);
      ctx.restore();
    } else if (flavor.toppingStyle === 'meringue') {
      ctx.fillStyle = '#FFFDF5';
      ctx.beginPath();
      ctx.moveTo(tx - 4 * zoom, y + frostingH * 0.7);
      ctx.quadraticCurveTo(tx, y + 1, tx + 4 * zoom, y + frostingH * 0.7);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(1.5, 2.1 * zoom), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x, y, w, Math.max(1.5, 2 * zoom));

  ctx.restore();

  ctx.strokeStyle = isPerfect ? 'rgba(212, 155, 56, 0.75)' : 'rgba(61, 38, 42, 0.14)';
  ctx.lineWidth = isPerfect ? 1.5 : 1;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();

  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawMiniStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

function drawMiniHeart(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size * 0.65;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.3, s * 0.1, -s * 1.2, -s * 0.95, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 1.2, -s * 0.95, s * 1.3, s * 0.1, 0, s * 0.9);
  ctx.closePath();
  ctx.fill();
}
