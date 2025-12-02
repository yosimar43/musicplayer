/**
 * 🎯 USE LIBRARY HOOK
 * 
 * RESPONSABILIDADES:
 * ✅ Carga biblioteca vía TauriCommands
 * ✅ Escucha eventos de escaneo de Tauri
 * ✅ Maneja persistencia de carpeta (localStorage)
 * ✅ Coordina enriquecimiento con Last.fm
 * ✅ Actualiza libraryStore (solo estado puro)
 * ✅ Maneja cleanup de event listeners
 * 
 * PRINCIPIOS:
 * - Hook asume TODA la responsabilidad de I/O y efectos
 * - libraryStore solo tiene estado puro
 * 
 * ⚠️ SINGLETON: Evita múltiples instancias con listeners duplicados
 */

import { listen } from '@tauri-apps/api/event';
import { libraryStore, type Track } from '@/lib/stores/library.store.svelte';
import { TauriCommands } from '@/lib/utils/tauriCommands';
import { musicDataStore } from '@/lib/stores/musicData.store.svelte';
import { EnrichmentService } from '@/lib/services/enrichment.service';

const { getDefaultMusicFolder, scanMusicFolder, getAudioMetadata } = TauriCommands;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA EVENTOS DE TAURI
// ═══════════════════════════════════════════════════════════════════════════

interface ScanProgressEvent {
  current: number;
  total: number;
  path: string;
}

interface ScanCompleteEvent {
  total: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA HELPER
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'library-last-folder';

function getPersistedFolder(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEY) || '';
}

