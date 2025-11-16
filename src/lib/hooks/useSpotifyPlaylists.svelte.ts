import { TauriCommands, type SpotifyPlaylist } from '@/lib/utils/tauriCommands';

const { getPlaylists } = TauriCommands;

// Re-exportar tipo para compatibilidad
export type { SpotifyPlaylist };

/**
 * Hook para manejar playlists de Spotify
 */
export function useSpotifyPlaylists() {
  let playlists = $state<SpotifyPlaylist[]>([]);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  /**
   * Carga las playlists del usuario
   * @param limit - Número máximo de playlists a cargar (opcional, por defecto 50)
   * @param forceReload - Si es true, fuerza recarga incluso si ya hay playlists cargadas
   */
  async function loadPlaylists(limit?: number, forceReload = false): Promise<void> {
    // Si ya hay playlists cargadas y no es recarga forzada, evitar recarga
    if (playlists.length > 0 && !forceReload) {
      console.log(`✅ Ya hay ${playlists.length} playlists cargadas`);
      return;
    }

    isLoading = true;
    error = null;

    try {
      console.log('📋 Cargando playlists...');
      playlists = await getPlaylists(limit);
      console.log(`✅ ${playlists.length} playlists cargadas`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load playlists';
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
