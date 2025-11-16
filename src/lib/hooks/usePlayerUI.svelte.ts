import { player, setVolume } from '@/lib/state/player.svelte';
import { createAlbumArtLoader } from '@/lib/hooks';
import { trackMetadata } from '@/lib/utils/trackMetadata';

// Tipos internos del hook
export interface PlayerUITimers {
  animation?: ReturnType<typeof setTimeout>;
}

export interface PlayerUIValues {
  isLiked: boolean;
  volumeArray: number[];
  isAnimating: boolean;
  albumArtUrl: string | null;
}

export interface PlayerUIMethods {
  toggleLike: () => void;
  formatTime: (seconds: number) => string;
  handleProgressClick: (e: MouseEvent & { currentTarget: HTMLElement }) => void;
}

export function usePlayerUI(): PlayerUIValues & PlayerUIMethods {
  // Estado reactivo
  let isLiked = $state(false);
  let volumeArray = $state([player.volume]);
  let isAnimating = $state(false);
  let animationTracker = $state({ path: '', count: 0 });

  // Sincroniza cambios desde player.volume hacia volumeArray
  $effect(() => {
    if (volumeArray[0] !== player.volume) {
      volumeArray = [player.volume];
    }
  });
  // Sincroniza cambios desde volumeArray hacia player.volume
  $effect(() => {
    const [v] = volumeArray;
    if (v !== player.volume) setVolume(v);
  });

  const currentTrackId = $derived(player.current?.path || '');

  $effect(() => {
    if (currentTrackId && currentTrackId !== animationTracker.path) {
      animationTracker = { path: currentTrackId, count: animationTracker.count + 1 };
      isAnimating = true;
      const t = setTimeout(() => { isAnimating = false; }, 1000);
      return () => clearTimeout(t);
    }
  });

  const albumArt = $derived.by(() =>
    createAlbumArtLoader(
      player.current?.artist ?? null,
      player.current?.title ?? null,
      player.current?.album ?? null
    )
  );

  const albumArtUrl = $derived.by(() => {
    if (player.current?.path) {
      const stored = trackMetadata.getAlbumImage(player.current.path);
      if (stored) return stored;
    }
    return albumArt.url;
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (
    e: MouseEvent & { currentTarget: HTMLElement }
  ): void => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    if (typeof player.seek === 'function') {
      player.seek(pct);
    }
  };

  const toggleLike = (): void => {
    isLiked = !isLiked;
  };

  return {
    isLiked,
    volumeArray,
    isAnimating,
    albumArtUrl,
    toggleLike,
    formatTime,
    handleProgressClick,
  };
}
