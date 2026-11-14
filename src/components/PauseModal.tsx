import { Home, Play, RotateCcw } from 'lucide-react';

interface PauseModalProps {
  score: number;
  height: number;
  onResume: () => void;
  onRestart: () => void;
  onBackToTitle: () => void;
}

export function PauseModal({
  score,
  height,
  onResume,
  onRestart,
  onBackToTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#2A1B1E]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="w-full max-w-xs rounded-3xl bg-[#FFFDF9] border border-[#3D262A]/12 p-6 shadow-2xl text-center">
        <p className="text-xs font-semibold tracking-wider text-[#A85D6E]">暫停中</p>
        <h2 id="pause-title" className="font-display text-2xl font-bold text-[#3D262A] mt-1">
          稍作休息
        </h2>

        <div className="mt-3 flex items-center justify-center gap-2.5 text-sm text-[#6E4F55] tabular-nums">
          <span>目前 {score.toLocaleString()} 分</span>
          <span aria-hidden="true">·</span>
          <span>{height} 層</span>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#D9466E] hover:bg-[#C5385F] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>繼續製作</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FCEAE8] hover:bg-[#F8DAD6] text-[#3D262A] font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新開始</span>
          </button>

          <button
            type="button"
            onClick={onBackToTitle}
            className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-transparent hover:bg-[#F7F1F0] text-[#6E4F55] font-medium text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>返回主畫面</span>
          </button>
        </div>
      </div>
    </div>
  );
}
