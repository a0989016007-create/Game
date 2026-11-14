import { useCallback, useEffect, useRef, useState } from 'react';
import patisserieBackdropUrl from './assets/images/patisserie_salon_backdrop_1794635267630.jpg';
import { FlavorCollectionModal } from './components/FlavorCollectionModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { PlayingHud } from './components/PlayingHud';
import { TitleOverlay } from './components/TitleOverlay';
import { PatisserieAudio } from './game/audio';
import { CakeTowerEngine } from './game/engine';
import { CAKE_FLAVORS } from './game/flavors';
import { loadProgress, saveProgress, type PersistentProgress } from './game/storage';
import type { CakeFlavor, HudSnapshot, PropType } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  status: 'TITLE_MENU',
  score: 0,
  height: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  currentFlavor: CAKE_FLAVORS[0],
  nextFlavor: CAKE_FLAVORS[1] ?? null,
  newlyUnlockedFlavor: null,
  isNewRecord: false,
  props: { slow: 1, magnet: 1, widen: 1, shield: 1 },
  slowRemaining: 0,
  magnetArmed: false,
  shieldArmed: false,
};

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CakeTowerEngine | null>(null);
  const audioRef = useRef<PatisserieAudio | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const gameOverAtRef = useRef<number>(0);

  const [progress, setProgress] = useState<PersistentProgress>(() => loadProgress());
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [unlockToast, setUnlockToast] = useState<CakeFlavor | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const initialSave = loadProgress();
    const audio = new PatisserieAudio(initialSave.isMuted);
    audioRef.current = audio;

    const engine = new CakeTowerEngine(
      canvas,
      audio,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onFlavorUnlocked: (flavor) => {
          setProgress((prev) => {
            if (prev.unlockedFlavorIds.includes(flavor.id)) return prev;
            const next: PersistentProgress = {
              ...prev,
              unlockedFlavorIds: [...prev.unlockedFlavorIds, flavor.id],
            };
            saveProgress(next);
            return next;
          });

          setUnlockToast(flavor);
          if (toastTimerRef.current !== null) {
            window.clearTimeout(toastTimerRef.current);
          }
          toastTimerRef.current = window.setTimeout(() => {
            setUnlockToast(null);
          }, 2600);
        },
        onGameOver: (finalSnapshot) => {
          gameOverAtRef.current = performance.now();
          setProgress((prev) => {
            const nextBestScore = Math.max(prev.bestScore, finalSnapshot.score);
            const nextBestHeight = Math.max(prev.bestHeight, finalSnapshot.height);
            if (nextBestScore === prev.bestScore && nextBestHeight === prev.bestHeight) {
              return prev;
            }
            const next: PersistentProgress = {
              ...prev,
              bestScore: nextBestScore,
              bestHeight: nextBestHeight,
            };
            saveProgress(next);
            engine.syncBestScore(nextBestScore);
            return next;
          });
        },
      },
      initialSave.bestScore,
      initialSave.unlockedFlavorIds,
      patisserieBackdropUrl
    );

    engineRef.current = engine;
    engine.startLoop();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        engine.resize(width, height);
      }
    });
    observer.observe(container);

    const handleVisibilityOrBlur = () => {
      if (document.hidden || !document.hasFocus()) {
        engine.pause();
      }
    };

    window.addEventListener('blur', handleVisibilityOrBlur);
    document.addEventListener('visibilitychange', handleVisibilityOrBlur);

    return () => {
      observer.disconnect();
      window.removeEventListener('blur', handleVisibilityOrBlur);
      document.removeEventListener('visibilitychange', handleVisibilityOrBlur);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      engine.destroy();
      audio.destroy();
      engineRef.current = null;
      audioRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    setUnlockToast(null);
    setIsCollectionOpen(false);
    engineRef.current?.startNewGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handleBackToTitle = useCallback(() => {
    setUnlockToast(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    setProgress((prev) => {
      const nextMuted = !prev.isMuted;
      audioRef.current?.setMuted(nextMuted);
      const next = { ...prev, isMuted: nextMuted };
      saveProgress(next);
      return next;
    });
  }, []);

  const handleUseProp = useCallback((type: PropType) => {
    engineRef.current?.activateProp(type);
  }, []);

  const handlePlayfieldPointerDown = useCallback(() => {
    if (hud.status === 'PLAYING' && !isCollectionOpen) {
      engineRef.current?.handleTap();
    }
  }, [hud.status, isCollectionOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (isCollectionOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsCollectionOpen(false);
        }
        return;
      }

      if (hud.status === 'TITLE_MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStart();
        }
        return;
      }

      if (hud.status === 'PLAYING') {
        if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          engineRef.current?.handleTap();
        } else if (e.key === '1') {
          e.preventDefault();
          engineRef.current?.activateProp('slow');
        } else if (e.key === '2') {
          e.preventDefault();
          engineRef.current?.activateProp('magnet');
        } else if (e.key === '3') {
          e.preventDefault();
          engineRef.current?.activateProp('widen');
        } else if (e.key === '4') {
          e.preventDefault();
          engineRef.current?.activateProp('shield');
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePause();
        }
        return;
      }

      if (hud.status === 'PAUSED') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Enter') {
          e.preventDefault();
          handleResume();
        }
        return;
      }

      if (hud.status === 'GAME_OVER') {
        if (
          (e.key === 'Enter' || e.key === ' ') &&
          performance.now() - gameOverAtRef.current > 350
        ) {
          e.preventDefault();
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.status, isCollectionOpen, handleStart, handlePause, handleResume]);

  return (
    <main
      ref={containerRef}
      onPointerDown={handlePlayfieldPointerDown}
      className="relative w-full h-[100dvh] overflow-hidden bg-[#FFF7F5]"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-manipulation"
        aria-label="法式夢幻蛋糕疊疊樂遊戲畫布"
      />

      {hud.status === 'TITLE_MENU' && (
        <TitleOverlay
          progress={progress}
          isMuted={progress.isMuted}
          onStart={handleStart}
          onToggleMute={handleToggleMute}
          onOpenCollection={() => setIsCollectionOpen(true)}
        />
      )}

      {hud.status === 'PLAYING' && (
        <PlayingHud
          hud={hud}
          isMuted={progress.isMuted}
          unlockToast={unlockToast}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onUseProp={handleUseProp}
        />
      )}

      {hud.status === 'PAUSED' && (
        <PauseModal
          score={hud.score}
          height={hud.height}
          onResume={handleResume}
          onRestart={handleStart}
          onBackToTitle={handleBackToTitle}
        />
      )}

      {hud.status === 'GAME_OVER' && !isCollectionOpen && (
        <GameOverModal
          snapshot={hud}
          bestScore={progress.bestScore}
          onPlayAgain={handleStart}
          onBackToTitle={handleBackToTitle}
          onOpenCollection={() => setIsCollectionOpen(true)}
        />
      )}

      {isCollectionOpen && (
        <FlavorCollectionModal
          unlockedIds={progress.unlockedFlavorIds}
          onClose={() => setIsCollectionOpen(false)}
        />
      )}
    </main>
  );
}
