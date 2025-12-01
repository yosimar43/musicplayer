// src/lib/hooks/usePlayerUI.svelte.ts
import { playerStore } from '@/lib/stores/player.store.svelte';
import { trackMetadata } from '@/lib/utils/trackMetadata';
import { createAlbumArtLoader } from './useAlbumArt.svelte';

export function usePlayerUI() {
  /* ---------- estado local (proxies) ---------- */
  let isLiked     = $state(false);
  let isAnimating = $state(false);
  let albumArtUrl = $state<string | null>(null);

  const currentTrackId = $derived(playerStore.current?.path ?? '');

  // ✅ NUEVA CONEXIÓN: Usar useAlbumArt para carga inteligente de portadas
  const albumArtLoader = createAlbumArtLoader(
    playerStore.current?.artist ?? null,
    playerStore.current?.title ?? null,
    playerStore.current?.album ?? null
  );

  /* ---------- efectos ---------- */
  $effect(() => {
    if (!currentTrackId) return;
    isAnimating = true;
    const t = setTimeout(() => (isAnimating = false), 1000);
    return () => clearTimeout(t);
  });

  // ✅ ACTUALIZADO: Usar useAlbumArt en lugar de trackMetadata directo
  $effect(() => {
    if (!playerStore.current) {
      albumArtUrl = null;
      return;
    }

    // Usar la portada del loader inteligente (con cache y fallback)
    albumArtUrl = albumArtLoader.url;
  });

  // ✅ MANTENER: Sincronizar con trackMetadata para compatibilidad
  $effect(() => {
    if (playerStore.current?.path && albumArtUrl) {
      trackMetadata.setAlbumImage(playerStore.current, albumArtUrl);
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
    playerStore.setProgress(pct);
  };

  const toggleLike = () => (isLiked = !isLiked);

  /* ---------- retorno SIN DESTRUCTURAR ---------- */
  return {
    // proxies directos (reactivos)
    get isLiked()     { return isLiked; },
    get isAnimating() { return isAnimating; },
    get albumArtUrl() { return albumArtUrl; },
    get isAlbumArtLoading() { return albumArtLoader.isLoading; },
    get hasAlbumArtError() { return albumArtLoader.hasError; },

    // funciones
    toggleLike,
    formatTime,
    handleProgressClick,
  };
}
