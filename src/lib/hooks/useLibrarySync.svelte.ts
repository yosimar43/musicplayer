/**
 * Hook para sincronizar automáticamente tracks de Spotify con biblioteca local
 * Observa cambios en library.tracks y actualiza marcas de descarga
 */

import { libraryStore } from '@/lib/stores/library.store';
import type { SpotifyTrack } from '@/lib/utils/tauriCommands';

export function useLibrarySync() {
  let syncedTracks = $state<SpotifyTrack[]>([]);
  let lastLibraryHash = $state<string>('');
  let localTracksMapCache = $state<Map<string, boolean> | null>(null);

  /**
   * Construye un mapa optimizado de tracks locales para búsqueda rápida
   * Se cachea y solo se reconstruye cuando la biblioteca cambia
   */
  function buildLocalTracksMap(): Map<string, boolean> {
    const currentHash = `${libraryStore.tracks.length}-${libraryStore.tracks[0]?.title || ''}`;
    
    // Si el hash no cambió y tenemos cache, reutilizarlo
    if (currentHash === lastLibraryHash && localTracksMapCache) {
      return localTracksMapCache;
    }

    // Construir nuevo mapa
    const map = new Map<string, boolean>();
    
    for (const track of libraryStore.tracks) {
      if (track.artist && track.title) {
        // Normalizar para comparación (lowercase, trim)
        const key = `${track.artist.toLowerCase().trim()}-${track.title.toLowerCase().trim()}`;
        map.set(key, true);
      }
    }

    // Actualizar cache
    localTracksMapCache = map;
    lastLibraryHash = currentHash;

    return map;
  }

  /**
   * Sincroniza tracks de Spotify con biblioteca local automáticamente
   * Optimizado para mejor rendimiento con bibliotecas grandes
   * @param spotifyTracks - Array de tracks de Spotify a sincronizar
   * @returns Array de tracks con marcas de descarga actualizadas
   */
  function syncWithLibrary(spotifyTracks: SpotifyTrack[]): SpotifyTrack[] {
    // Si no hay tracks de Spotify, retornar vacío
    if (spotifyTracks.length === 0) {
      return [];
    }

    // Si no hay biblioteca local, marcar todos como no descargados
    if (libraryStore.tracks.length === 0) {
      return spotifyTracks.map(track => ({ ...track, isDownloaded: false }));
    }

    // Construir mapa de tracks locales (con cache)
    const localTracksMap = buildLocalTracksMap();

    // Sincronizar tracks
    const updated = spotifyTracks.map(track => {
      // Usar el primer artista si hay múltiples
      const artist = track.artists[0]?.toLowerCase().trim() || '';
      const title = track.name.toLowerCase().trim();
      const key = `${artist}-${title}`;
      
      const isDownloaded = localTracksMap.has(key);
      return { ...track, isDownloaded };
    });

    // Actualizar cache de tracks sincronizados
    syncedTracks = updated;

    const downloadedCount = updated.filter(t => t.isDownloaded).length;
    if (downloadedCount > 0 || spotifyTracks.length > 100) {
      console.log(`✅ Sincronización: ${downloadedCount}/${spotifyTracks.length} tracks descargados`);
    }

    return updated;
  }

  /**
   * $effect que observa cambios en library y fuerza re-sincronización
   * Usar en componentes que necesitan sincronización automática
   */
  function setupAutoSync(
    getTracks: () => SpotifyTrack[],
    onSync: (tracks: SpotifyTrack[]) => void
  ) {
    $effect(() => {
      // Observar cambios en library.tracks
      const libraryLength = libraryStore.tracks.length;
      
      if (libraryLength > 0) {
        const currentTracks = getTracks();
        if (currentTracks.length > 0) {
          const synced = syncWithLibrary(currentTracks);
          onSync(synced);
        }
      }
    });
  }

  return {
    syncWithLibrary,
    setupAutoSync,
    get isSynced() { return syncedTracks.length > 0; }
  };
}
