import { Award, BookOpen, Home, RotateCcw } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface GameOverModalProps {
  snapshot: HudSnapshot;
  bestScore: number;
  onPlayAgain: () => void;
  onBackToTitle: () => void;
  onOpenCollection: () => void;
}

export function GameOverModal({
  snapshot,
  bestScore,
  onPlayAgain,
  onBackToTitle,
  onOpenCollection,
}: GameOverModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-[#2A1B1E]/25 p-3 sm:p-6 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#FFFDF9]/96 border border-[#3D262A]/12 px-6 py-5 sm:p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            {snapshot.isNewRecord && snapshot.score > 0 ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#B87D1B] mb-1">
                <Award className="w-4 h-4 text-[#D49B38]" />
                <span>締造全新甜點紀錄</span>
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#A85D6E] mb-1">甜點塔完成</p>
            )}
            <h2 id="gameover-title" className="font-display text-2xl sm:text-3xl font-bold text-[#3D262A]">
              {snapshot.height >= 15
                ? '巴黎主廚級傑作！'
                : snapshot.height >= 6
                  ? '甜美繽紛的高塔！'
                  : '差一點就疊上去了！'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenCollection}
            aria-label="查看甜點圖鑑"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#FCEAE8] hover:bg-[#F8DAD6] text-[#3D262A] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <BookOpen className="w-5 h-5 text-[#D9466E]" />
          </button>
        </div>

        {/* Clean Unboxed Stats Grid */}
        <div className="mt-4 pt-4 border-t border-[#3D262A]/10 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-[#7C5C61]">本局總分</p>
            <p className="font-display text-2xl font-bold text-[#3D262A] tabular-nums mt-0.5">
              {snapshot.score.toLocaleString()}
            </p>
          </div>
          <div className="border-x border-[#3D262A]/10">
            <p className="text-xs text-[#7C5C61]">堆疊高度</p>
            <p className="font-display text-2xl font-bold text-[#D9466E] tabular-nums mt-0.5">
              {snapshot.height} 層
            </p>
          </div>
          <div>
            <p className="text-xs text-[#7C5C61]">最高連擊</p>
            <p className="font-display text-2xl font-bold text-[#B87D1B] tabular-nums mt-0.5">
              ×{snapshot.maxCombo}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#7C5C61] tabular-nums">
          <span>歷史最高 {bestScore.toLocaleString()} 分</span>
          <span aria-hidden="true">·</span>
          <span>完美對齊 {snapshot.perfectCount} 次</span>
          <span aria-hidden="true">·</span>
          <span>最終口味 {snapshot.currentFlavor.nameZh}</span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBackToTitle}
            className="min-h-[48px] px-4 py-3 rounded-xl bg-[#F7F1F0] hover:bg-[#EDE3E1] text-[#3D262A] font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>主畫面</span>
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#D9466E] hover:bg-[#C5385F] active:scale-[0.98] text-white font-semibold text-base shadow-lg shadow-[#D9466E]/25 flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>再疊一座</span>
          </button>
        </div>
      </div>
    </div>
  );
}
