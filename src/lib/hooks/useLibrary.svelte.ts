/**
 * Hook para gestionar la biblioteca de música local
 * Encapsula la lógica de carga y gestión de tracks locales
 */

import { libraryStore, type Track, searchTracks as searchTracksGlobal, getTracksByArtist as getTracksByArtistGlobal, getTracksByAlbum as getTracksByAlbumGlobal, clearLibrary as clearLibraryGlobal } from '@/lib/stores/library.store';
import { enrichmentStore } from '@/lib/stores/enrichment.store';

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
  const isEnriching = $derived(enrichmentStore.isEnriching);
  const enrichmentProgress = $derived(enrichmentStore.progress);
  const error = $derived(libraryStore.error);
  const currentFolder = $derived(libraryStore.currentFolder);
  const totalTracks = $derived(libraryStore.totalTracks);
  const totalDuration = $derived(libraryStore.totalDuration);
  const artists = $derived(libraryStore.artists);
  const albums = $derived(libraryStore.albums);

  /**
   * Carga la biblioteca de música
   */
  async function loadLibrary(folderPath?: string, enrichWithLastFm = true): Promise<void> {
    try {
      await libraryStore.loadLibrary(folderPath, enrichWithLastFm);
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

