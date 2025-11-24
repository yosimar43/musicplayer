import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { useLibrarySync } from './useLibrarySync.svelte';
import { useSpotifyAuth } from './useSpotifyAuth.svelte'; // ✅ NUEVA CONEXIÓN

const { streamAllLikedSongs, getSavedTracks } = TauriCommands;

// Re-exportar tipo con campo adicional
export interface SpotifyTrackWithDownload extends SpotifyTrack {
  isDownloaded?: boolean;
}

export interface UseSpotifyTracksReturn {
  tracks: SpotifyTrackWithDownload[];
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
}

export function useSpotifyTracks(): UseSpotifyTracksReturn {
  let tracks = $state<SpotifyTrackWithDownload[]>([]);
  let isLoading = $state(false);
  let loadingProgress = $state(0);
  let totalTracks = $state(0);
  let error = $state<string | null>(null);
  
  let unlistenBatch: (() => void) | undefined;
  let unlistenStart: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;

  // ✅ NUEVA CONEXIÓN: Depender de autenticación
  const auth = useSpotifyAuth();
  // Hook de sincronización con biblioteca local
  const sync = useLibrarySync();
  // ✅ NUEVA CONEXIÓN: Limpiar estado cuando se desautentique
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
      const syncedNewTracks = sync.syncWithLibrary(newTracks) as SpotifyTrackWithDownload[];
      
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
    tracks = sync.syncWithLibrary(tracks) as SpotifyTrackWithDownload[];
    
    const downloadedCount = tracks.filter(t => t.isDownloaded).length;
    console.log(`✅ ${downloadedCount} de ${tracks.length} canciones ya están descargadas`);
  }

  /**
   * Limpia los listeners de eventos
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de tracks...');
    unlistenStart?.();
    unlistenBatch?.();
    unlistenComplete?.();
    unlistenError?.();
    
    unlistenStart = undefined;
    unlistenBatch = undefined;
    unlistenComplete = undefined;
    unlistenError = undefined;
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

  return {
    // Estado
    get tracks() { return tracks as SpotifyTrackWithDownload[]; },
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
    reset
  };
}

// Re-exportar tipo para compatibilidad
export type { SpotifyTrack } from '@/lib/utils/tauriCommands';
