const STORAGE_KEY = 'patisserie_tower_save_v1';

export interface PersistentProgress {
  bestScore: number;
  bestHeight: number;
  unlockedFlavorIds: string[];
  isMuted: boolean;
}

const DEFAULT_PROGRESS: PersistentProgress = {
  bestScore: 0,
  bestHeight: 0,
  unlockedFlavorIds: ['fraisier'],
  isMuted: false,
};

export function loadProgress(): PersistentProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<PersistentProgress>;
    const unlocked = Array.isArray(parsed.unlockedFlavorIds)
      ? Array.from(new Set(['fraisier', ...parsed.unlockedFlavorIds.filter((id) => typeof id === 'string')]))
      : ['fraisier'];
    return {
      bestScore: typeof parsed.bestScore === 'number' && Number.isFinite(parsed.bestScore) ? Math.max(0, Math.floor(parsed.bestScore)) : 0,
      bestHeight: typeof parsed.bestHeight === 'number' && Number.isFinite(parsed.bestHeight) ? Math.max(0, Math.floor(parsed.bestHeight)) : 0,
      unlockedFlavorIds: unlocked,
      isMuted: Boolean(parsed.isMuted),
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: PersistentProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors cleanly
  }
}
