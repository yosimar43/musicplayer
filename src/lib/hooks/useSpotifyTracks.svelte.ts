import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { libraryStore } from '@/lib/stores/library.store.svelte';
import { useSpotifyAuth } from './useSpotifyAuth.svelte';

// Simple debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

const { streamAllLikedSongs, getSavedTracks } = TauriCommands;

// Re-exportar tipo con campo adicional
export interface SpotifyTrackWithDownload extends SpotifyTrack {
  isDownloaded?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYNC HELPERS - Sincronizar tracks con biblioteca local
// ═══════════════════════════════════════════════════════════════════════════

let localTracksMapCache: Map<string, boolean> | null = null;
let lastLibraryHash = '';

function buildLocalTracksMap(): Map<string, boolean> {
  const currentHash = `${libraryStore.tracks.length}-${libraryStore.tracks[0]?.title || ''}`;

  if (currentHash === lastLibraryHash && localTracksMapCache) {
    return localTracksMapCache;
  }

  const map = new Map<string, boolean>();
  for (const track of libraryStore.tracks) {
    if (track.artist && track.title) {
      const key = `${track.artist.toLowerCase().trim()}-${track.title.toLowerCase().trim()}`;
      map.set(key, true);
    }
  }

  localTracksMapCache = map;
  lastLibraryHash = currentHash;
  return map;
}

function syncTracksWithLibrary(spotifyTracks: SpotifyTrack[]): SpotifyTrackWithDownload[] {
  if (spotifyTracks.length === 0) return [];
  if (libraryStore.tracks.length === 0) {
    return spotifyTracks.map(track => ({ ...track, isDownloaded: false }));
  }

  const localTracksMap = buildLocalTracksMap();
  return spotifyTracks.map(track => {
    const artist = track.artists[0]?.toLowerCase().trim() || '';
    const title = track.name.toLowerCase().trim();
    const key = `${artist}-${title}`;
    return { ...track, isDownloaded: localTracksMap.has(key) };
  });
}

export interface UseSpotifyTracksReturn {
  tracks: SpotifyTrackWithDownload[];
  allTracks?: SpotifyTrackWithDownload[];
  isLoading: boolean;
  loadingProgress: number;
  totalTracks: number;
  error: string | null;
  setupEventListeners: () => Promise<void>;
  loadTracks: (forceReload?: boolean) => Promise<void>;
  loadTracksPaginated: (limit?: number, offset?: number) => Promise<void>;
  resyncWithLibrary: () => void;
  cleanup: () => void;
  reset: () => void;
  search: (query: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON PATTERN - Evita múltiples instancias con estados desincronizados
// ═══════════════════════════════════════════════════════════════════════════

let _instance: UseSpotifyTracksReturn | null = null;

/**
 * Hook para manejar tracks de Spotify con streaming progresivo
 * 
 * ⚠️ SINGLETON: Todas las llamadas retornan la misma instancia
 */
export function useSpotifyTracks(): UseSpotifyTracksReturn {
  if (_instance) return _instance;

  let tracks = $state<SpotifyTrackWithDownload[]>([]);
  let isLoading = $state(false);
  let loadingProgress = $state(0);
  let totalTracks = $state(0);
  let error = $state<string | null>(null);
  let searchQuery = $state('');

  let unlistenBatch: (() => void) | undefined;
  let unlistenStart: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;

  // Depender de autenticación (singleton)
  const auth = useSpotifyAuth();

  // Filtrado derivado
  const filteredTracks = $derived(
    !searchQuery
      ? tracks
      : tracks.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artists.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  );

  // Búsqueda con debounce
  const search = debounce((query: string) => {
    searchQuery = query;
  }, 500);

  // Limpiar estado cuando se desautentique
  $effect(() => {
    if (!auth.isAuthenticated && tracks.length > 0) {
      console.log('🔄 Limpiando tracks de Spotify por desautenticación');
      reset();
    }
  });

  /**
   * 🔥 Configura los listeners de eventos para streaming progresivo
   */
  async function setupEventListeners(): Promise<void> {
    console.log('🎧 Configurando listeners de eventos Spotify...');

    // Listener para el inicio del streaming
    unlistenStart = await listen<{ total: number }>('spotify-tracks-start', (event) => {
      console.log(`🚀 Iniciando carga de ${event.payload.total} canciones`);
      untrack(() => {
        tracks = [];
        loadingProgress = 0;
        totalTracks = event.payload.total;
      });
    });

    // Listener para cada batch de canciones
    unlistenBatch = await listen<{
      tracks: SpotifyTrack[],
      progress: number,
      loaded: number,
      total: number
    }>('spotify-tracks-batch', (event) => {
      const { tracks: newTracks, progress, loaded, total } = event.payload;

      // Agregar nuevos tracks y sincronizar con biblioteca local
      const syncedNewTracks = syncTracksWithLibrary(newTracks);

      untrack(() => {
        // Reasignar array completo en lugar de mutar (mejor práctica Svelte 5)
        tracks = [...tracks, ...syncedNewTracks];
        loadingProgress = progress;
        totalTracks = total;
      });

      console.log(`📥 Batch recibido: +${newTracks.length} canciones (${loaded}/${total} - ${progress}%)`);
    });

    // Listener para la finalización
    unlistenComplete = await listen<{ total: number }>('spotify-tracks-complete', (event) => {
      console.log(`✅ ¡Carga completa! ${event.payload.total} canciones cargadas`);
      untrack(() => {
        isLoading = false;
        loadingProgress = 100;
        totalTracks = event.payload.total;
      });
    });

    // Listener para errores
    unlistenError = await listen<{ message: string }>('spotify-tracks-error', (event) => {
      console.error('❌ Error en streaming:', event.payload.message);
      untrack(() => {
        error = event.payload.message;
        isLoading = false;
        loadingProgress = 0;
      });
    });

    console.log('✅ Listeners de Spotify configurados');
  }

  /**
   * 🔥 Carga todas las canciones guardadas con streaming progresivo
   * IMPORTANTE: Los listeners se configuran automáticamente antes de iniciar el streaming
   */
  async function loadTracks(forceReload = false): Promise<void> {
    // ✅ NUEVA VALIDACIÓN: Verificar autenticación antes de cargar
    if (!auth.isAuthenticated) {
      error = 'Usuario no autenticado con Spotify';
      console.warn('⚠️ Intento de cargar tracks sin autenticación');
      return;
    }

    // Prevenir múltiples cargas simultáneas
    if (isLoading) {
      console.warn('⚠️ Ya hay una carga en progreso');
      return;
    }

    // Si ya hay tracks cargados y no es recarga forzada, evitar recarga
    if (tracks.length > 0 && !forceReload) {
      console.log(`✅ Ya hay ${tracks.length} tracks cargados`);
      return;
    }

    isLoading = true;
    error = null;

    if (forceReload) {
      untrack(() => {
        tracks = [];
        loadingProgress = 0;
        totalTracks = 0;
      });
    }

    try {
      // Asegurar que los listeners estén configurados ANTES de iniciar el streaming
      if (!unlistenBatch) {
        await setupEventListeners();
      }

      // 🔥 Iniciar streaming progresivo
      await streamAllLikedSongs();

    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load Spotify tracks';
      console.error('❌ Spotify tracks error:', err);
      untrack(() => {
        isLoading = false;
        loadingProgress = 0;
      });
    }
  }

  /**
   * Carga paginada tradicional (para pocas canciones)
   * No requiere listeners de eventos ya que es una llamada directa
   */
  async function loadTracksPaginated(limit?: number, offset?: number) {
    isLoading = true;
    error = null;
    try {
      const savedTracks = await getSavedTracks(limit, offset);
      untrack(() => {
        // Reasignar array completo en lugar de mutar (mejor práctica Svelte 5)
        tracks = [...tracks, ...savedTracks];
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load tracks';
      console.error('❌ Error cargando tracks paginados:', err);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Fuerza re-sincronización con biblioteca local
   * Útil cuando la biblioteca local cambia
   */
  function resyncWithLibrary(): void {
    console.log('🔄 Re-sincronizando con biblioteca local...');
    tracks = syncTracksWithLibrary(tracks);

    const downloadedCount = tracks.filter(t => t.isDownloaded).length;
    console.log(`✅ ${downloadedCount} de ${tracks.length} canciones ya están descargadas`);
  }

  /**
   * Limpia los listeners de eventos
   * ✅ OPTIMIZACIÓN: Mejor memory leak prevention
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de Spotify...');

    // Cleanup de event listeners
    unlistenStart?.();
    unlistenBatch?.();
    unlistenComplete?.();
    unlistenError?.();

    // Nullificar referencias para ayudar al GC
    unlistenStart = undefined;
    unlistenBatch = undefined;
    unlistenComplete = undefined;
    unlistenError = undefined;

    console.log('✅ useSpotifyTracks limpiado');
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    untrack(() => {
      tracks = [];
      loadingProgress = 0;
      totalTracks = 0;
      error = null;
      isLoading = false;
    });
  }

  _instance = {
    // Estado
    get tracks() { return filteredTracks as SpotifyTrackWithDownload[]; },
    get allTracks() { return tracks as SpotifyTrackWithDownload[]; },
    get isLoading() { return isLoading; },
    get loadingProgress() { return loadingProgress; },
    get totalTracks() { return totalTracks; },
    get error() { return error; },
    set error(value: string | null) { error = value; },

    // Acciones
    setupEventListeners,
    loadTracks,
    loadTracksPaginated,
    resyncWithLibrary,
    cleanup,
    reset,
    search
  };

  return _instance;
}

/**
 * Reset para testing - NO usar en producción
 */
export function resetSpotifyTracksInstance() {
  _instance = null;
}

// Re-exportar tipo para compatibilidad
export type { SpotifyTrack } from '@/lib/utils/tauriCommands';