function persistFolder(folder: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, folder);
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export interface UseLibraryReturn {
  // Estado reactivo
  tracks: Track[];
  isLoading: boolean;
  isEnriching: boolean;
  enrichmentProgress: { current: number; total: number };
  error: string | null;
  currentFolder: string;
  totalTracks: number;
  totalDuration: number;
  artists: string[];
  albums: string[];
  
  // Estado de escaneo
  scanProgress: { current: number; total: number; currentFile: string };
  isScanning: boolean;
  scanPercentage: number;

  // Métodos
  loadLibrary: (folderPath?: string, enrichWithLastFm?: boolean) => Promise<void>;
  reload: (enrichWithLastFm?: boolean) => Promise<void>;
  clearLibrary: () => void;
  getTrackMetadata: (filePath: string) => Promise<Track | null>;
  searchTracks: (query: string) => Track[];
  getTracksByArtist: (artist: string) => Track[];
  getTracksByAlbum: (album: string) => Track[];
  getTrackByPath: (path: string) => Track | undefined;
  
  // Lifecycle
  initialize: () => Promise<void>;
  cleanup: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON PATTERN - Evita múltiples instancias con listeners duplicados
// ═══════════════════════════════════════════════════════════════════════════

let _instance: UseLibraryReturn | null = null;

/**
 * Hook para manejar la biblioteca de música local
 * 
 * ⚠️ SINGLETON: Todas las llamadas retornan la misma instancia
 */
export function useLibrary(): UseLibraryReturn {
  if (_instance) return _instance;

  // Event listener cleanup functions
  let unlistenScanStart: (() => void) | null = null;
  let unlistenScanProgress: (() => void) | null = null;
  let unlistenScanComplete: (() => void) | null = null;

  // Estados derivados del store
  const isEnriching = $derived(EnrichmentService.isEnriching());
  const enrichmentProgress = $derived(EnrichmentService.getProgress());

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP DE EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  async function setupEventListeners(): Promise<void> {
    console.log('🎧 Configurando listeners de escaneo...');

    // Evento: inicio de escaneo
    unlistenScanStart = await listen<{ path: string }>('library-scan-start', (event) => {
      console.log('🔍 Escaneo iniciado:', event.payload.path);
      libraryStore.setLoading(true);
      libraryStore.resetScanProgress();
    });

    // Evento: progreso de escaneo
    unlistenScanProgress = await listen<ScanProgressEvent>('library-scan-progress', (event) => {
      const { current, total, path } = event.payload;
      libraryStore.setScanProgress(current, total, path);
    });

    // Evento: escaneo completado
    unlistenScanComplete = await listen<ScanCompleteEvent>('library-scan-complete', (event) => {
      console.log('✅ Escaneo completado:', event.payload.total, 'archivos');
      libraryStore.setLoading(false);
      libraryStore.resetScanProgress();
    });

    console.log('✅ Listeners de escaneo configurados');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES PRINCIPALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Carga la biblioteca de música
   */
  async function loadLibrary(folderPath?: string, enrichWithLastFm = true): Promise<void> {
    libraryStore.setLoading(true);
    libraryStore.setError(null);

    try {
      // Determinar carpeta a escanear
      let targetFolder = folderPath;
      
      if (!targetFolder) {
        // Intentar carpeta persistida primero
        targetFolder = getPersistedFolder();
        
        // Si no hay persistida, obtener default
        if (!targetFolder) {
          targetFolder = await getDefaultMusicFolder();
        }
      }

      console.log('🔍 Escaneando:', targetFolder);

      // Escanear carpeta
      const scannedTracks = await scanMusicFolder(targetFolder);

      // Actualizar store
      libraryStore.setTracks(scannedTracks);
      libraryStore.setCurrentFolder(targetFolder);

      // Persistir carpeta
      persistFolder(targetFolder);

      console.log(`📚 Biblioteca cargada: ${scannedTracks.length} tracks`);

      // Enriquecer con Last.fm en background
      if (enrichWithLastFm && scannedTracks.length > 0) {
        setTimeout(() => enrichTracks(scannedTracks), 100);
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error cargando biblioteca';
      libraryStore.setError(errorMsg);
      console.error('❌ Error cargando biblioteca:', err);
      throw err;

    } finally {
      libraryStore.setLoading(false);
    }
  }

  /**
   * Recarga la biblioteca actual
   */
  async function reload(enrichWithLastFm = true): Promise<void> {
    const currentFolder = libraryStore.currentFolder;
    if (currentFolder) {
      await loadLibrary(currentFolder, enrichWithLastFm);
    }
  }

  /**
   * Enriquece tracks con datos de Last.fm
   */
  async function enrichTracks(tracks: Track[]): Promise<void> {
    console.log(`🎨 Iniciando enriquecimiento de ${tracks.length} tracks...`);

    // Usar EnrichmentService para batch processing
    await EnrichmentService.enrichTracksBatch(tracks);

    // También precargar album art
    await preloadAlbumArt(tracks);
  }

  /**
   * Precarga portadas de álbumes
   */
  async function preloadAlbumArt(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    console.log(`🎨 Precargando ${tracks.length} portadas de álbum...`);

    const tracksToPreload = tracks.slice(0, 50);
    const batchSize = 5;

    for (let i = 0; i < tracksToPreload.length; i += batchSize) {
      const batch = tracksToPreload.slice(i, i + batchSize);

      await Promise.allSettled(
        batch.map(async (track) => {
          if (!track.artist || !track.title) return;

          try {
            const trackData = await musicDataStore.getTrack(track.artist, track.title);
            let hasImage = !!trackData?.image;

            if (!hasImage && track.album) {
              const albumData = await musicDataStore.getAlbum(track.artist, track.album);
              hasImage = !!albumData?.image;
            }

            if (hasImage && !track.albumArt) {
              libraryStore.updateTrack(track.path, {
                albumArt: trackData?.image
              });
            }
          } catch {
            // Silenciar errores de precarga
          }
        })
      );

      if (i + batchSize < tracksToPreload.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎨 Precarga de portadas completada`);
  }

  /**
   * Limpia la biblioteca
   */
  function clearLibrary(): void {
    libraryStore.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Obtiene metadata de un archivo específico
   */
  async function getTrackMetadata(filePath: string): Promise<Track | null> {
    try {
      return await getAudioMetadata(filePath);
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el hook (llamar en onMount o $effect)
   */
  async function initialize(): Promise<void> {
    // Cargar carpeta persistida
    const persistedFolder = getPersistedFolder();
    if (persistedFolder) {
      libraryStore.setCurrentFolder(persistedFolder);
    }

    // Configurar listeners de eventos
    await setupEventListeners();
  }

  /**
   * Limpia recursos
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de biblioteca...');
    unlistenScanStart?.();
    unlistenScanProgress?.();
    unlistenScanComplete?.();
    unlistenScanStart = null;
    unlistenScanProgress = null;
    unlistenScanComplete = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  _instance = {
    // Estado (desde store, solo lectura)
    get tracks() { return libraryStore.tracks; },
    get isLoading() { return libraryStore.isLoading; },
    get isEnriching() { return isEnriching; },
    get enrichmentProgress() { return enrichmentProgress; },
    get error() { return libraryStore.error; },
    get currentFolder() { return libraryStore.currentFolder; },
    get totalTracks() { return libraryStore.totalTracks; },
    get totalDuration() { return libraryStore.totalDuration; },
    get artists() { return libraryStore.artists; },
    get albums() { return libraryStore.albums; },
    
    // Estado de escaneo
    get scanProgress() { return libraryStore.scanProgress; },
    get isScanning() { return libraryStore.isScanning; },
    get scanPercentage() { return libraryStore.scanPercentage; },

    // Acciones
    loadLibrary,
    reload,
    clearLibrary,
    getTrackMetadata,
    
    // Queries (delegadas al store)
    searchTracks: libraryStore.searchTracks.bind(libraryStore),
    getTracksByArtist: libraryStore.getTracksByArtist.bind(libraryStore),
    getTracksByAlbum: libraryStore.getTracksByAlbum.bind(libraryStore),
    getTrackByPath: libraryStore.getTrackByPath.bind(libraryStore),

    // Lifecycle
    initialize,
    cleanup
  };

  return _instance;
}

/**
 * Reset para testing - NO usar en producción
 */
export function resetLibraryInstance() {
  if (_instance) {
    _instance.cleanup();
  }
  _instance = null;
}

