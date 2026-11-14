import { BookOpen, Play, Volume2, VolumeX } from 'lucide-react';
import type { PersistentProgress } from '../game/storage';
import { CAKE_FLAVORS } from '../game/flavors';

interface TitleOverlayProps {
  progress: PersistentProgress;
  isMuted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onOpenCollection: () => void;
}

export function TitleOverlay({
  progress,
  isMuted,
  onStart,
  onToggleMute,
  onOpenCollection,
}: TitleOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none px-5 pt-5 pb-8 sm:px-8 sm:py-8">
      {/* Top Right Utility Controls */}
      <div className="flex items-center justify-end gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenCollection}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FFFDF9]/95 text-[#3D262A] border border-[#3D262A]/12 shadow-sm hover:bg-[#FFF5F3] active:scale-[0.98] transition-transform flex items-center gap-2 text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9466E]"
        >
          <BookOpen className="w-4 h-4 text-[#D9466E]" />
          <span>甜點圖鑑</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? '開啟音效' : '靜音'}
          className="min-h-[44px] min-w-[44px] rounded-xl bg-[#FFFDF9]/95 text-[#3D262A] border border-[#3D262A]/12 shadow-sm hover:bg-[#FFF5F3] active:scale-[0.98] transition-transform flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9466E]"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-[#7C5C61]" /> : <Volume2 className="w-5 h-5 text-[#D9466E]" />}
        </button>
      </div>

      {/* Center-Top Bespoke Patisserie SVG Title Lockup */}
      <div className="flex flex-col items-center text-center my-auto pt-2 pb-16 sm:pb-24">
        <div className="animate-float-slow flex flex-col items-center max-w-md px-5 py-6 rounded-3xl bg-[#FFFDF9]/82 border border-[#3D262A]/10 shadow-sm">
          {/* Custom Patisserie Crown & Ribbon SVG Emblem */}
          <svg
            width="180"
            height="48"
            viewBox="0 0 180 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="mb-2"
          >
            <path
              d="M24 26C48 26 54 14 72 14C82 14 86 20 90 24C94 20 98 14 108 14C126 14 132 26 156 26"
              stroke="#D49B38"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M72 34H108C108 26 100 20 90 20C80 20 72 26 72 34Z"
              fill="#FCEAE8"
              stroke="#D9466E"
              strokeWidth="1.6"
            />
            <circle cx="90" cy="14" r="4.5" fill="#D9466E" />
            <circle cx="88.5" cy="12.5" r="1.4" fill="#FFFDF9" />
            <path d="M62 36H118" stroke="#D49B38" strokeWidth="2" strokeLinecap="round" />
            <circle cx="42" cy="24" r="2" fill="#D49B38" />
            <circle cx="138" cy="24" r="2" fill="#D49B38" />
          </svg>

          <p className="text-xs tracking-[0.2em] font-semibold text-[#A85D6E] mb-1">
            MAISON SUCRÉE · PARIS
          </p>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#3D262A] tracking-tight text-balance">
            法式夢幻蛋糕疊疊樂
          </h1>

          <p className="mt-2.5 text-sm text-[#6E4F55] leading-relaxed max-w-xs">
            抓準上方緞帶鐘擺的擺盪節奏，點擊釋放蛋糕，層層堆疊出你的巴黎高塔。
          </p>

          {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#7C5C61] tabular-nums">
            <span>最高分數 {progress.bestScore.toLocaleString()}</span>
            <span aria-hidden="true">·</span>
            <span>最高 {progress.bestHeight} 層</span>
            <span aria-hidden="true">·</span>
            <span>
              已解鎖 {progress.unlockedFlavorIds.length}/{CAKE_FLAVORS.length} 口味
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Ergonomic Thumb-Zone Primary CTA & Single Control Hint */}
      <div className="flex flex-col items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onStart}
          className="min-h-[52px] px-10 py-3.5 rounded-2xl bg-[#D9466E] hover:bg-[#C5385F] active:scale-[0.98] text-white font-semibold text-base shadow-lg shadow-[#D9466E]/25 transition-all flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3D262A]"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>開始製作</span>
        </button>

        <p className="text-xs font-medium text-[#5E4247] bg-[#FFFDF9]/80 px-3 py-1 rounded-lg">
          點擊螢幕或按空白鍵釋放 · 1-4 道具 · Esc 暫停
        </p>
      </div>
    </div>
  );
}
