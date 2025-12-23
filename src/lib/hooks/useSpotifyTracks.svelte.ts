import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { libraryStore } from '@/lib/stores/library.store.svelte';
import { spotifyTracksStore, type SpotifyTrackWithState } from '@/lib/stores';
import { useSpotifyAuth } from './useSpotifyAuth.svelte';
import { useDownload } from './useDownload.svelte';

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
  downloadState?: 'idle' | 'downloading' | 'completed' | 'error';
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
    return spotifyTracks.map(track => ({ ...track, isDownloaded: false, downloadState: 'idle' as const }));
  }

  const localTracksMap = buildLocalTracksMap();
  return spotifyTracks.map(track => {
    const artist = track.artists[0]?.toLowerCase().trim() || '';
    const title = track.name.toLowerCase().trim();
    const key = `${artist}-${title}`;
    return { ...track, isDownloaded: localTracksMap.has(key), downloadState: 'idle' as const };
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
  downloadTrack: (trackId: string) => Promise<void>;
  downloadAllTracks: () => Promise<void>;
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

  let loadingProgress = $state(0);
  let totalTracks = $state(0);
  let searchQuery = $state('');

  let unlistenBatch: (() => void) | undefined;
  let unlistenStart: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;
  let unlistenDownloadProgress: (() => void) | undefined;
  let unlistenDownloadFinished: (() => void) | undefined;

  // Depender de autenticación (singleton)
  const auth = useSpotifyAuth();
  // Depender del módulo de descarga (singleton)
  const download = useDownload();

  // Filtrado derivado usando el store global
  const filteredTracks = $derived(
    !searchQuery
      ? spotifyTracksStore.tracks
      : spotifyTracksStore.tracks.filter(t =>
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
    if (!auth.isAuthenticated && spotifyTracksStore.tracks.length > 0) {
      console.log('🔄 Limpiando tracks de Spotify por desautenticación');
      reset();
    }
  });

  /**
   * 🔥 Configura los listeners de eventos para streaming progresivo
   */
  async function setupEventListeners(): Promise<void> {
    console.log('🎧 Configurando listeners de eventos Spotify y descarga...');

    // 🔥 Asegurar que los listeners de descarga estén configurados
    await download.setupEventListeners();

    // Listener para el inicio del streaming
    unlistenStart = await listen<{ total: number }>('spotify-tracks-start', (event) => {
      console.log(`🚀 Iniciando carga de ${event.payload.total} canciones`);
      untrack(() => {
        spotifyTracksStore.setTracks([]);
        loadingProgress = 0;
        totalTracks = event.payload.total;
        spotifyTracksStore.setLoading(true);
        spotifyTracksStore.setError(null);
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
        const currentTracks = spotifyTracksStore.tracks;
        spotifyTracksStore.setTracks([...currentTracks, ...syncedNewTracks]);
        loadingProgress = progress;
        totalTracks = total;
      });

      console.log(`📥 Batch recibido: +${newTracks.length} canciones (${loaded}/${total} - ${progress}%)`);
    });

    // Listener para la finalización
    unlistenComplete = await listen<{ total: number }>('spotify-tracks-complete', (event) => {
      console.log(`✅ ¡Carga completa! ${event.payload.total} canciones cargadas`);
      untrack(() => {
        spotifyTracksStore.setLoading(false);
        loadingProgress = 100;
        totalTracks = event.payload.total;
      });
    });

    // Listener para errores
    unlistenError = await listen<{ message: string }>('spotify-tracks-error', (event) => {
      console.error('❌ Error en streaming:', event.payload.message);
      untrack(() => {
        spotifyTracksStore.setError(event.payload.message);
        spotifyTracksStore.setLoading(false);
        loadingProgress = 0;
      });
    });

    // 🔥 NUEVOS LISTENERS PARA DESCARGAS
    // Listener para progreso de descarga
    unlistenDownloadProgress = await listen<{
      song: string;
      index: number;
      total: number;
      status: string;
      url: string;
    }>('download-progress', (event) => {
      const { song, status, url } = event.payload;
      console.log(`📥 Progreso descarga: ${song} - ${status}`);

      // Encontrar track por URL y actualizar estado
      const track = spotifyTracksStore.tracks.find(t => t.externalUrl === url);
      if (track) {
        if (status.includes('✅')) {
          spotifyTracksStore.updateDownloadState(track.id!, 'completed');
        } else if (status.includes('❌') || status.includes('Error')) {
          spotifyTracksStore.updateDownloadState(track.id!, 'error');
        } else {
          spotifyTracksStore.updateDownloadState(track.id!, 'downloading');
        }
      }
    });

    // Listener para finalización de descarga
    unlistenDownloadFinished = await listen<{
      message: string;
      total_downloaded: number;
      total_failed: number;
    }>('download-finished', (event) => {
      const { total_downloaded, total_failed, message } = event.payload;
      console.log(`✅ Descarga finalizada: ${message} (${total_downloaded} exitosas, ${total_failed} fallidas)`);

      // Actualizar estados de todos los tracks descargados
      spotifyTracksStore.tracks.forEach(track => {
        if (track.downloadState === 'downloading') {
          // Si terminó la descarga y aún está en downloading, marcar como error
          spotifyTracksStore.updateDownloadState(track.id!, 'error');
        }
      });
    });

    console.log('✅ Listeners de Spotify y descarga configurados');
  }

  /**
   * 🔥 Carga todas las canciones guardadas con streaming progresivo
   * IMPORTANTE: Los listeners se configuran automáticamente antes de iniciar el streaming
   */
  async function loadTracks(forceReload = false): Promise<void> {
    // ✅ NUEVA VALIDACIÓN: Verificar autenticación antes de cargar
    if (!auth.isAuthenticated) {
      spotifyTracksStore.setError('Usuario no autenticado con Spotify');
      console.warn('⚠️ Intento de cargar tracks sin autenticación');
      return;
    }

    // Prevenir múltiples cargas simultáneas
    if (spotifyTracksStore.isLoading) {
      console.warn('⚠️ Ya hay una carga en progreso');
      return;
    }

    // Si ya hay tracks cargados y no es recarga forzada, evitar recarga
    if (spotifyTracksStore.tracks.length > 0 && !forceReload) {
      console.log(`✅ Ya hay ${spotifyTracksStore.tracks.length} tracks cargados`);
      return;
    }

    spotifyTracksStore.setLoading(true);
    spotifyTracksStore.setError(null);

    if (forceReload) {
      untrack(() => {
        spotifyTracksStore.setTracks([]);
        loadingProgress = 0;
        totalTracks = 0;
      });
    }

    try {
      // Asegurar que los listeners estén configurados ANTES de iniciar el streaming
      if (!unlistenBatch) {
        await setupEventListeners();
      }

      // 🔥 Iniciar streaming progresivo - NO BLOQUEAR UI
      // Remover await para que sea fire-and-forget y no bloquee la UI
      streamAllLikedSongs().catch(err => {
        console.error('❌ Error en streaming de Spotify:', err);
        untrack(() => {
          spotifyTracksStore.setError('Error durante la carga de canciones');
          spotifyTracksStore.setLoading(false);
          loadingProgress = 0;
        });
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load Spotify tracks';
      spotifyTracksStore.setError(errorMsg);
      console.error('❌ Spotify tracks error:', err);
      untrack(() => {
        spotifyTracksStore.setLoading(false);
        loadingProgress = 0;
      });
    }
  }

  /**
   * Carga paginada tradicional (para pocas canciones)
   * No requiere listeners de eventos ya que es una llamada directa
   */
  async function loadTracksPaginated(limit?: number, offset?: number) {
    spotifyTracksStore.setLoading(true);
    spotifyTracksStore.setError(null);
    try {
      const savedTracks = await getSavedTracks(limit, offset);
      untrack(() => {
        // Reasignar array completo en lugar de mutar (mejor práctica Svelte 5)
        const currentTracks = spotifyTracksStore.tracks;
        spotifyTracksStore.setTracks([...currentTracks, ...savedTracks]);
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tracks';
      spotifyTracksStore.setError(errorMsg);
      console.error('❌ Error cargando tracks paginados:', err);
    } finally {
      spotifyTracksStore.setLoading(false);
    }
  }

  /**
   * Fuerza re-sincronización con biblioteca local
   * Útil cuando la biblioteca local cambia
   */
  function resyncWithLibrary(): void {
    console.log('🔄 Re-sincronizando con biblioteca local...');
    const syncedTracks = syncTracksWithLibrary(spotifyTracksStore.tracks);
    spotifyTracksStore.setTracks(syncedTracks);

    const downloadedCount = syncedTracks.filter(t => t.isDownloaded).length;
    console.log(`✅ ${downloadedCount} de ${syncedTracks.length} canciones ya están descargadas`);
  }

  /**
   * Limpia los listeners de eventos
   * ✅ OPTIMIZACIÓN: Mejor memory leak prevention
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de Spotify y descarga...');

    // Cleanup de event listeners
    unlistenStart?.();
    unlistenBatch?.();
    unlistenComplete?.();
    unlistenError?.();
    unlistenDownloadProgress?.();
    unlistenDownloadFinished?.();

    // Nullificar referencias para ayudar al GC
    unlistenStart = undefined;
    unlistenBatch = undefined;
    unlistenComplete = undefined;
    unlistenError = undefined;
    unlistenDownloadProgress = undefined;
    unlistenDownloadFinished = undefined;

    console.log('✅ useSpotifyTracks limpiado');
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    untrack(() => {
      spotifyTracksStore.setTracks([]);
      loadingProgress = 0;
      totalTracks = 0;
      spotifyTracksStore.setError(null);
      spotifyTracksStore.setLoading(false);
    });
  }

  /**
   * � DESCARGA REAL: Descarga una canción individual usando el módulo de descarga
   */
  async function downloadTrack(trackId: string): Promise<void> {
    console.log(`⬇️ Iniciando descarga real para track: ${trackId}`);

    // Encontrar el track
    const track = spotifyTracksStore.tracks.find(t => t.id === trackId);
    if (!track) {
      console.warn(`⚠️ Track ${trackId} no encontrado`);
      return;
    }

    if (!track.externalUrl) {
      console.error(`❌ Track ${trackId} no tiene URL de Spotify`);
      return;
    }

    // ✅ NUEVA VERIFICACIÓN: Verificar si ya existe localmente
    const localTracksMap = buildLocalTracksMap();
    const artist = track.artists[0]?.toLowerCase().trim() || '';
    const title = track.name.toLowerCase().trim();
    const key = `${artist}-${title}`;

    if (localTracksMap.has(key)) {
      console.log(`⏭️ Track "${track.name}" ya existe localmente, saltando descarga`);
      spotifyTracksStore.updateDownloadState(trackId, 'completed');
      return;
    }

    try {
      // Marcar como descargando
      spotifyTracksStore.updateDownloadState(trackId, 'downloading');

      // Usar el módulo de descarga real
      await download.downloadTrack(track);

      // Marcar como completado (esto se hará automáticamente por el evento)
      // spotifyTracksStore.updateDownloadState(trackId, 'completed');
      console.log(`✅ Descarga iniciada para: ${track.name}`);

    } catch (err) {
      spotifyTracksStore.updateDownloadState(trackId, 'error');
      console.error(`❌ Error en descarga real: ${track.name}`, err);
      throw err;
    }
  }

  /**
   * 🔥 DESCARGA REAL: Descarga todas las canciones usando el módulo de descarga
   * ✅ FILTRA TRACKS QUE YA EXISTEN LOCALMENTE antes de descargar
   */
  async function downloadAllTracks(): Promise<void> {
    // Filtrar tracks que no están completados Y que no existen localmente
    const localTracksMap = buildLocalTracksMap();

    const tracksToDownload = spotifyTracksStore.tracks.filter(track => {
      // Excluir tracks ya marcados como completados
      if (track.downloadState === 'completed') {
        return false;
      }

      // Excluir tracks que ya existen localmente
      const artist = track.artists[0]?.toLowerCase().trim() || '';
      const title = track.name.toLowerCase().trim();
      const key = `${artist}-${title}`;

      if (localTracksMap.has(key)) {
        // Marcar como completado si ya existe localmente
        spotifyTracksStore.updateDownloadState(track.id!, 'completed');
        return false;
      }

      return true;
    });

    if (tracksToDownload.length === 0) {
      console.log('✅ Todas las canciones ya están descargadas o existen localmente');
      return;
    }

    console.log(`⬇️ Iniciando descarga real de ${tracksToDownload.length} canciones (filtradas de ${spotifyTracksStore.tracks.length} totales)...`);

    try {
      // Usar el módulo de descarga real para descargar en masa
      await download.downloadTracks(tracksToDownload);
      console.log(`✅ Descarga masiva iniciada para ${tracksToDownload.length} canciones`);
    } catch (err) {
      console.error(`❌ Error en descarga masiva:`, err);
      throw err;
    }
  }

  _instance = {
    // Estado
    get tracks() { return filteredTracks as SpotifyTrackWithDownload[]; },
    get allTracks() { return spotifyTracksStore.tracks as SpotifyTrackWithDownload[]; },
    get isLoading() { return spotifyTracksStore.isLoading; },
    get loadingProgress() { return loadingProgress; },
    get totalTracks() { return totalTracks; },
    get error() { return spotifyTracksStore.error; },
    set error(value: string | null) { spotifyTracksStore.setError(value); },

    // Acciones
    setupEventListeners,
    loadTracks,
    loadTracksPaginated,
    resyncWithLibrary,
    cleanup,
    reset,
    search,

    // 🔽 DESCARGAS REALES
    downloadTrack,
    downloadAllTracks
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
