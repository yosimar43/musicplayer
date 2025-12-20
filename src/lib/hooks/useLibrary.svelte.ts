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
 * ✅ Proporciona búsqueda con debounce para mejor UX
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
import { TrackGroupingService } from '@/lib/services/trackGrouping.service';
import { debounce } from '@/lib/utils/debounce';

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
  
  // ✅ QUERIES: searchTracks con debounce incluido
  searchTracks: (query: string) => Track[];
  searchTracksDebounced: (query: string, callback: (results: Track[]) => void) => void;
  cancelSearch: () => void; // Cancela búsqueda pendiente
  
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

      // Enriquecer con Last.fm en background (con delay mayor para no bloquear UI)
      if (enrichWithLastFm && scannedTracks.length > 0) {
        setTimeout(() => enrichTracks(scannedTracks), 1000);
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
   * Enriquece tracks con datos de Last.fm en lotes pequeños para no bloquear UI
   */
  async function enrichTracks(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    // Agrupar tracks por letra para identificar la última isla
    const letterGroups = TrackGroupingService.groupByLetter(tracks);
    
    // Obtener la última isla (último grupo)
    const lastIsland = letterGroups[letterGroups.length - 1];
    if (!lastIsland) {
      // Si no hay grupos, enriquecer normalmente en lotes
      await enrichInBatches(tracks);
      await preloadAlbumArt(tracks);
      return;
    }

    const [lastLetter, lastIslandTracks] = lastIsland;
    
    // Tomar los primeros 10 tracks de la última isla para precarga prioritaria
    const preloadTracks = lastIslandTracks.slice(0, 10);
    
    console.log(`🚀 Precargando ${preloadTracks.length} tracks de la última isla (${lastLetter}) para transición rápida`);
    
    // Enriquecer primero los tracks de la última isla en lotes pequeños
    await enrichInBatches(preloadTracks);
    
    // Luego enriquecer el resto de los tracks
    const remainingTracks = tracks.filter(track => !preloadTracks.includes(track));
    if (remainingTracks.length > 0) {
      await enrichInBatches(remainingTracks);
    }

    // Precargar album art para todos
    await preloadAlbumArt(tracks);
  }

  /**
   * Enriquece tracks en lotes pequeños con delays para no bloquear la UI
   */
  async function enrichInBatches(tracks: Track[]): Promise<void> {
    const batchSize = 5; // Procesar solo 5 tracks a la vez
    const delayBetweenBatches = 100; // 100ms entre lotes

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      // Procesar lote actual
      await EnrichmentService.enrichTracksBatch(batch);
      
      // Si no es el último lote, esperar un poco para no bloquear UI
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
  }

  /**
   * Precarga portadas de álbumes priorizando la última isla
   */
  async function preloadAlbumArt(tracks: Track[]): Promise<void> {
    if (tracks.length === 0) return;

    // Agrupar tracks por letra para identificar la última isla
    const letterGroups = TrackGroupingService.groupByLetter(tracks);
    const lastIsland = letterGroups[letterGroups.length - 1];

    let tracksToPreload: Track[] = [];

    if (lastIsland) {
      const [lastLetter, lastIslandTracks] = lastIsland;
      // Priorizar los primeros 10 tracks de la última isla
      const priorityTracks = lastIslandTracks.slice(0, 10);
      // Luego agregar tracks del resto hasta completar 20
      const remainingSlots = 20 - priorityTracks.length;
      const otherTracks = tracks.filter(track => !priorityTracks.includes(track)).slice(0, remainingSlots);
      tracksToPreload = [...priorityTracks, ...otherTracks];
    } else {
      tracksToPreload = tracks.slice(0, 20);
    }

    console.log(`🎨 Precargando ${tracksToPreload.length} portadas de álbum (priorizando última isla)...`);

    const batchSize = 3;

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
   * ✅ OPTIMIZACIÓN: Mejor memory leak prevention
   */
  function cleanup(): void {
    console.log('🧹 Limpiando listeners de biblioteca...');
    
    // Cancelar búsquedas pendientes
    if (_instance) {
      // @ts-ignore
      _instance.searchTracksDebounced.cancel();
    }
    
    // Cleanup de event listeners
    unlistenScanStart?.();
    unlistenScanProgress?.();
    unlistenScanComplete?.();
    
    // Nullificar referencias para ayudar al GC
    unlistenScanStart = null;
    unlistenScanProgress = null;
    unlistenScanComplete = null;
    
    console.log('✅ useLibrary limpiado');
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
    
    // ✅ NUEVO: Búsqueda con debounce (300ms) para mejor UX
    searchTracksDebounced: debounce((query: string, callback: (results: Track[]) => void) => {
      const results = libraryStore.searchTracks(query);
      callback(results);
    }, 300),
    
    // ✅ NUEVO: Cancelar búsqueda debounced pendiente
    cancelSearch: () => {
      // @ts-ignore - La función debounced tiene método cancel
      _instance?.searchTracksDebounced.cancel();
    },
    
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

