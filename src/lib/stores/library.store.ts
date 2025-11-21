/**
 * 🏪 Store reactivo para la biblioteca de música local
 * Con soporte para eventos de progreso de escaneo en tiempo real
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { untrack } from 'svelte';
import { TauriCommands } from '@/lib/utils/tauriCommands';
import type { MusicFile } from '@/lib/types';

const { getDefaultMusicFolder, scanMusicFolder, getAudioMetadata } = TauriCommands;

// Re-exportar MusicFile como Track para compatibilidad
export type Track = MusicFile;

// Interfaces para eventos de progreso
interface LibraryScanStart {
  path: string;
}

interface LibraryScanProgress {
  current: number;
  path: string;
}

interface LibraryScanComplete {
  total: number;
}

export class LibraryStore {
  // Estado reactivo
  tracks = $state<MusicFile[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');

  // Estado de progreso de escaneo
  scanProgress = $state({ current: 0, currentPath: '', isScanning: false });

  // Estadísticas derivadas
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(
    this.tracks.reduce((acc, track) => acc + (track.duration || 0), 0)
  );
  artists = $derived(
    [...new Set(this.tracks.map(t => t.artist).filter(Boolean))] as string[]
  );
  albums = $derived(
    [...new Set(this.tracks.map(t => t.album).filter(Boolean))] as string[]
  );

  // Acciones
  async loadLibrary(folderPath?: string, enrichWithLastFm = true) {
    this.isLoading = true;
    this.error = null;
    this.scanProgress = { current: 0, currentPath: '', isScanning: true };

    let unlistenStart: UnlistenFn | undefined;
    let unlistenProgress: UnlistenFn | undefined;
    let unlistenComplete: UnlistenFn | undefined;

    try {
      // Setup scan progress listeners
      unlistenStart = await listen<LibraryScanStart>('library-scan-start', (event) => {
        console.log('📂 Scan started:', event.payload.path);
        this.scanProgress = { current: 0, currentPath: event.payload.path, isScanning: true };
      });

      unlistenProgress = await listen<LibraryScanProgress>('library-scan-progress', (event) => {
        this.scanProgress = {
          current: event.payload.current,
          currentPath: event.payload.path,
          isScanning: true
        };
        console.log(`📥 Scanning: ${event.payload.current} files`);
      });

      unlistenComplete = await listen<LibraryScanComplete>('library-scan-complete', (event) => {
        console.log(`✅ Scan complete: ${event.payload.total} files`);
        this.scanProgress = { current: event.payload.total, currentPath: '', isScanning: false };
      });

      // Obtener carpeta por defecto si no se especifica
      if (!folderPath) {
        folderPath = await getDefaultMusicFolder();
        this.currentFolder = folderPath;
      }

      console.log('🔍 Escaneando directorio:', folderPath);

      // Escanear carpeta via Tauri
      const scannedTracks = await scanMusicFolder(folderPath);

      untrack(() => {
        this.tracks = scannedTracks;
        this.currentFolder = folderPath!;
      });

      console.log('✅ Cargadas', scannedTracks.length, 'canciones');

      // Enriquecer con Last.fm si está habilitado
      if (enrichWithLastFm && scannedTracks.length > 0) {
        await this.enrichTracksWithLastFm(scannedTracks);
      }

      return scannedTracks;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load library';
      console.error('❌ Library load error:', err);
      throw err;
    } finally {
      this.isLoading = false;
      this.scanProgress = { current: 0, currentPath: '', isScanning: false };

      // Cleanup listeners
      unlistenStart?.();
      unlistenProgress?.();
      unlistenComplete?.();
    }
  }

  async reload(enrichWithLastFm = true) {
    if (this.currentFolder) {
      await this.loadLibrary(this.currentFolder, enrichWithLastFm);
    }
  }

  async getTrackMetadata(filePath: string): Promise<MusicFile | null> {
    try {
      return await getAudioMetadata(filePath);
    } catch (err) {
      console.error('❌ Metadata error:', err);
      return null;
    }
  }

  clearLibrary() {
    this.tracks = [];
    this.currentFolder = '';
    this.error = null;
  }

  // Método interno para enriquecimiento (ahora usa el servicio dedicado)
  private async enrichTracksWithLastFm(tracks: MusicFile[]) {
    const { EnrichmentService } = await import('@/lib/services/enrichment.service');
    await EnrichmentService.enrichTracksBatch(tracks);
  }
}

export const libraryStore = new LibraryStore();

// Funciones de búsqueda (mantenidas por compatibilidad)
export function searchTracks(query: string): MusicFile[] {
  const lowerQuery = query.toLowerCase();
  return libraryStore.tracks.filter(track =>
    track.title?.toLowerCase().includes(lowerQuery) ||
    track.artist?.toLowerCase().includes(lowerQuery) ||
    track.album?.toLowerCase().includes(lowerQuery)
  );
}

export function getTracksByArtist(artist: string): MusicFile[] {
  return libraryStore.tracks.filter(track => track.artist === artist);
}

export function getTracksByAlbum(album: string): MusicFile[] {
  return libraryStore.tracks.filter(track => track.album === album);
}

export function clearLibrary() {
  libraryStore.clearLibrary();
}