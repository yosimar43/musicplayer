import { untrack } from 'svelte';
import { TauriCommands } from '@/lib/utils/tauriCommands';
import type { MusicFile } from '@/lib/types';

const { getDefaultMusicFolder, scanMusicFolder, getAudioMetadata } = TauriCommands;

export type Track = MusicFile;

export class LibraryStore {
  tracks = $state<MusicFile[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');

  // Derived
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(this.tracks.reduce((acc, t) => acc + (t.duration || 0), 0));
  artists = $derived([...new Set(this.tracks.map(t => t.artist).filter(Boolean))] as string[]);
  albums = $derived([...new Set(this.tracks.map(t => t.album).filter(Boolean))] as string[]);

  constructor() {
    // Cargar persistencia inicial
    if (typeof localStorage !== 'undefined') {
      this.currentFolder = localStorage.getItem('library-last-folder') || '';
    }
  }

  async loadLibrary(folderPath?: string, enrichWithLastFm = true) {
    this.isLoading = true;
    this.error = null;

    try {
      if (!folderPath) {
        folderPath = this.currentFolder || await getDefaultMusicFolder();
      }

      console.log('🔍 Escaneando:', folderPath);
      const scannedTracks = await scanMusicFolder(folderPath);

      untrack(() => {
        this.tracks = scannedTracks;
        this.currentFolder = folderPath!;
      });

      // Persistir
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('library-last-folder', folderPath);
      }

      if (enrichWithLastFm && scannedTracks.length > 0) {
        await this.enrichTracksWithLastFm(scannedTracks);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Error loading library';
      console.error(err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async reload(enrichWithLastFm = true) {
    if (this.currentFolder) await this.loadLibrary(this.currentFolder, enrichWithLastFm);
  }

  clearLibrary() {
    this.tracks = [];
    this.currentFolder = '';
    this.error = null;
  }

  // Búsquedas (Ahora métodos)
  searchTracks(query: string): MusicFile[] {
    const lower = query.toLowerCase();
    return this.tracks.filter(t =>
      t.title?.toLowerCase().includes(lower) ||
      t.artist?.toLowerCase().includes(lower) ||
      t.album?.toLowerCase().includes(lower)
    );
  }

  getTracksByArtist(artist: string) { return this.tracks.filter(t => t.artist === artist); }
  getTracksByAlbum(album: string) { return this.tracks.filter(t => t.album === album); }

  async getTrackMetadata(path: string) {
    try { return await getAudioMetadata(path); }
    catch { return null; }
  }

  private async enrichTracksWithLastFm(tracks: MusicFile[]) {
    const { EnrichmentService } = await import('@/lib/services/enrichment.service');
    await EnrichmentService.enrichTracksBatch(tracks);
  }
}

export const libraryStore = new LibraryStore();
