import { invoke } from '@tauri-apps/api/core';
import { getErrorMessage } from '@/lib/utils/common';

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  tracks_total: number;
  images: string[];
  public: boolean | null;
}

/**
 * Hook para manejar playlists de Spotify
 */
export function useSpotifyPlaylists() {
  let playlists = $state<SpotifyPlaylist[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  /**
   * Carga las playlists del usuario
   */
  async function loadPlaylists(limit = 50, forceReload = false): Promise<void> {
    // Si ya hay playlists cargadas y no es recarga forzada, evitar recarga
    if (playlists.length > 0 && !forceReload) {
      console.log(`✅ Ya hay ${playlists.length} playlists cargadas`);
      return;
    }

    isLoading = true;
    error = null;

    try {
      console.log('📋 Cargando playlists...');
      playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', { limit });
      console.log(`✅ ${playlists.length} playlists cargadas`);
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error loading playlists:', err);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    playlists = [];
    error = null;
    isLoading = false;
  }

  return {
    // Estado
    get playlists() { return playlists; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    loadPlaylists,
    reset
  };
}
