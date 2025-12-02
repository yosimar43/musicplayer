// src/lib/hooks/usePlayerUI.svelte.ts
import { playerStore } from '@/lib/stores/player.store.svelte';
import { trackMetadata } from '@/lib/utils/trackMetadata';
import { musicDataStore } from '@/lib/stores/musicData.store.svelte';

export function usePlayerUI() {
  /* ---------- estado local ---------- */
  let isLiked     = $state(false);
  let isAnimating = $state(false);
  let albumArtUrl = $state<string | null>(null);
  let isAlbumArtLoading = $state(false);
  let hasAlbumArtError = $state(false);

  const currentTrackId = $derived(playerStore.current?.path ?? '');

  /* ---------- efectos ---------- */
  $effect(() => {
    if (!currentTrackId) return;
    isAnimating = true;
    const t = setTimeout(() => (isAnimating = false), 1000);
    return () => clearTimeout(t);
  });

  // ✅ CORREGIDO: Cargar album art reactivamente cuando cambia el track
  $effect(() => {
    const track = playerStore.current;
    if (!track) {
      albumArtUrl = null;
      isAlbumArtLoading = false;
      hasAlbumArtError = false;
      return;
    }

    const artist = track.artist ?? null;
    const title = track.title ?? null;
    const album = track.album ?? null;

    // Si el track ya tiene albumArt, usarlo directamente
    if (track.albumArt) {
      albumArtUrl = track.albumArt;
      isAlbumArtLoading = false;
      return;
    }

    if (!artist || !title) {
      isAlbumArtLoading = false;
      return;
    }

    // Cargar desde Last.fm
    isAlbumArtLoading = true;
    hasAlbumArtError = false;
    const trackPath = track.path; // Capturar para verificar después de async

    loadAlbumArtAsync(artist, title, album, trackPath);
  });

  async function loadAlbumArtAsync(
    artist: string, 
    title: string, 
    album: string | null,
    originalTrackPath: string
  ) {
    try {
      // Verificar que aún es el mismo track antes de cada paso
      const checkSameTrack = () => playerStore.current?.path === originalTrackPath;

      const trackData = await musicDataStore.getTrack(artist, title);
      if (!checkSameTrack()) return;
      
      if (trackData?.image) {
        albumArtUrl = trackData.image;
        isAlbumArtLoading = false;
        return;
      }

      if (album) {
        const albumData = await musicDataStore.getAlbum(artist, album);
        if (!checkSameTrack()) return;
        
        if (albumData?.image) {
          albumArtUrl = albumData.image;
          isAlbumArtLoading = false;
          return;
        }
      }

      const artistData = await musicDataStore.getArtist(artist);
      if (!checkSameTrack()) return;
      
      if (artistData?.image) {
        albumArtUrl = artistData.image;
      }
      
      isAlbumArtLoading = false;
    } catch {
      if (playerStore.current?.path === originalTrackPath) {
        hasAlbumArtError = true;
        isAlbumArtLoading = false;
      }
    }
  }

  // Sincronizar con trackMetadata para compatibilidad
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
    get isAlbumArtLoading() { return isAlbumArtLoading; },
    get hasAlbumArtError() { return hasAlbumArtError; },

    // funciones
    toggleLike,
    formatTime,
    handleProgressClick,
  };
}
