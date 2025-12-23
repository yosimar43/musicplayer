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

import { untrack } from 'svelte';
import type { MusicFile } from '@/lib/types';

export type Track = MusicFile;

class LibraryStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO REACTIVO
  // ═══════════════════════════════════════════════════════════════════════════
  
  tracks = $state<MusicFile[]>([]);
  trackMap = $state<Map<string, MusicFile>>(new Map());
  isLoading = $state(false);
  isInitialLoadComplete = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');
  
  // Virtualización
  visibleStart = $state(0);
  visibleEnd = $state(50);
  
  // Estado de escaneo (para UI de progreso)
  scanProgress = $state({
    current: 0,
    total: 0,
    currentFile: ''
  });

  // Cache de búsqueda memoizada
  searchCache = $state<Map<string, MusicFile[]>>(new Map());
  searchCacheMaxSize = 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DERIVADOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  visibleTracks = $derived(this.tracks.slice(this.visibleStart, this.visibleEnd));
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
    // Ordenar alfabéticamente por título o path
    const sortedTracks = tracks.sort((a, b) => {
      const titleA = (a.title || a.path).toLowerCase();
      const titleB = (b.title || b.path).toLowerCase();
      return titleA.localeCompare(titleB);
    });

    untrack(() => {
      this.tracks = sortedTracks;
      this.trackMap = new Map(sortedTracks.map(t => [t.path, t]));
      this.clearSearchCache(); // Limpiar cache de búsqueda al cambiar tracks
    });
  }

  /**
   * Agrega tracks a la biblioteca (evita duplicados)
   */
  addTracks(newTracks: MusicFile[]) {
    const uniqueTracks = newTracks.filter(
      newTrack => !this.trackMap.has(newTrack.path)
    );
    if (uniqueTracks.length === 0) return;
    
    untrack(() => {
      const combinedTracks = [...this.tracks, ...uniqueTracks];
      // Reordenar alfabéticamente
      combinedTracks.sort((a, b) => {
        const titleA = (a.title || a.path).toLowerCase();
        const titleB = (b.title || b.path).toLowerCase();
        return titleA.localeCompare(titleB);
      });
      
      this.tracks = combinedTracks;
      uniqueTracks.forEach(t => this.trackMap.set(t.path, t));
    });
  }

  /**
   * Actualiza un track específico
   */
  updateTrack(path: string, updates: Partial<MusicFile>) {
    const track = this.trackMap.get(path);
    if (!track) return;
    
    untrack(() => {
      const updatedTrack = { ...track, ...updates };
      this.trackMap.set(path, updatedTrack);
      
      const index = this.tracks.findIndex(t => t.path === path);
      if (index !== -1) {
        this.tracks[index] = updatedTrack;
      }
    });
  }

  /**
   * Elimina un track por path
   */
  removeTrack(path: string) {
    if (!this.trackMap.has(path)) return;
    
    untrack(() => {
      this.trackMap.delete(path);
      this.tracks = this.tracks.filter(t => t.path !== path);
    });
  }

  setVisibleRange(start: number, end: number) {
    untrack(() => {
      this.visibleStart = start;
      this.visibleEnd = end;
    });
  }

  setInitialLoadComplete(complete: boolean) {
    untrack(() => {
      this.isInitialLoadComplete = complete;
    });
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
    untrack(() => {
      this.currentFolder = folder;
    });
  }

  /**
   * Actualiza el progreso de escaneo
   */
  setScanProgress(current: number, total: number, currentFile = '') {
    untrack(() => {
      this.scanProgress = { current, total, currentFile };
    });
  }

  /**
   * Resetea el progreso de escaneo
   */
  resetScanProgress() {
    untrack(() => {
      this.scanProgress = { current: 0, total: 0, currentFile: '' };
    });
  }

  /**
   * Limpia la biblioteca
   */
  clear() {
    untrack(() => {
      this.tracks = [];
      this.currentFolder = '';
      this.error = null;
      this.scanProgress = { current: 0, total: 0, currentFile: '' };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES PURAS (Sin side effects)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca tracks por query con memoización
   * NOTA: La versión debounced está en useLibrary hook
   */
  searchTracks(query: string): MusicFile[] {
    const trimmed = query.trim();
    if (!trimmed) return this.tracks;
    
    // Verificar cache
    if (this.searchCache.has(trimmed)) {
      return this.searchCache.get(trimmed)!;
    }
    
    const lower = trimmed.toLowerCase();
    
    // Filtrar tracks que coinciden
    const matches = this.tracks.filter(t =>
      t.title?.toLowerCase().includes(lower) ||
      t.artist?.toLowerCase().includes(lower) ||
      t.album?.toLowerCase().includes(lower)
    );
    
    // Ordenar por relevancia: título que empieza con query primero, luego contiene, etc.
    const sortedMatches = matches.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      const aArtist = (a.artist || '').toLowerCase();
      const bArtist = (b.artist || '').toLowerCase();
      
      // Puntuación de relevancia
      const getScore = (track: MusicFile) => {
        const title = (track.title || '').toLowerCase();
        const artist = (track.artist || '').toLowerCase();
        const album = (track.album || '').toLowerCase();
        
        let score = 0;
        if (title.startsWith(lower)) score += 100;
        else if (title.includes(lower)) score += 50;
        if (artist.startsWith(lower)) score += 30;
        else if (artist.includes(lower)) score += 15;
        if (album.includes(lower)) score += 10;
        return score;
      };
      
      return getScore(b) - getScore(a); // Mayor score primero
    });

    // Cachear resultado
    this.addToSearchCache(trimmed, sortedMatches);
    
    return sortedMatches;
  }

  /**
   * Agrega resultado de búsqueda al cache con LRU eviction
   */
  private addToSearchCache(query: string, results: MusicFile[]) {
    if (this.searchCache.size >= this.searchCacheMaxSize) {
      // Eliminar entrada más antigua (LRU simple)
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) this.searchCache.delete(firstKey);
    }
    this.searchCache.set(query, results);
  }

  /**
   * Limpia el cache de búsqueda
   */
  clearSearchCache() {
    this.searchCache.clear();
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
    untrack(() => {
      this.tracks = [];
      this.isLoading = false;
      this.error = null;
      this.currentFolder = '';
      this.scanProgress = { current: 0, total: 0, currentFile: '' };
    });
  }
}

export const libraryStore = new LibraryStore();
