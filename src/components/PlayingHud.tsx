import {
  ChevronsLeftRight,
  Clock,
  Magnet,
  Pause,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CakeFlavor, HudSnapshot, PropType } from '../game/types';

interface PlayingHudProps {
  hud: HudSnapshot;
  isMuted: boolean;
  unlockToast: CakeFlavor | null;
  onPause: () => void;
  onToggleMute: () => void;
  onUseProp: (type: PropType) => void;
}

export function PlayingHud({
  hud,
  isMuted,
  unlockToast,
  onPause,
  onToggleMute,
  onUseProp,
}: PlayingHudProps) {
  const layersToNext = hud.nextFlavor ? Math.max(0, hud.nextFlavor.unlockHeight - hud.height) : null;

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between px-3.5 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-5">
      {/* Top Perimeter HUD (<12% viewport height, unobstructed center playfield) */}
      <div className="flex items-start justify-between gap-3">
        {/* Left Score & Combo Cluster */}
        <div className="flex flex-col items-start">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-3xl sm:text-4xl font-bold text-[#3D262A] tabular-nums leading-none drop-shadow-[0_1px_0_rgba(255,253,249,0.9)]">
              {hud.score.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-[#6E4F55] tabular-nums">
              {hud.height} 層
            </span>
          </div>

          {hud.combo > 0 ? (
            <div className="mt-1 flex items-center gap-1 text-xs font-bold text-[#B87D1B] tabular-nums">
              <Sparkles className="w-3.5 h-3.5 text-[#D49B38]" />
              <span>完美連擊 ×{hud.combo}</span>
            </div>
          ) : (
            <p className="mt-1 text-xs font-medium text-[#7C5C61] truncate max-w-[190px]">
              {hud.currentFlavor.nameZh}
              {layersToNext !== null && layersToNext > 0 ? ` · 再 ${layersToNext} 層換口味` : ''}
            </p>
          )}
        </div>

        {/* Right Controls Cluster (44x44px touch targets) */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onToggleMute}
            aria-label={isMuted ? '開啟音效與音樂' : '靜音'}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#FFFDF9]/92 text-[#3D262A] border border-[#3D262A]/12 shadow-xs hover:bg-[#FFF5F3] active:scale-[0.96] transition-transform flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9466E]"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-[#7C5C61]" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#D9466E]" />
            )}
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onPause}
            aria-label="暫停遊戲"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#FFFDF9]/92 text-[#3D262A] border border-[#3D262A]/12 shadow-xs hover:bg-[#FFF5F3] active:scale-[0.96] transition-transform flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9466E]"
          >
            <Pause className="w-5 h-5 text-[#3D262A]" />
          </button>
        </div>
      </div>

      {/* Bottom Thumb-Zone Prop Bar & Non-Blocking Toast */}
      <div className="flex flex-col items-center gap-2.5">
        {unlockToast && (
          <div className="px-4 py-2 rounded-2xl bg-[#FFFDF9]/95 border border-[#D49B38]/40 shadow-md flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 border border-[#3D262A]/15"
              style={{ backgroundColor: unlockToast.fillingColor }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold text-[#3D262A] whitespace-nowrap">
              解鎖新口味：{unlockToast.nameZh}
            </span>
          </div>
        )}

        {hud.height === 0 && (
          <p className="text-xs font-medium text-[#5E4247] bg-[#FFFDF9]/85 px-3 py-1.5 rounded-xl border border-[#3D262A]/8 text-center">
            完美對齊可自動貼合並回復寬度 · 護盾可防止失誤結束
          </p>
        )}

        {/* 4 Compact Patisserie Prop Controls (Thumb Zone, >= 44px height) */}
        <div
          className="flex items-center justify-center gap-1.5 sm:gap-2.5 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Slow Motion Syrup */}
          <button
            type="button"
            disabled={hud.props.slow <= 0}
            onClick={() => onUseProp('slow')}
            aria-label={`使用焦糖緩速道具，剩餘 ${hud.props.slow} 個`}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-2xl border shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-transform whitespace-nowrap shrink-0 ${
              hud.slowRemaining > 0
                ? 'bg-[#EDE2FA] border-[#8367C7] text-[#4C358A]'
                : hud.props.slow > 0
                  ? 'bg-[#FFFDF9]/94 border-[#3D262A]/12 text-[#3D262A] hover:bg-[#F7F1FE] active:scale-[0.96] cursor-pointer'
                  : 'bg-[#FFFDF9]/55 border-[#3D262A]/8 text-[#7C5C61]/55 cursor-not-allowed'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8367C7] shrink-0" />
            <span>{hud.slowRemaining > 0 ? `${hud.slowRemaining.toFixed(1)}s` : '緩速'}</span>
            <span className="tabular-nums opacity-75">×{hud.props.slow}</span>
          </button>

          {/* Perfect Magnet */}
          <button
            type="button"
            disabled={hud.props.magnet <= 0 || hud.magnetArmed}
            onClick={() => onUseProp('magnet')}
            aria-label={`使用完美磁吸道具，剩餘 ${hud.props.magnet} 個`}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-2xl border shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-transform whitespace-nowrap shrink-0 ${
              hud.magnetArmed
                ? 'bg-[#FFF3D6] border-[#D49B38] text-[#8A5A08]'
                : hud.props.magnet > 0
                  ? 'bg-[#FFFDF9]/94 border-[#3D262A]/12 text-[#3D262A] hover:bg-[#FFF9E8] active:scale-[0.96] cursor-pointer'
                  : 'bg-[#FFFDF9]/55 border-[#3D262A]/8 text-[#7C5C61]/55 cursor-not-allowed'
            }`}
          >
            <Magnet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D49B38] shrink-0" />
            <span>{hud.magnetArmed ? '就緒' : '磁吸'}</span>
            <span className="tabular-nums opacity-75">×{hud.props.magnet}</span>
          </button>

          {/* Cream Widen */}
          <button
            type="button"
            disabled={hud.props.widen <= 0}
            onClick={() => onUseProp('widen')}
            aria-label={`使用奶油膨脹加寬道具，剩餘 ${hud.props.widen} 個`}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-2xl border shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-transform whitespace-nowrap shrink-0 ${
              hud.props.widen > 0
                ? 'bg-[#FFFDF9]/94 border-[#3D262A]/12 text-[#3D262A] hover:bg-[#FCEAE8] active:scale-[0.96] cursor-pointer'
                : 'bg-[#FFFDF9]/55 border-[#3D262A]/8 text-[#7C5C61]/55 cursor-not-allowed'
            }`}
          >
            <ChevronsLeftRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D9466E] shrink-0" />
            <span>加寬</span>
            <span className="tabular-nums opacity-75">×{hud.props.widen}</span>
          </button>

          {/* Sugar Shield */}
          <button
            type="button"
            disabled={hud.props.shield <= 0 || hud.shieldArmed}
            onClick={() => onUseProp('shield')}
            aria-label={`使用糖晶護盾道具，剩餘 ${hud.props.shield} 個`}
            className={`min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-2xl border shadow-xs flex items-center gap-1.5 text-xs font-semibold transition-transform whitespace-nowrap shrink-0 ${
              hud.shieldArmed
                ? 'bg-[#E0F4FA] border-[#2A9BB5] text-[#156073]'
                : hud.props.shield > 0
                  ? 'bg-[#FFFDF9]/94 border-[#3D262A]/12 text-[#3D262A] hover:bg-[#EAF8FC] active:scale-[0.96] cursor-pointer'
                  : 'bg-[#FFFDF9]/55 border-[#3D262A]/8 text-[#7C5C61]/55 cursor-not-allowed'
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2A9BB5] shrink-0" />
            <span>{hud.shieldArmed ? '守護' : '護盾'}</span>
            <span className="tabular-nums opacity-75">×{hud.props.shield}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
