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
   * Verifica si spotdl está instalado
   */
  async function checkSpotdlInstallation(): Promise<boolean> {
    try {
      const version = await invoke<string>('check_spotdl_installed');
      spotdlInstalled = true;
      console.log('✅ spotdl instalado:', version);
      return true;
    } catch (err: any) {
      spotdlInstalled = false;
      error = err.toString();
      console.error('❌ spotdl no disponible:', err);
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
      console.log('⚠️ Ya hay una descarga en progreso');
      return;
    }

    if (tracks.length === 0) {
      error = 'No hay canciones para descargar';
      return;
    }

    // Verificar spotdl
    const installed = await checkSpotdlInstallation();
    if (!installed) {
      error = 'spotdl no está instalado. Por favor instala con: pip install spotdl';
      return;
    }

    console.log(`🚀 Iniciando descarga de ${tracks.length} canciones...`);
    
    untrack(() => {
      isDownloading = true;
      downloadProgress = [];
      downloadStats = { downloaded: 0, failed: 0, total: tracks.length };
      error = null;
    });

    // Obtener carpeta de música del sistema
    let musicFolder: string;
    try {
      console.log('🔍 Obteniendo carpeta de música...');
      musicFolder = await invoke<string>('get_default_music_folder');
      console.log('✅ Carpeta de música:', musicFolder);
    } catch (err: any) {
      console.error('❌ Error obteniendo carpeta de música:', err);
      error = 'No se pudo obtener la carpeta de música del sistema';
      isDownloading = false;
      return;
    }

    // Extraer URLs de Spotify
    const urls = tracks
      .filter(t => t.external_url)
      .map(t => t.external_url!);

    console.log(`🎧 Descargando ${urls.length} canciones en: ${musicFolder}`);

    try {
      await invoke('download_spotify_tracks_segmented', {
        urls,
        segmentSize: options.segmentSize || 10,
        delay: options.delay || 2,
        outputTemplate: options.outputTemplate || '{artist}/{album}/{title}',
        format: options.format || 'mp3',
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
  async function downloadSingleTrack(track: SpotifyTrack): Promise<void> {
    console.log('🔍 Iniciando descarga individual...', track.name);

    if (!track.external_url) {
      console.error('❌ Track sin URL externa');
      return;
    }

    // Verificar spotdl si no lo hemos hecho
    if (spotdlInstalled === null) {
      const installed = await checkSpotdlInstallation();
      if (!installed) {
        error = 'spotdl no está instalado. Por favor instala con: pip install spotdl';
        return;
      }
    }

    // Obtener carpeta de música
    let musicFolder: string;
    try {
      console.log('🔍 Obteniendo carpeta de música...');
      musicFolder = await invoke<string>('get_default_music_folder');
      console.log('✅ Carpeta de música:', musicFolder);
    } catch (err: any) {
      console.error('❌ Error obteniendo carpeta de música:', err);
      error = 'No se pudo obtener la carpeta de música del sistema';
      return;
    }

    console.log(`🎧 Descargando: ${track.name} - ${track.artists.join(', ')}`);

    try {
      const result = await invoke<string>('download_single_spotify_track', {
        url: track.external_url,
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3',
        outputDir: musicFolder
      });
      
      console.log('✅ Descarga completada:', result);
      
      // Animar confirmación
      animate('.download-panel', {
        scale: [1, 1.02, 1],
        easing: 'easeInOutQuad',
        duration: 400
      });
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error descargando track:', err);
      
      // Mostrar ayuda si es error de YouTube
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
