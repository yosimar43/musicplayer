// src/lib/hooks/usePlayerUI.svelte.ts
import { player } from '@/lib/state/player.svelte';
import { createAlbumArtLoader } from '@/lib/hooks';
import { trackMetadata } from '@/lib/utils/trackMetadata';

export function usePlayerUI() {
  /* ---------- estado local (proxies) ---------- */
  let isLiked     = $state(false);
  let isAnimating = $state(false);
  let albumArtUrl = $state<string | null>(null);

  const currentTrackId = $derived(player.current?.path ?? '');

  /* ---------- efectos ---------- */
  $effect(() => {
    if (!currentTrackId) return;
    isAnimating = true;
    const t = setTimeout(() => (isAnimating = false), 1000);
    return () => clearTimeout(t);
  });

  const albumArt = $derived(
    createAlbumArtLoader(
      player.current?.artist ?? null,
      player.current?.title  ?? null,
      player.current?.album  ?? null
    )
  );

  $effect(() => {
    if (!player.current) return;
    albumArtUrl = trackMetadata.getAlbumImage(player.current) ?? albumArt.url ?? null;
  });

  $effect(() => {
    if (player.current?.path && albumArt.url) {
      trackMetadata.setAlbumImage(player.current, albumArt.url);
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
    player.seek?.(pct);
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