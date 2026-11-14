import { Check, Lock, X } from 'lucide-react';
import { CAKE_FLAVORS } from '../game/flavors';
import type { CakeFlavor } from '../game/types';

interface FlavorCollectionModalProps {
  unlockedIds: string[];
  onClose: () => void;
}

function CakeSwatch({ flavor, unlocked }: { flavor: CakeFlavor; unlocked: boolean }) {
  return (
    <div
      className={`w-14 h-12 rounded-xl border flex flex-col overflow-hidden shrink-0 ${
        unlocked ? 'border-[#3D262A]/15 shadow-xs' : 'border-[#3D262A]/10 opacity-45 grayscale'
      }`}
      aria-hidden="true"
    >
      <div className="h-3 w-full" style={{ backgroundColor: flavor.frostingColor }} />
      <div className="h-3.5 w-full" style={{ backgroundColor: flavor.spongeTop }} />
      <div className="h-2 w-full" style={{ backgroundColor: flavor.fillingColor }} />
      <div className="flex-1 w-full" style={{ backgroundColor: flavor.spongeBottom }} />
    </div>
  );
}

export function FlavorCollectionModal({ unlockedIds, onClose }: FlavorCollectionModalProps) {
  const unlockedSet = new Set(unlockedIds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2A1B1E]/45 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="collection-title"
    >
      <div
        className="w-full sm:max-w-lg max-h-[85dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FFFDF9] border border-[#3D262A]/12 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3D262A]/10">
          <div>
            <h2 id="collection-title" className="font-display text-xl font-bold text-[#3D262A]">
              法式甜點圖鑑
            </h2>
            <p className="text-xs text-[#7C5C61] mt-0.5 tabular-nums">
              已解鎖 {unlockedSet.size} / {CAKE_FLAVORS.length} 種經典口味
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉圖鑑"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#5E4247] hover:bg-[#FCEAE8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Flavor List */}
        <div className="overflow-y-auto px-6 py-4 space-y-3">
          {CAKE_FLAVORS.map((flavor) => {
            const isUnlocked = unlockedSet.has(flavor.id);
            return (
              <div
                key={flavor.id}
                className={`flex items-start gap-4 p-3.5 rounded-2xl border ${
                  isUnlocked
                    ? 'bg-[#FFF9F7] border-[#3D262A]/10'
                    : 'bg-[#F7F1F0]/70 border-[#3D262A]/8'
                }`}
              >
                <CakeSwatch flavor={flavor} unlocked={isUnlocked} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#3D262A] truncate">
                      {flavor.nameZh}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-medium shrink-0 tabular-nums">
                      {isUnlocked ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3F8E5B]" />
                          <span className="text-[#3F8E5B]">已解鎖</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-[#7C5C61]" />
                          <span className="text-[#7C5C61]">第 {flavor.unlockHeight} 層解鎖</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#A85D6E] font-medium mt-0.5">{flavor.nameFr}</p>
                  <p className="text-xs text-[#6E4F55] mt-1 leading-relaxed">
                    {isUnlocked ? flavor.descriptionZh : '繼續向上堆疊即可解鎖這道法式甜點配方。'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Close Action */}
        <div className="px-6 py-4 border-t border-[#3D262A]/10 bg-[#FFFDF9]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#3D262A] hover:bg-[#2A1A1D] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            回到遊戲
          </button>
        </div>
      </div>
    </div>
  );
}
