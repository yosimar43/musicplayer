import { untrack } from 'svelte';
import { TauriCommands } from '@/lib/utils/tauriCommands';
import type { MusicFile } from '@/lib/types/music';

// Re-exportar MusicFile como Track para compatibilidad
export type Track = MusicFile;

class LibraryState {
  tracks = $state<MusicFile[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');

  // Estadísticas derivadas
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(
    this.tracks.reduce((acc, track) => acc + (track.duration || 0), 0)
  );
  artists = $derived(
    [...new Set(this.tracks.map(t => t.artist).filter(Boolean))]
  );
  albums = $derived(
    [...new Set(this.tracks.map(t => t.album).filter(Boolean))]
  );

  /**
   * 🔥 Carga la biblioteca con integración Tauri
   */
  async loadLibrary(folderPath?: string) {
    this.isLoading = true;
    this.error = null;

    try {
      // Obtener carpeta por defecto si no se especifica
      if (!folderPath) {
        folderPath = await TauriCommands.getDefaultMusicFolder();
        this.currentFolder = folderPath;
      }

      console.log('🔍 Escaneando directorio:', folderPath);

      // Escanear carpeta via Tauri
      const scannedTracks = await TauriCommands.scanMusicFolder(folderPath);

      untrack(() => {
        this.tracks = scannedTracks;
        this.currentFolder = folderPath!;
      });

      console.log('✅ Cargadas', scannedTracks.length, 'canciones');
      return scannedTracks;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load library';
      console.error('❌ Library load error:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Recargar biblioteca actual
   */
  async reload() {
    if (this.currentFolder) {
      await this.loadLibrary(this.currentFolder);
    }
  }

  /**
   * Obtener metadata específica
   */
  async getTrackMetadata(filePath: string): Promise<MusicFile | null> {
    try {
      return await TauriCommands.getAudioMetadata(filePath);
    } catch (err) {
      console.error('❌ Metadata error:', err);
      return null;
    }
  }
}

export const library = new LibraryState();

/**
 * Busca tracks por título, artista o álbum
 */
export function searchTracks(query: string): MusicFile[] {
  const lowerQuery = query.toLowerCase();
  return library.tracks.filter(track => 
    track.title?.toLowerCase().includes(lowerQuery) ||
    track.artist?.toLowerCase().includes(lowerQuery) ||
    track.album?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filtra tracks por artista
 */
export function getTracksByArtist(artist: string): MusicFile[] {
  return library.tracks.filter(track => track.artist === artist);
}

/**
 * Filtra tracks por álbum
 */
export function getTracksByAlbum(album: string): MusicFile[] {
  return library.tracks.filter(track => track.album === album);
}

/**
 * Limpia la biblioteca
 */
export function clearLibrary() {
  library.tracks = [];
  library.currentFolder = '';
  library.error = null;
}
