/**
 * 🎵 SPOTIFY TRACKS STORE - Estado de Tracks de Spotify
 *
 * PRINCIPIOS:
 * ✅ Solo estado reactivo ($state, $derived)
 * ✅ NO I/O operations directas
 * ✅ NO imports de hooks o servicios
 * ✅ Fácilmente testeable
 *
 * La lógica de carga se maneja en useSpotifyTracks hook
 */

import type { SpotifyTrack } from '@/lib/utils/tauriCommands';

export interface SpotifyTrackWithState extends SpotifyTrack {
  downloadState?: 'idle' | 'downloading' | 'completed' | 'error';
}

class SpotifyTracksStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO REACTIVO
  // ═══════════════════════════════════════════════════════════════════════════

  tracks = $state<SpotifyTrackWithState[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTADORES PUROS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Establece las tracks
   */
  setTracks(tracks: SpotifyTrack[]) {
    this.tracks = tracks.map(track => ({
      ...track,
      downloadState: 'idle' as const
    }));
  }

  /**
   * Establece el estado de carga
   */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /**
   * Establece un error
   */
  setError(error: string | null) {
    this.error = error;
  }

  /**
   * Actualiza el estado de descarga de una track
   */
  updateDownloadState(trackId: string, state: SpotifyTrackWithState['downloadState']) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track) {
      track.downloadState = state;
    }
  }

  /**
   * Resetea el estado
   */
  reset() {
    this.tracks = [];
    this.isLoading = false;
    this.error = null;
  }
}

export const spotifyTracksStore = new SpotifyTracksStore();