import { invoke } from '@tauri-apps/api/core';
import { untrack } from 'svelte';
import { getErrorMessage, markDownloadedTracks } from '@/lib/utils/common';

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: string[];
  album: string;
  album_image: string | null;
  duration_ms: number;
  popularity: number | null;
  preview_url: string | null;
  external_url: string | null;
  isDownloaded?: boolean;
}

/**
 * Hook para manejar canciones guardadas de Spotify
 * Incluye streaming progresivo y comparación con biblioteca local
 */
export function useSpotifyTracks() {
  let tracks = $state<SpotifyTrack[]>([]);
  let isLoading = $state(false);
  let loadingProgress = $state(0);
  let error = $state<string | null>(null);
  let eventUnlisteners: Array<() => void> = [];
  let listenersSetup = false;

  /**
   * Configura los listeners de eventos para streaming progresivo
   */
  async function setupEventListeners(): Promise<void> {
    if (listenersSetup) {
      console.log('⚠️ Listeners ya configurados');
      return;
    }

    const { listen } = await import('@tauri-apps/api/event');
    console.log('🎧 Configurando listeners de eventos Spotify...');

    // Listener para el inicio del streaming
    const unlistenStart = await listen<{ total: number }>('spotify-tracks-start', (event) => {
      console.log(`🚀 Iniciando carga de ${event.payload.total} canciones`);
      untrack(() => {
        tracks = [];
        loadingProgress = 0;
      });
    });
    eventUnlisteners.push(unlistenStart);

    // Listener para cada batch de canciones
    const unlistenBatch = await listen<{ 
      tracks: SpotifyTrack[], 
      progress: number, 
      loaded: number, 
      total: number 
    }>('spotify-tracks-batch', (event) => {
      const { tracks: newTracks, progress, loaded, total } = event.payload;
      
      tracks = [...tracks, ...newTracks];
      loadingProgress = progress;
      
      console.log(`📥 Batch recibido: +${newTracks.length} canciones (${loaded}/${total} - ${progress}%)`);
    });
    eventUnlisteners.push(unlistenBatch);

    // Listener para la finalización
    const unlistenComplete = await listen<{ total: number }>('spotify-tracks-complete', (event) => {
      console.log(`✅ ¡Carga completa! ${event.payload.total} canciones cargadas`);
      isLoading = false;
      loadingProgress = 100;
    });
    eventUnlisteners.push(unlistenComplete);

    // Listener para errores
    const unlistenError = await listen<{ message: string }>('spotify-tracks-error', (event) => {
      console.error('❌ Error en streaming:', event.payload.message);
      error = event.payload.message;
      isLoading = false;
      loadingProgress = 0;
    });
    eventUnlisteners.push(unlistenError);

    listenersSetup = true;
    console.log(`✅ ${eventUnlisteners.length} listeners configurados`);
  }

  /**
   * Carga todas las canciones guardadas con streaming progresivo
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
      });
    }

    try {
      console.log('🎵 Cargando canciones guardadas con streaming progresivo...');
      await invoke('spotify_stream_all_liked_songs');
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error loading tracks:', err);
      isLoading = false;
      loadingProgress = 0;
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
    eventUnlisteners.forEach(unlisten => unlisten());
    eventUnlisteners = [];
    listenersSetup = false;
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    untrack(() => {
      tracks = [];
      loadingProgress = 0;
      error = null;
      isLoading = false;
    });
  }

  return {
    // Estado
    get tracks() { return tracks; },
    get isLoading() { return isLoading; },
    get loadingProgress() { return loadingProgress; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    setupEventListeners,
    loadTracks,
    markLocalTracks,
    cleanup,
    reset
  };
}
