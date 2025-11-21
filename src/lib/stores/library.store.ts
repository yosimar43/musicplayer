artists = $derived(
  [...new Set(this.tracks.map(t => t.artist).filter(Boolean))] as string[]
);
albums = $derived(
  [...new Set(this.tracks.map(t => t.album).filter(Boolean))] as string[]
);

  // Acciones
  async loadLibrary(folderPath ?: string, enrichWithLastFm = true) {
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

  async getTrackMetadata(filePath: string): Promise < MusicFile | null > {
  try {
    return await getAudioMetadata(filePath);
  } catch(err) {
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