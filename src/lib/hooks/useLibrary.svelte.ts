/**
 * Hook para gestionar la biblioteca de música local
 * Encapsula la lógica de carga y gestión de tracks locales
 */

import { libraryStore, type Track, searchTracks as searchTracksGlobal, getTracksByArtist as getTracksByArtistGlobal, getTracksByAlbum as getTracksByAlbumGlobal, clearLibrary as clearLibraryGlobal } from '@/lib/stores/library.store.svelte';
import { EnrichmentService } from '@/lib/services/enrichment.service';
import { musicDataStore } from '@/lib/stores/musicData.store.svelte';

export interface UseLibraryReturn {
  // Estado reactivo (usar $derived en componentes)
  tracks: Track[];
  isLoading: boolean;
  isEnriching: boolean;
  enrichmentProgress: { current: number; total: number };
  error: string | null;
  currentFolder: string;
  totalTracks: number;
  totalDuration: number;
  artists: string[];
  albums: string[];

  // Métodos
  loadLibrary: (folderPath?: string, enrichWithLastFm?: boolean) => Promise<void>;
  reload: (enrichWithLastFm?: boolean) => Promise<void>;
  clearLibrary: () => void;
  getTrackMetadata: (filePath: string) => Promise<Track | null>;
  searchTracks: (query: string) => Track[];
  getTracksByArtist: (artist: string) => Track[];
  getTracksByAlbum: (album: string) => Track[];
  cleanup: () => void;
}

export function useLibrary(): UseLibraryReturn {

  // Valores derivados del estado global (reactivos)
  const tracks = $derived(libraryStore.tracks);
  const isLoading = $derived(libraryStore.isLoading);
  const isEnriching = $derived(EnrichmentService.isEnriching());
  const enrichmentProgress = $derived(EnrichmentService.getProgress());
  const error = $derived(libraryStore.error);
  const currentFolder = $derived(libraryStore.currentFolder);
  const totalTracks = $derived(libraryStore.totalTracks);
  const totalDuration = $derived(libraryStore.totalDuration);
  const artists = $derived(libraryStore.artists);
  const albums = $derived(libraryStore.albums);

  /**
   * Precarga portadas de álbumes para mejorar rendimiento
   * Se ejecuta después de cargar la biblioteca
   */
  async function preloadAlbumArt(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    console.log(`🎨 Precargando ${tracks.length} portadas de álbum...`);

    try {
      // Limitar a 50 tracks para no sobrecargar (puedes ajustar)
      const tracksToPreload = tracks.slice(0, 50);

      // Procesar en lotes para no bloquear la UI
      const batchSize = 5;
      for (let i = 0; i < tracksToPreload.length; i += batchSize) {
        const batch = tracksToPreload.slice(i, i + batchSize);

        // Procesar lote en paralelo
        await Promise.allSettled(
          batch.map(async (track) => {
            if (!track.artist || !track.title) return;

            try {
              // Intentar obtener del cache primero
              const trackData = await musicDataStore.getTrack(track.artist, track.title);
              let hasImage = !!trackData?.image;

              if (!hasImage && track.album) {
                // Si no hay imagen del track, intentar con el álbum
                const albumData = await musicDataStore.getAlbum(track.artist, track.album);
                hasImage = !!albumData?.image;
              }

              // Si encontramos imagen, ya está cacheada para uso futuro
              if (hasImage) {
                console.log(`✅ Portada cacheada: ${track.artist} - ${track.title}`);
              }
            } catch (error) {
              // Silenciar errores de precarga (no críticos)
              console.warn(`⚠️ [Background Error] Error precargando portada: ${track.artist} - ${track.title}`, error);
            }
          })
        );

        // Pequeña pausa entre lotes para no sobrecargar la API
        if (i + batchSize < tracksToPreload.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`🎨 Precarga de portadas completada`);
    } catch (error) {
      console.error('❌ [Background Error] Fallo crítico en precarga de portadas:', error);
    }
  }

  /**
   * Carga la biblioteca de música
   */
  async function loadLibrary(folderPath?: string, enrichWithLastFm = true): Promise<void> {
    try {
      await libraryStore.loadLibrary(folderPath, enrichWithLastFm);

      // ✅ NUEVA CONEXIÓN: Precargar portadas después de cargar
      if (enrichWithLastFm && tracks.length > 0) {
        // Ejecutar en background (no bloquear la carga principal)
        setTimeout(() => preloadAlbumArt(tracks), 100);
      }
    } catch (err) {
      console.error('❌ Error en useLibrary.loadLibrary:', err);
      throw err;
    }
  }

  /**
   * Recarga la biblioteca actual
   */
  async function reload(enrichWithLastFm = true): Promise<void> {
    try {
      await libraryStore.reload(enrichWithLastFm);

      // ✅ NUEVA CONEXIÓN: Precargar portadas después de recargar
      if (enrichWithLastFm && tracks.length > 0) {
        // Ejecutar en background (no bloquear la recarga principal)
        setTimeout(() => preloadAlbumArt(tracks), 100);
      }
    } catch (err) {
      console.error('❌ Error en useLibrary.reload:', err);
      throw err;
    }
  }

  /**
   * Limpia la biblioteca
   */
  function clearLibrary(): void {
    clearLibraryGlobal();
  }

  /**
   * Obtiene metadata específica
   */
  async function getTrackMetadata(filePath: string): Promise<Track | null> {
    return await libraryStore.getTrackMetadata(filePath);
  }

  /**
   * Busca tracks por query (usa función del estado global)
   */
  function searchTracks(query: string): Track[] {
    return searchTracksGlobal(query);
  }

  /**
   * Filtra tracks por artista (usa función del estado global)
   */
  function getTracksByArtist(artist: string): Track[] {
    return getTracksByArtistGlobal(artist);
  }

  /**
   * Filtra tracks por álbum (usa función del estado global)
   */
  function getTracksByAlbum(album: string): Track[] {
    return getTracksByAlbumGlobal(album);
  }

  /**
   * Cleanup (si es necesario en el futuro)
   */
  function cleanup(): void {
    // Por ahora no hay listeners que limpiar
    // Pero se mantiene la interfaz para consistencia
  }

  return {
    // Estado reactivo
    get tracks() { return tracks; },
    get isLoading() { return isLoading; },
    get isEnriching() { return isEnriching; },
    get enrichmentProgress() { return enrichmentProgress; },
    get error() { return error; },
    get currentFolder() { return currentFolder; },
    get totalTracks() { return totalTracks; },
    get totalDuration() { return totalDuration; },
    get artists() { return artists; },
    get albums() { return albums; },

    // Métodos
    loadLibrary,
    reload,
    clearLibrary,
    getTrackMetadata,
    searchTracks,
    getTracksByArtist,
    getTracksByAlbum,
    cleanup
  };
}

