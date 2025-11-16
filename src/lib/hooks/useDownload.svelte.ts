import { listen } from '@tauri-apps/api/event';
import { animate } from 'animejs';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { useEventBus, EVENTS } from './useEventBus.svelte';

const { checkSpotdlInstalled, downloadTracksSegmented, downloadTrack: downloadTrackCmd } = TauriCommands;

export interface DownloadProgress {
  trackId: string;
  progress: number;
  current: number;
  total: number;
}

export interface DownloadStats {
  completed: number;
  failed: number;
  total: number;
}

/**
 * Hook para manejar descargas de canciones con spotdl
 * Incluye descarga individual y masiva con seguimiento de progreso
 */
export function useDownload() {
  const downloads = $state<Map<string, DownloadProgress>>(new Map());
  let isDownloading = $state(false);
  let stats = $state<DownloadStats>({ completed: 0, failed: 0, total: 0 });
  let error = $state<string | null>(null);
  
  let unlistenProgress: (() => void) | undefined;
  let unlistenFinished: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;

  /**
   * 🔥 Configura los listeners de eventos para descargas
   */
  async function setupEventListeners(): Promise<void> {
    console.log('🎧 Configurando listeners de descarga...');

    // Progreso individual
    unlistenProgress = await listen<DownloadProgress>('download-progress', (event) => {
      const progress = event.payload;
      downloads.set(progress.trackId, progress);
    });

    // Descarga completada
    unlistenFinished = await listen<{ track: SpotifyTrack; filePath: string }>(
      'download-finished',
      (event) => {
        const { track } = event.payload;
        downloads.delete(track.id || '');
        
        untrack(() => {
          stats.completed++;
        });

        // Emitir evento global para sincronizar biblioteca
        const bus = useEventBus();
        bus.emit(EVENTS.DOWNLOAD_COMPLETED, { track });
      }
    );

    // Errores de descarga
    unlistenError = await listen<{ trackId: string; error: string }>(
      'download-error',
      (event) => {
        const { trackId, error: downloadError } = event.payload;
        downloads.delete(trackId);
        
        untrack(() => {
          stats.failed++;
        });
        error = downloadError;
      }
    );

    console.log('✅ Download listeners configurados');
  }

  /**
   * Verifica si spotdl está instalado
   */
  async function checkSpotdlInstallation(): Promise<boolean> {
    try {
      return await checkSpotdlInstalled();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'spotdl no disponible';
      error = errorMsg;
      console.error('❌ spotdl no disponible:', errorMsg);
      return false;
    }
  }

  /**
   * 🔥 Descarga múltiples tracks de forma segmentada con progreso
   */
  async function downloadTracks(
    trackList: SpotifyTrack[],
    segmentSize: number = 10,
    delay: number = 2
  ): Promise<void> {
    // Prevenir múltiples descargas simultáneas
    if (isDownloading) {
      console.warn('⚠️ Ya hay una descarga en progreso');
      return;
    }

    if (trackList.length === 0) {
      error = 'No hay canciones para descargar';
      return;
    }

    // Verificar spotdl
    const installed = await checkSpotdlInstallation();
    if (!installed) {
      error = 'spotdl no está instalado. Instala con: pip install spotdl yt-dlp';
      return;
    }

    isDownloading = true;
    stats.total = trackList.length;
    stats.completed = 0;
    stats.failed = 0;
    error = null;

    try {
      // Inicializar progreso
      trackList.forEach(track => {
        if (track.id) {
          downloads.set(track.id, {
            trackId: track.id,
            progress: 0,
            current: 0,
            total: trackList.length
          });
        }
      });

      await downloadTracksSegmented(trackList, segmentSize, delay);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Bulk download failed';
      console.error('❌ Error en descarga masiva:', err);
    } finally {
      isDownloading = false;
    }
  }

  /**
   * Descarga una sola canción
   */
  async function downloadTrack(track: SpotifyTrack): Promise<void> {
    try {
      await downloadTrackCmd(track);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Download failed';
      throw err;
    }
  }

  /**
   * Limpia los listeners de eventos
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de descarga...');
    unlistenProgress?.();
    unlistenFinished?.();
    unlistenError?.();
    
    downloads.clear();
    isDownloading = false;
    stats.completed = 0;
    stats.failed = 0;
    stats.total = 0;
    error = null;
  }

  return {
    // Estado
    get downloads() { return Array.from(downloads.values()); },
    get isDownloading() { return isDownloading; },
    get stats() { return stats; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    downloadTrack,
    downloadTracks,
    checkSpotdlInstallation,
    setupEventListeners,
    cleanup
  };
}
