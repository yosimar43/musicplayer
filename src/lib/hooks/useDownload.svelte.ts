import { listen } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands, type SpotifyTrack } from '@/lib/utils/tauriCommands';
import { useLibrary } from './useLibrary.svelte';
import { useLibrarySync } from './useLibrarySync.svelte';
import { useSpotifyAuth } from './useSpotifyAuth.svelte';

const { checkSpotdlInstalled, downloadTracksSegmented, downloadTrack: downloadTrackCmd } = TauriCommands;

/**
 * Estructura de progreso de descarga que coincide con Rust
 * Rust emite: { song: String, index: usize, total: usize, status: String, url: String }
 */
export interface DownloadProgress {
  song: string;
  index: number;
  total: number;
  status: string;
  url: string;
}

/**
 * Estructura de finalización de descarga que coincide con Rust
 * Rust emite: { message: String, total_downloaded: usize, total_failed: usize }
 */
export interface DownloadFinished {
  message: string;
  total_downloaded: number;
  total_failed: number;
}

/**
 * Estructura de error de descarga
 */
export interface DownloadError {
  message: string;
}

export interface DownloadStats {
  completed: number;
  failed: number;
  total: number;
}

export interface UseDownloadReturn {
  downloads: DownloadProgress[];
  isDownloading: boolean;
  stats: DownloadStats;
  error: string | null;
  downloadTrack: (track: SpotifyTrack) => Promise<void>;
  downloadTracks: (trackList: SpotifyTrack[], segmentSize?: number, delay?: number) => Promise<void>;
  checkSpotdlInstallation: () => Promise<boolean>;
  setupEventListeners: () => Promise<void>;
  cleanup: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON PATTERN - Evita múltiples instancias con estados desincronizados
// ═══════════════════════════════════════════════════════════════════════════

let _instance: UseDownloadReturn | null = null;

/**
 * Hook para manejar descargas de canciones con spotdl
 * Incluye descarga individual y masiva con seguimiento de progreso
 * 
 * ⚠️ SINGLETON: Todas las llamadas retornan la misma instancia
 */
export function useDownload(): UseDownloadReturn {
  if (_instance) return _instance;

  // Depender de autenticación (singleton)
  const auth = useSpotifyAuth();
  // Hook para sincronización inteligente
  const librarySync = useLibrarySync();
  // Hook para gestión de biblioteca
  const library = useLibrary();

  // Mapa de descargas activas por URL (usando URL como key ya que Rust no envía trackId)
  const downloads = $state<Map<string, DownloadProgress>>(new Map());
  let isDownloading = $state(false);
  let stats = $state<DownloadStats>({ completed: 0, failed: 0, total: 0 });
  let error = $state<string | null>(null);

  /**
   * Actualiza los flags isDownloaded de tracks de Spotify usando sincronización
   */
  function updateDownloadedFlags(tracks: SpotifyTrack[]): void {
    if (tracks.length === 0) return;

    // Usar el hook de sync para actualizar flags
    const syncedTracks = librarySync.syncWithLibrary(tracks);

    // Aquí podríamos emitir un evento o actualizar algún store global
    // Por ahora solo loggeamos
    const downloadedCount = syncedTracks.filter(t => 'isDownloaded' in t && t.isDownloaded).length;
    console.log(`✅ Flags actualizados: ${downloadedCount}/${tracks.length} tracks marcados como descargados`);
  }
  
  let unlistenProgress: (() => void) | undefined;
  let unlistenFinished: (() => void) | undefined;
  let unlistenError: (() => void) | undefined;

  // ✅ NUEVO: Almacenar tracks siendo descargados para actualizar flags
  let currentDownloadingTracks = $state<SpotifyTrack[]>([]);

  // Limpiar estado cuando se desautentique
  $effect(() => {
    if (!auth.isAuthenticated && (isDownloading || downloads.size > 0)) {
      console.log('🔄 Cancelando descargas por desautenticación');
      cleanup();
    }
  });

  /**
   * 🔥 Configura los listeners de eventos para descargas
   * IMPORTANTE: Debe llamarse ANTES de iniciar cualquier descarga
   */
  async function setupEventListeners(): Promise<void> {
    // Limpiar listeners anteriores si existen
    cleanup();

    console.log('🎧 Configurando listeners de descarga...');

    // Progreso individual - estructura desde Rust: { song, index, total, status, url }
    unlistenProgress = await listen<DownloadProgress>('download-progress', (event) => {
      const progress = event.payload;
      // Usar URL como key ya que es único
      downloads.set(progress.url, progress);
      
      // Actualizar progreso calculado
      const calculatedProgress = progress.total > 0 
        ? Math.round((progress.index / progress.total) * 100) 
        : 0;
      
      console.log(`📥 Progreso: ${progress.song} (${progress.index}/${progress.total}) - ${calculatedProgress}% - ${progress.status}`);
    });

    // Descarga completada - estructura desde Rust: { message, total_downloaded, total_failed }
    unlistenFinished = await listen<DownloadFinished>(
      'download-finished',
      async (event) => {
        const { total_downloaded, total_failed, message } = event.payload;
        
        untrack(() => {
          stats.completed = total_downloaded;
          stats.failed = total_failed;
          stats.total = total_downloaded + total_failed;
          isDownloading = false; // Actualizar estado de descarga
        });

        console.log(`✅ Descarga completada: ${message} (${total_downloaded} exitosas, ${total_failed} fallidas)`);
        
        // Limpiar mapa de descargas
        downloads.clear();
        
        // ✅ NUEVA CONEXIÓN: Actualizar flags inmediatamente Y recargar biblioteca
        if (total_downloaded > 0) {
          console.log('🔄 Actualizando flags de descarga y recargando biblioteca...');

          // Recargar biblioteca para incluir nuevos archivos con metadata completa
          try {
            await library.loadLibrary(undefined, false); // No enriquecer con Last.fm
            console.log('✅ Biblioteca recargada con nuevos archivos');
          } catch (err) {
            console.warn('⚠️ Error recargando biblioteca:', err);
          }

          // Actualizar flags de descarga usando sync
          updateDownloadedFlags(currentDownloadingTracks);
        }

        // Limpiar tracks almacenados
        currentDownloadingTracks = [];
      }
    );

    // Errores de descarga - estructura desde Rust: { message }
    unlistenError = await listen<DownloadError>(
      'download-error',
      (event) => {
        const { message } = event.payload;
        
        untrack(() => {
          stats.failed++;
        });
        
        error = message;
        console.error('❌ Error de descarga:', message);
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
   * IMPORTANTE: setupEventListeners() debe ser llamado antes de esta función
   */
  async function downloadTracks(
    trackList: SpotifyTrack[],
    segmentSize: number = 10,
    delay: number = 2
  ): Promise<void> {
    // ✅ NUEVA VALIDACIÓN: Verificar autenticación antes de descargar
    if (!auth.isAuthenticated) {
      error = 'Usuario no autenticado con Spotify';
      console.warn('⚠️ Intento de descargar sin autenticación');
      throw new Error('Usuario no autenticado con Spotify');
    }

    // Prevenir múltiples descargas simultáneas
    if (isDownloading) {
      console.warn('⚠️ Ya hay una descarga en progreso');
      return;
    }

    if (trackList.length === 0) {
      error = 'No hay canciones para descargar';
      return;
    }

    // Asegurar que los listeners estén configurados
    if (!unlistenProgress) {
      await setupEventListeners();
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
    downloads.clear();

    // ✅ NUEVO: Almacenar tracks para actualizar flags después
    currentDownloadingTracks = [...trackList];

    try {
      // Inicializar progreso con URLs (que es lo que Rust usa como identificador)
      trackList.forEach((track, index) => {
        if (track.externalUrl) {
          downloads.set(track.externalUrl, {
            song: track.name,
            index: index + 1,
            total: trackList.length,
            status: '⏳ Iniciando...',
            url: track.externalUrl
          });
        }
      });

      await downloadTracksSegmented(trackList, segmentSize, delay);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Bulk download failed';
      console.error('❌ Error en descarga masiva:', err);
      isDownloading = false;
      // ✅ Limpiar tracks en caso de error
      currentDownloadingTracks = [];
    }
    // Nota: isDownloading se actualiza cuando llega el evento download-finished
  }

  /**
   * Descarga una sola canción
   * IMPORTANTE: setupEventListeners() debe ser llamado antes de esta función
   */
  async function downloadTrack(track: SpotifyTrack): Promise<void> {
    // ✅ NUEVA VALIDACIÓN: Verificar autenticación antes de descargar
    if (!auth.isAuthenticated) {
      error = 'Usuario no autenticado con Spotify';
      console.warn('⚠️ Intento de descargar sin autenticación');
      throw new Error('Usuario no autenticado con Spotify');
    }

    if (!track.externalUrl) {
      error = 'Track sin URL de Spotify';
      throw new Error('Track sin URL de Spotify');
    }

    // Asegurar que los listeners estén configurados
    if (!unlistenProgress) {
      await setupEventListeners();
    }

    // Inicializar progreso
    if (track.externalUrl) {
      downloads.set(track.externalUrl, {
        song: track.name,
        index: 1,
        total: 1,
        status: '⏳ Iniciando...',
        url: track.externalUrl
      });
    }

    try {
      isDownloading = true;
      error = null;

      // ✅ NUEVO: Almacenar track para actualizar flags después
      currentDownloadingTracks = [track];

      await downloadTrackCmd(track);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Download failed';
      isDownloading = false;
      if (track.externalUrl) {
        downloads.delete(track.externalUrl);
      }
      // ✅ Limpiar tracks en caso de error
      currentDownloadingTracks = [];
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
    
    unlistenProgress = undefined;
    unlistenFinished = undefined;
    unlistenError = undefined;
    
    downloads.clear();
    isDownloading = false;
    stats.completed = 0;
    stats.failed = 0;
    stats.total = 0;
    error = null;
    // Limpiar tracks almacenados
    currentDownloadingTracks = [];
  }

  _instance = {
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

  return _instance;
}

/**
 * Reset para testing - NO usar en producción
 */
export function resetDownloadInstance() {
  if (_instance) {
    _instance.cleanup();
  }
  _instance = null;
}
