/**
 * Hook para gestionar la biblioteca de música local
 * Encapsula la lógica de carga y gestión de tracks locales
 */

import { library, type Track, searchTracks as searchTracksGlobal, getTracksByArtist as getTracksByArtistGlobal, getTracksByAlbum as getTracksByAlbumGlobal } from '@/lib/state';
import { useEventBus, EVENTS } from './useEventBus.svelte';

export interface UseLibraryReturn {
  // Estado reactivo (usar $derived en componentes)
  tracks: Track[];
  isLoading: boolean;
  error: string | null;
  currentFolder: string;
  totalTracks: number;
  totalDuration: number;
  artists: string[];
  albums: string[];
  
  // Métodos
  loadLibrary: (folderPath?: string) => Promise<void>;
  reload: () => Promise<void>;
  clearLibrary: () => void;
  getTrackMetadata: (filePath: string) => Promise<Track | null>;
  searchTracks: (query: string) => Track[];
  getTracksByArtist: (artist: string) => Track[];
  getTracksByAlbum: (album: string) => Track[];
  cleanup: () => void;
}

export function useLibrary(): UseLibraryReturn {
  const bus = useEventBus();
  
  // Valores derivados del estado global (reactivos)
  const tracks = $derived(library.tracks);
  const isLoading = $derived(library.isLoading);
  const error = $derived(library.error);
  const currentFolder = $derived(library.currentFolder);
  const totalTracks = $derived(library.totalTracks);
  const totalDuration = $derived(library.totalDuration);
  const artists = $derived(library.artists);
  const albums = $derived(library.albums);

  /**
   * Carga la biblioteca de música
   */
  async function loadLibrary(folderPath?: string): Promise<void> {
    try {
      await library.loadLibrary(folderPath);
      bus.emit(EVENTS.LIBRARY_LOADED, { trackCount: library.tracks.length });
    } catch (err) {
      console.error('❌ Error en useLibrary.loadLibrary:', err);
      throw err;
    }
  }

  /**
   * Recarga la biblioteca actual
   */
  async function reload(): Promise<void> {
    try {
      await library.reload();
      bus.emit(EVENTS.LIBRARY_RELOADED, { trackCount: library.tracks.length });
    } catch (err) {
      console.error('❌ Error en useLibrary.reload:', err);
      throw err;
    }
  }

  /**
   * Limpia la biblioteca
   */
  function clearLibrary(): void {
    library.tracks = [];
    library.currentFolder = '';
    library.error = null;
    bus.emit(EVENTS.LIBRARY_CLEARED);
  }

  /**
   * Obtiene metadata de un track específico
   */
  async function getTrackMetadata(filePath: string): Promise<Track | null> {
    return await library.getTrackMetadata(filePath);
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

