/**
 * 🎯 LIBRARY STORE - Estado Puro
 * 
 * PRINCIPIOS:
 * ✅ Solo estado reactivo ($state, $derived)
 * ✅ Métodos puros (sin side effects)
 * ✅ SIN TauriCommands (eso va en el hook)
 * ✅ SIN localStorage (eso va en el hook)
 * ✅ Fácilmente testeable
 * 
 * La carga de biblioteca se maneja en useLibrary hook
 */

import type { MusicFile } from '@/lib/types';

export type Track = MusicFile;

class LibraryStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO REACTIVO
  // ═══════════════════════════════════════════════════════════════════════════
  
  tracks = $state<MusicFile[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');
  
  // Estado de escaneo (para UI de progreso)
  scanProgress = $state({
    current: 0,
    total: 0,
    currentFile: ''
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DERIVADOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(this.tracks.reduce((acc, t) => acc + (t.duration || 0), 0));
  artists = $derived([...new Set(this.tracks.map(t => t.artist).filter(Boolean))] as string[]);
  albums = $derived([...new Set(this.tracks.map(t => t.album).filter(Boolean))] as string[]);
  genres = $derived([...new Set(this.tracks.map(t => t.genre).filter(Boolean))] as string[]);
  
  isScanning = $derived(this.scanProgress.current > 0 && this.scanProgress.current < this.scanProgress.total);
  scanPercentage = $derived(
    this.scanProgress.total > 0 
      ? Math.round((this.scanProgress.current / this.scanProgress.total) * 100) 
      : 0
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTADORES PUROS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Establece los tracks de la biblioteca
   */
  setTracks(tracks: MusicFile[]) {
    this.tracks = tracks;
  }

  /**
   * Agrega tracks a la biblioteca (evita duplicados)
   */
  addTracks(newTracks: MusicFile[]) {
    const uniqueTracks = newTracks.filter(
      newTrack => !this.tracks.some(t => t.path === newTrack.path)
    );
    if (uniqueTracks.length > 0) {
      this.tracks = [...this.tracks, ...uniqueTracks];
    }
  }

  /**
   * Actualiza un track específico
   */
  updateTrack(path: string, updates: Partial<MusicFile>) {
    const index = this.tracks.findIndex(t => t.path === path);
    if (index !== -1) {
      this.tracks = this.tracks.map((t, i) => 
        i === index ? { ...t, ...updates } : t
      );
    }
  }

  /**
   * Elimina un track por path
   */
  removeTrack(path: string) {
    this.tracks = this.tracks.filter(t => t.path !== path);
  }

  /**
   * Establece el estado de carga
   */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /**
   * Establece error
   */
  setError(error: string | null) {
    this.error = error;
  }

  /**
   * Establece la carpeta actual
   */
  setCurrentFolder(folder: string) {
    this.currentFolder = folder;
  }

  /**
   * Actualiza el progreso de escaneo
   */
  setScanProgress(current: number, total: number, currentFile = '') {
    this.scanProgress = { current, total, currentFile };
  }

  /**
   * Resetea el progreso de escaneo
   */
  resetScanProgress() {
    this.scanProgress = { current: 0, total: 0, currentFile: '' };
  }

  /**
   * Limpia la biblioteca
   */
  clear() {
    this.tracks = [];
    this.currentFolder = '';
    this.error = null;
    this.resetScanProgress();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES PURAS (Sin side effects)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca tracks por query
   */
  searchTracks(query: string): MusicFile[] {
    if (!query.trim()) return this.tracks;
    
    const lower = query.toLowerCase();
    return this.tracks.filter(t =>
      t.title?.toLowerCase().includes(lower) ||
      t.artist?.toLowerCase().includes(lower) ||
      t.album?.toLowerCase().includes(lower)
    );
  }

  /**
   * Filtra tracks por artista
   */
  getTracksByArtist(artist: string): MusicFile[] {
    return this.tracks.filter(t => t.artist === artist);
  }

  /**
   * Filtra tracks por álbum
   */
  getTracksByAlbum(album: string): MusicFile[] {
    return this.tracks.filter(t => t.album === album);
  }

  /**
   * Filtra tracks por género
   */
  getTracksByGenre(genre: string): MusicFile[] {
    return this.tracks.filter(t => t.genre === genre);
  }

  /**
   * Obtiene un track por path
   */
  getTrackByPath(path: string): MusicFile | undefined {
    return this.tracks.find(t => t.path === path);
  }

  /**
   * Reset completo del store
   */
  reset() {
    this.tracks = [];
    this.isLoading = false;
    this.error = null;
    this.currentFolder = '';
    this.resetScanProgress();
  }
}

export const libraryStore = new LibraryStore();
