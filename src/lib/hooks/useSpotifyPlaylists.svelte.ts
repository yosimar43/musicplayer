import { playlistStore } from '@/lib/stores/playlist.store.svelte';
import type { SpotifyPlaylist } from '@/lib/utils/tauriCommands';
import { useSpotifyAuth } from './useSpotifyAuth.svelte'; // ✅ NUEVA CONEXIÓN

// Re-exportar tipo para compatibilidad
export type { SpotifyPlaylist };

export interface UseSpotifyPlaylistsReturn {
  playlists: SpotifyPlaylist[];
  isLoading: boolean;
  error: string | null;
  totalPlaylists: number;
  hasPlaylists: boolean;
  loadPlaylists: (limit?: number, forceReload?: boolean) => Promise<void>;
  searchPlaylists: (query: string) => SpotifyPlaylist[];
  getPlaylistById: (id: string) => SpotifyPlaylist | undefined;
  reset: () => void;
}

/**
 * Hook para manejar playlists de Spotify
 * Ahora consume el playlistStore global para estado compartido
 */
export function useSpotifyPlaylists(): UseSpotifyPlaylistsReturn {
  // ✅ NUEVA CONEXIÓN: Depender de autenticación
  const auth = useSpotifyAuth();

  // ✅ NUEVA CONEXIÓN: Limpiar estado cuando se desautentique
  $effect(() => {
    if (!auth.isAuthenticated && hasPlaylists) {
      console.log('🔄 Limpiando playlists de Spotify por desautenticación');
      reset();
    }
  });
  const isLoading = $derived(playlistStore.isLoading);
  const error = $derived(playlistStore.error);
  const totalPlaylists = $derived(playlistStore.totalPlaylists);
  const hasPlaylists = $derived(playlistStore.hasPlaylists);

  /**
   * Carga las playlists del usuario
   * Delega al store global
   */
  async function loadPlaylists(limit?: number, forceReload = false): Promise<void> {
    // ✅ NUEVA VALIDACIÓN: Verificar autenticación antes de cargar
    if (!auth.isAuthenticated) {
      console.warn('⚠️ Intento de cargar playlists sin autenticación');
      throw new Error('Usuario no autenticado con Spotify');
    }

    try {
      await playlistStore.loadPlaylists(limit, forceReload);
    } catch (err) {
      console.error('❌ Error en useSpotifyPlaylists.loadPlaylists:', err);
      throw err;
    }
  }

  /**
   * Busca playlists por nombre
   */
  function searchPlaylists(query: string): SpotifyPlaylist[] {
    return playlistStore.searchPlaylists(query);
  }

  /**
   * Obtiene una playlist por ID
   */
  function getPlaylistById(id: string): SpotifyPlaylist | undefined {
    return playlistStore.getPlaylistById(id);
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    playlistStore.reset();
  }

  return {
    // Estado reactivo
    get playlists() { return playlistStore.playlists; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get totalPlaylists() { return totalPlaylists; },
    get hasPlaylists() { return hasPlaylists; },

    // Métodos
    loadPlaylists,
    searchPlaylists,
    getPlaylistById,
    reset
  };
}
