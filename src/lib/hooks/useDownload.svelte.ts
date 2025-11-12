import { invoke } from '@tauri-apps/api/core';
import { animate } from 'animejs';
import { untrack } from 'svelte';
import { getErrorMessage } from '@/lib/utils/common';
import type { SpotifyTrack } from './useSpotifyTracks.svelte';

export interface DownloadProgressItem {
  index: number;
  total: number;
  song: string;
  status: string;
}

export interface DownloadStats {
  downloaded: number;
  failed: number;
  total: number;
}

/**
 * Hook para manejar descargas de canciones con spotdl
 * Incluye descarga individual y masiva con seguimiento de progreso
 */
export function useDownload() {
  let isDownloading = $state(false);
  let downloadProgress = $state<DownloadProgressItem[]>([]);
  let downloadStats = $state<DownloadStats>({ downloaded: 0, failed: 0, total: 0 });
  let spotdlInstalled = $state<boolean | null>(null);
  let error = $state<string | null>(null);
  let eventUnlisteners: Array<() => void> = [];
  let listenersSetup = false;

  /**
   * Configura los listeners de eventos para descargas
   */
  async function setupEventListeners(): Promise<void> {
    if (listenersSetup) {
      console.log('⚠️ Download listeners ya configurados');
      return;
    }

    const { listen } = await import('@tauri-apps/api/event');
    console.log('🎧 Configurando listeners de descarga...');

    // Listener para progreso individual
    const unlistenProgress = await listen<DownloadProgressItem>('download-progress', (event) => {
      const data = event.payload;
      downloadProgress = [...downloadProgress, data];
      
      // Animar entrada del nuevo item
      setTimeout(() => {
        animate('.download-item', {
          translateY: [-8, 0],
          opacity: [0, 1],
          easing: 'easeOutQuad',
          duration: 350,
        });
      }, 50);
      
      console.log(`📥 [${data.index}/${data.total}] ${data.song}: ${data.status}`);
    });
    eventUnlisteners.push(unlistenProgress);

    // Listener para segmento completado
    const unlistenSegment = await listen<{ message: string }>('download-segment-finished', (event) => {
      console.log(`✅ ${event.payload.message}`);
    });
    eventUnlisteners.push(unlistenSegment);

    // Listener para finalización completa
    const unlistenFinished = await listen<{ 
      message: string; 
      total_downloaded: number; 
      total_failed: number 
    }>('download-finished', (event) => {
      const data = event.payload;
      isDownloading = false;
      
      untrack(() => {
        downloadStats.downloaded = data.total_downloaded;
        downloadStats.failed = data.total_failed;
      });
      
      // Animación de completado
      animate('.download-panel', {
        backgroundColor: ['rgba(6, 182, 212, 0.1)', 'rgba(14, 165, 233, 0.2)', 'rgba(6, 182, 212, 0.1)'],
        easing: 'easeInOutSine',
        duration: 1000
      });
      
      console.log(`🎉 ${data.message} - ${data.total_downloaded} descargadas, ${data.total_failed} fallidas`);
    });
    eventUnlisteners.push(unlistenFinished);

    // Listener para errores
    const unlistenError = await listen<{ message: string }>('download-error', (event) => {
      console.error(`❌ Error de descarga: ${event.payload.message}`);
      error = event.payload.message;
      isDownloading = false;
      
      // Animación de error
      animate('.download-panel', {
        backgroundColor: ['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.2)', 'rgba(239, 68, 68, 0.1)'],
        easing: 'easeInOutSine',
        duration: 800
      });
    });
    eventUnlisteners.push(unlistenError);

    listenersSetup = true;
    console.log(`✅ ${eventUnlisteners.length} download listeners configurados`);
  }

  /**
   * Verifica si spotdl está instalado (con cache)
   */
  async function checkSpotdlInstallation(): Promise<boolean> {
    // Si ya verificamos previamente, usar el resultado cacheado
    if (spotdlInstalled !== null) {
      return spotdlInstalled;
    }
    
    try {
      const version = await invoke<string>('check_spotdl_installed');
      spotdlInstalled = true;
      return true;
    } catch (err: any) {
      spotdlInstalled = false;
      const errorMsg = typeof err === 'string' ? err : err.message || 'spotdl no disponible';
      error = errorMsg;
      console.error('❌ spotdl no disponible:', errorMsg);
      return false;
    }
  }

  /**
   * Descarga múltiples tracks de forma segmentada
   */
  async function downloadTracks(
    tracks: SpotifyTrack[],
    options: {
      segmentSize?: number;
      delay?: number;
      outputTemplate?: string;
      format?: string;
    } = {}
  ): Promise<void> {
    // Prevenir múltiples descargas simultáneas
    if (isDownloading) {
      console.warn('⚠️ Ya hay una descarga en progreso');
      return;
    }

    if (tracks.length === 0) {
      error = 'No hay canciones para descargar';
      return;
    }

    // Verificar spotdl
    const installed = await checkSpotdlInstallation();
    if (!installed) {
      error = 'spotdl no está instalado. Instala con: pip install spotdl yt-dlp';
      return;
    }
    
    // Validar opciones
    const segmentSize = Math.max(1, Math.min(options.segmentSize || 10, 50));
    const delay = Math.max(2, Math.min(options.delay || 3, 10));
    const format = ['mp3', 'flac', 'ogg', 'm4a', 'opus'].includes(options.format || 'mp3') 
      ? options.format || 'mp3' 
      : 'mp3';
    
    untrack(() => {
      isDownloading = true;
      downloadProgress = [];
      downloadStats = { downloaded: 0, failed: 0, total: tracks.length };
      error = null;
    });

    // Obtener carpeta de música del sistema
    let musicFolder: string;
    try {
      musicFolder = await invoke<string>('get_default_music_folder');
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      error = `No se pudo obtener la carpeta de música: ${errorMsg}`;
      isDownloading = false;
      return;
    }

    // Extraer URLs válidas de Spotify
    const urls = tracks
      .filter(t => t.external_url && t.external_url.startsWith('https://open.spotify.com/track/'))
      .map(t => t.external_url!);
    
    if (urls.length === 0) {
      error = 'No hay URLs válidas de Spotify para descargar';
      isDownloading = false;
      return;
    }

    try {
      await invoke('download_spotify_tracks_segmented', {
        urls,
        segmentSize,
        delay,
        outputTemplate: options.outputTemplate || '{artist}/{album}/{title}',
        format,
        outputDir: musicFolder
      });
    } catch (err: any) {
      error = getErrorMessage(err);
      isDownloading = false;
      console.error('❌ Error en descarga masiva:', err);
    }
  }

  /**
   * Descarga una sola canción
   */
  async function downloadSingleTrack(
    track: SpotifyTrack,
    options: {
      outputTemplate?: string;
      format?: string;
    } = {}
  ): Promise<void> {
    if (!track.external_url) {
      error = 'Track sin URL de Spotify';
      return;
    }
    
    // Validar URL
    if (!track.external_url.startsWith('https://open.spotify.com/track/')) {
      error = 'URL de Spotify inválida';
      return;
    }

    // Verificar spotdl
    const installed = await checkSpotdlInstallation();
    if (!installed) {
      error = 'spotdl no está instalado. Instala con: pip install spotdl yt-dlp';
      return;
    }
    
    // Validar formato
    const format = ['mp3', 'flac', 'ogg', 'm4a', 'opus'].includes(options.format || 'mp3')
      ? options.format || 'mp3'
      : 'mp3';

    // Obtener carpeta de música
    let musicFolder: string;
    try {
      musicFolder = await invoke<string>('get_default_music_folder');
    } catch (err: any) {
      error = `No se pudo obtener la carpeta de música: ${getErrorMessage(err)}`;
      return;
    }

    try {
      await invoke<string>('download_single_spotify_track', {
        url: track.external_url,
        outputTemplate: options.outputTemplate || '{artist}/{album}/{title}',
        format,
        outputDir: musicFolder
      });
      
      // Animar confirmación visual
      animate('.download-panel', {
        scale: [1, 1.02, 1],
        easing: 'easeInOutQuad',
        duration: 400
      });
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      error = errorMsg;
      console.error('❌ Error descargando track:', errorMsg);
      
      // Mostrar ayuda contextual si es error común
      if (err.toString().includes('YouTube') || err.toString().includes('YT-DLP')) {
        console.log('💡 Solución: Actualiza yt-dlp y spotdl ejecutando:');
        console.log('   pip install --upgrade yt-dlp spotdl');
      }
    }
  }

  /**
   * Limpia el progreso de descarga
   */
  function clearProgress(): void {
    downloadProgress = [];
    downloadStats = { downloaded: 0, failed: 0, total: 0 };
  }

  /**
   * Limpia los listeners de eventos
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de descarga...');
    eventUnlisteners.forEach(unlisten => unlisten());
    eventUnlisteners = [];
    listenersSetup = false;
  }

  /**
   * Reinicia el estado
   */
  function reset(): void {
    untrack(() => {
      isDownloading = false;
      downloadProgress = [];
      downloadStats = { downloaded: 0, failed: 0, total: 0 };
      error = null;
    });
  }

  return {
    // Estado
    get isDownloading() { return isDownloading; },
    get downloadProgress() { return downloadProgress; },
    get downloadStats() { return downloadStats; },
    get spotdlInstalled() { return spotdlInstalled; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    setupEventListeners,
    checkSpotdlInstallation,
    downloadTracks,
    downloadSingleTrack,
    clearProgress,
    cleanup,
    reset
  };
}
