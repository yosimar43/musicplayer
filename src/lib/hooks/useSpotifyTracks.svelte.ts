import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { markDownloadedTracks } from '@/lib/utils/common';

// Re-exportar tipo con campo adicional
export interface SpotifyTrackWithDownload extends SpotifyTrack {
  isDownloaded?: boolean;
}

/**
 * Hook para manejar canciones guardadas de Spotify
 * Incluye streaming progresivo y comparación con biblioteca local
 */
export function useSpotifyTracks() {
  let tracks = $state<SpotifyTrackWithDownload[]>([]);
  let isLoading = $state(false);
  let loadingProgress = $state(0);
  let totalTracks = $state(0);
  let error = $state<string | null>(null);
  
  let unlistenBatch: (() => void) | undefined;
  let unlistenStart: (() => void) | undefined;
  let unlistenComplete: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;

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
      
      untrack(() => {
        tracks.push(...newTracks);
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
   */
  async function loadTracks(forceReload = false): Promise<void> {
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
      await setupEventListeners();
      
      // 🔥 Iniciar streaming progresivo
      await TauriCommands.streamAllLikedSongs();
      
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
   */
  async function loadTracksPaginated(limit: number = 50, offset: number = 0) {
    isLoading = true;
    try {
      const savedTracks = await TauriCommands.getSavedTracks(limit, offset);
      untrack(() => {
        tracks.push(...savedTracks);
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load tracks';
    } finally {
      isLoading = false;
    }
  }

  /**
   * Compara tracks con biblioteca local y marca las descargadas
   */
  function markLocalTracks(localTracks: Array<{ title: string; artist: string }>): void {
    console.log('🔍 Comparando con biblioteca local...');
    tracks = markDownloadedTracks(tracks, localTracks);
    
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
    get tracks() { return tracks; },
    get isLoading() { return isLoading; },
    get loadingProgress() { return loadingProgress; },
    get totalTracks() { return totalTracks; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    setupEventListeners,
    loadTracks,
    loadTracksPaginated,
    markLocalTracks,
    cleanup,
    reset
  };
}

// Re-exportar tipo para compatibilidad
export type { SpotifyTrack } from '@/lib/utils/tauriCommands';
