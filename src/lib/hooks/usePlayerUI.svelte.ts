// src/lib/hooks/usePlayerUI.svelte.ts
import { playerStore } from '@/lib/stores/player.store';
import { createAlbumArtLoader } from '@/lib/hooks';
import { trackMetadata } from '@/lib/utils/trackMetadata';

export function usePlayerUI() {
  /* ---------- estado local (proxies) ---------- */
  let isLiked     = $state(false);
  let isAnimating = $state(false);
  let albumArtUrl = $state<string | null>(null);

  const currentTrackId = $derived(playerStore.current?.path ?? '');

  /* ---------- efectos ---------- */
  $effect(() => {
    if (!currentTrackId) return;
    isAnimating = true;
    const t = setTimeout(() => (isAnimating = false), 1000);
    return () => clearTimeout(t);
  });

  const albumArt = $derived(
    createAlbumArtLoader(
      playerStore.current?.artist ?? null,
      playerStore.current?.title  ?? null,
      playerStore.current?.album  ?? null
    )
  );

  $effect(() => {
    if (!playerStore.current) return;
    albumArtUrl = trackMetadata.getAlbumImage(playerStore.current) ?? albumArt.url ?? null;
  });

  $effect(() => {
    if (playerStore.current?.path && albumArt.url) {
      trackMetadata.setAlbumImage(playerStore.current, albumArt.url);
    }
  });

  /* ---------- utilidades ---------- */
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProgressClick = (
    e: MouseEvent & { currentTarget: HTMLElement }
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = ((e.clientX - rect.left) / rect.width) * 100;
    playerStore.seek?.(pct);
  };

  const toggleLike = () => (isLiked = !isLiked);

  /* ---------- retorno SIN DESTRUCTURAR ---------- */
  return {
    // proxies directos (reactivos)
    get isLiked()     { return isLiked; },
    get isAnimating() { return isAnimating; },
    get albumArtUrl() { return albumArtUrl; },

    // funciones
    toggleLike,
    formatTime,
    handleProgressClick,
  };
}