import { player, setVolume } from '@/lib/state/player.svelte';
import { createAlbumArtLoader } from '@/lib/hooks';
import { trackMetadata } from '@/lib/utils/trackMetadata';

// Tipos internos del hook
export interface PlayerUITimers {
  animation?: ReturnType<typeof setTimeout>;
}

export interface PlayerUIValues {
  isLiked: boolean;
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
  let isAnimating = $state(false);
  let animationTracker = $state({ path: '', count: 0 });

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

  // Reactive signal for album art URL
  let albumArtUrl = $state<string | null>(null);

  $effect(() => {
    if (player.current?.path) {
      const stored = trackMetadata.getAlbumImage(player.current);
      if (stored) {
        albumArtUrl = stored;
        return;
      }
    }
    
    albumArtUrl = albumArt.url;
  });

  // Store album art when loaded
  $effect(() => {
    if (player.current?.path && albumArt.url) {
      trackMetadata.setAlbumImage(player.current, albumArt.url);
    }
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
    isAnimating,
    albumArtUrl,
    toggleLike,
    formatTime,
    handleProgressClick,
  };
}
