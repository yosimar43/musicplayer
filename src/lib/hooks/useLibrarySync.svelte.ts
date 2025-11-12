/**
 * Hook para sincronizar automáticamente tracks de Spotify con biblioteca local
 * Observa cambios en library.tracks y actualiza marcas de descarga
 */

import { library } from '@/lib/state/library.svelte';
import type { SpotifyTrack } from './useSpotifyTracks.svelte';

export function useLibrarySync() {
  let syncedTracks = $state<SpotifyTrack[]>([]);
  let lastLibraryHash = $state<string>('');

  /**
   * Sincroniza tracks de Spotify con biblioteca local automáticamente
   * @param spotifyTracks - Array de tracks de Spotify a sincronizar
   * @returns Array de tracks con marcas de descarga actualizadas
   */
  function syncWithLibrary(spotifyTracks: SpotifyTrack[]): SpotifyTrack[] {
    // Generar hash simple de biblioteca para detectar cambios
    const currentHash = `${library.tracks.length}-${library.tracks[0]?.title || ''}`;
    
    // Solo recalcular si la biblioteca cambió
    if (currentHash === lastLibraryHash && syncedTracks.length === spotifyTracks.length) {
      return syncedTracks;
    }

    console.log('🔄 Sincronizando', spotifyTracks.length, 'tracks con biblioteca local');

    const localTracksMap = new Map(
      library.tracks.map(t => [`${t.artist?.toLowerCase()}-${t.title?.toLowerCase()}`, t])
    );

    const updated = spotifyTracks.map(track => {
      const key = `${track.artists[0]?.toLowerCase()}-${track.name.toLowerCase()}`;
      const isDownloaded = localTracksMap.has(key);
      
      return { ...track, isDownloaded };
    });

    syncedTracks = updated;
    lastLibraryHash = currentHash;

    const downloadedCount = updated.filter(t => t.isDownloaded).length;
    console.log('✅ Sincronización completa:', downloadedCount, 'tracks descargados');

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
      const libraryLength = library.tracks.length;
      
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
