import { playlistStore } from '@/lib/stores/playlist.store.svelte';
import { TauriCommands, type SpotifyPlaylist } from '@/lib/utils/tauriCommands';
import { useSpotifyAuth } from './useSpotifyAuth.svelte';

const { getPlaylists } = TauriCommands;

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
 * Orquesta playlistStore (estado puro) + TauriCommands (I/O)
 * 
 * No necesita singleton porque:
 * - No tiene event listeners externos (addEventListener, Tauri listen)
 * - El $effect solo sincroniza con el store (idempotente)
 * - El estado vive en playlistStore (compartido)
 */
export function useSpotifyPlaylists(): UseSpotifyPlaylistsReturn {
  // Depender de autenticación
  const auth = useSpotifyAuth();

  // Limpiar estado cuando se desautentique
  $effect(() => {
    if (!auth.isAuthenticated && playlistStore.hasPlaylists) {
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
   * El I/O se maneja aquí, no en el store
   */
  async function loadPlaylists(limit?: number, forceReload = false): Promise<void> {
    // Verificar autenticación antes de cargar
    if (!auth.isAuthenticated) {
      console.warn('⚠️ Intento de cargar playlists sin autenticación');
      throw new Error('Usuario no autenticado con Spotify');
    }

    // Si ya hay playlists cargadas y no es recarga forzada, evitar recarga
    if (playlistStore.playlists.length > 0 && !forceReload) {
      console.log(`✅ Ya hay ${playlistStore.playlists.length} playlists cargadas`);
      return;
    }

    playlistStore.setLoading(true);
    playlistStore.setError(null);

    try {
      console.log('📋 Cargando playlists...');
      const data = await getPlaylists(limit);

      playlistStore.setPlaylists(data);
      console.log(`✅ ${data.length} playlists cargadas`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load playlists';
      playlistStore.setError(errorMsg);
      console.error('❌ Error loading playlists:', err);
      throw err;
    } finally {
      playlistStore.setLoading(false);
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
