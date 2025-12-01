/**
 * 🔥 Wrapper organizado de todos los comandos Tauri
 * Centraliza todos los invokes con tipos TypeScript y manejo de errores consistente
 */

import { invoke } from '@tauri-apps/api/core';
import type { MusicFile } from '@/lib/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface SpotifyUser {
  id: string;
  displayName: string | null;
  email: string | null;
  country: string | null;
  product: string | null;
  followers: number;
  images: string[];
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: string[];
  album: string;
  albumImage: string | null;
  durationMs: number;
  popularity: number | null;
  previewUrl: string | null;
  externalUrl: string | null;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  owner: string;
  tracksTotal: number;
  images: string[];
  public: boolean | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  images: string[];
  externalUrl: string | null;
}

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

// ============================================================================
// WRAPPER DE COMANDOS TAURI
// ============================================================================

export const TauriCommands = {
  // ========================================================================
  // 🎵 COMANDOS DE ARCHIVOS LOCALES
  // ========================================================================

  /**
   * Escanea una carpeta de música y retorna metadata de archivos de audio
   */
  async scanMusicFolder(folderPath: string): Promise<MusicFile[]> {
    try {
      return await invoke<MusicFile[]>('scan_music_folder', { folderPath });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error escaneando carpeta:', errorMsg);
      throw new Error(`Error escaneando carpeta: ${errorMsg}`);
    }
  },

  /**
   * Obtiene metadata de un archivo de audio específico
   */
  async getAudioMetadata(filePath: string): Promise<MusicFile> {
    try {
      return await invoke<MusicFile>('get_audio_metadata', { filePath });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo metadata:', errorMsg);
      throw new Error(`Error obteniendo metadata: ${errorMsg}`);
    }
  },

  /**
   * Obtiene la carpeta de música por defecto del sistema
   */
  async getDefaultMusicFolder(): Promise<string> {
    try {
      return await invoke<string>('get_default_music_folder_cmd');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo carpeta predeterminada:', errorMsg);
      throw new Error(`No se pudo obtener la carpeta de música: ${errorMsg}`);
    }
  },

  // ========================================================================
  // 🔐 COMANDOS DE AUTENTICACIÓN SPOTIFY
  // ========================================================================

  /**
   * Inicia el flujo de autenticación OAuth con Spotify
   */
  async authenticateSpotify(): Promise<string> {
    try {
      return await invoke<string>('spotify_authenticate');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error de autenticación:', errorMsg);
      throw new Error(`Error de autenticación: ${errorMsg}`);
    }
  },

  /**
   * Verifica si el usuario está autenticado con Spotify
   */
  async checkSpotifyAuth(): Promise<boolean> {
    try {
      return await invoke<boolean>('spotify_is_authenticated');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error verificando autenticación:', errorMsg);
      return false;
    }
  },

  /**
   * Cierra sesión de Spotify
   */
  async logoutSpotify(): Promise<void> {
    try {
      await invoke('spotify_logout');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error cerrando sesión:', errorMsg);
      throw new Error(`Error cerrando sesión: ${errorMsg}`);
    }
  },

  // ========================================================================
  // 📊 COMANDOS DE DATOS SPOTIFY
  // ========================================================================

  /**
   * Obtiene el perfil del usuario autenticado
   */
  async getSpotifyProfile(): Promise<SpotifyUser> {
    try {
      return await invoke<SpotifyUser>('spotify_get_profile');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo perfil:', errorMsg);
      throw new Error(`Error obteniendo perfil: ${errorMsg}`);
    }
  },

  /**
   * Obtiene canciones guardadas con paginación (limit: 1-50, offset: 0, 50, 100...)
   * Los parámetros son opcionales en Rust, así que los pasamos como opcionales
   */
  async getSavedTracks(limit?: number, offset?: number): Promise<SpotifyTrack[]> {
    try {
      return await invoke<SpotifyTrack[]>('spotify_get_saved_tracks', { 
        limit: limit ?? undefined, 
        offset: offset ?? undefined 
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo canciones guardadas:', errorMsg);
      throw new Error(`Error obteniendo canciones guardadas: ${errorMsg}`);
    }
  },

  /**
   * 🔥 Inicia streaming progresivo de todas las canciones guardadas
   * Emite eventos 'spotify-tracks-batch' con batches de 50 tracks
   */
  async streamAllLikedSongs(): Promise<void> {
    try {
      await invoke('spotify_stream_all_liked_songs');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error iniciando streaming:', errorMsg);
      throw new Error(`Error iniciando streaming: ${errorMsg}`);
    }
  },

  /**
   * Obtiene las playlists del usuario con paginación
   * El parámetro limit es opcional en Rust
   */
  async getPlaylists(limit?: number): Promise<SpotifyPlaylist[]> {
    try {
      return await invoke<SpotifyPlaylist[]>('spotify_get_playlists', { 
        limit: limit ?? undefined 
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo playlists:', errorMsg);
      throw new Error(`Error obteniendo playlists: ${errorMsg}`);
    }
  },

  /**
   * Obtiene las canciones de una playlist específica
   * Los parámetros limit y offset son opcionales en Rust
   */
  async getPlaylistTracks(
    playlistId: string,
    limit?: number,
    offset?: number
  ): Promise<SpotifyTrack[]> {
    try {
      return await invoke<SpotifyTrack[]>('spotify_get_playlist_tracks', {
        playlistId,
        limit: limit ?? undefined,
        offset: offset ?? undefined
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo tracks de playlist:', errorMsg);
      throw new Error(`Error obteniendo tracks de playlist: ${errorMsg}`);
    }
  },

  /**
   * Obtiene los artistas más escuchados del usuario
   * Los parámetros son opcionales en Rust
   */
  async getTopArtists(limit?: number, timeRange?: TimeRange): Promise<SpotifyArtist[]> {
    try {
      return await invoke<SpotifyArtist[]>('spotify_get_top_artists', { 
        limit: limit ?? undefined, 
        timeRange: timeRange ?? undefined 
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo top artistas:', errorMsg);
      throw new Error(`Error obteniendo top artistas: ${errorMsg}`);
    }
  },

  /**
   * Obtiene las canciones más escuchadas del usuario
   * Los parámetros son opcionales en Rust
   */
  async getTopTracks(limit?: number, timeRange?: TimeRange): Promise<SpotifyTrack[]> {
    try {
      return await invoke<SpotifyTrack[]>('spotify_get_top_tracks', { 
        limit: limit ?? undefined, 
        timeRange: timeRange ?? undefined 
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error obteniendo top tracks:', errorMsg);
      throw new Error(`Error obteniendo top tracks: ${errorMsg}`);
    }
  },

  // ========================================================================
  // 📥 COMANDOS DE DESCARGA
  // ========================================================================

  /**
   * Verifica si spotdl está instalado
   */
  async checkSpotdlInstalled(): Promise<boolean> {
    try {
      const version = await invoke<string>('check_spotdl_installed');
      return Boolean(version);
    } catch (error) {
      console.warn('⚠️ spotdl no está instalado');
      return false;
    }
  },

  /**
   * Descarga una sola canción de Spotify
   */
  async downloadTrack(track: SpotifyTrack): Promise<void> {
    if (!track.externalUrl) {
      throw new Error('Track sin URL de Spotify');
    }

    if (!track.externalUrl.startsWith('https://open.spotify.com/track/')) {
      throw new Error('URL de Spotify inválida');
    }

    try {
      // Obtener carpeta de música
      const musicFolder = await this.getDefaultMusicFolder();

      await invoke('download_single_spotify_track', {
        url: track.externalUrl,
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3',
        outputDir: musicFolder
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error descargando track:', errorMsg);
      throw new Error(`Error descargando track: ${errorMsg}`);
    }
  },

  /**
   * 🔥 Descarga múltiples tracks de forma segmentada con progreso
   * Emite eventos 'download-progress', 'download-finished', 'download-error'
   */
  async downloadTracksSegmented(
    tracks: SpotifyTrack[],
    segmentSize: number = 10,
    delayBetweenSegments: number = 2
  ): Promise<void> {
    if (tracks.length === 0) {
      throw new Error('No hay canciones para descargar');
    }

    // Extraer URLs válidas
    const urls = tracks
      .filter(t => t.externalUrl && t.externalUrl.startsWith('https://open.spotify.com/track/'))
      .map(t => t.externalUrl!);

    if (urls.length === 0) {
      throw new Error('No hay URLs válidas de Spotify para descargar');
    }

    try {
      // Obtener carpeta de música
      const musicFolder = await this.getDefaultMusicFolder();

      await invoke('download_spotify_tracks_segmented', {
        urls,
        segmentSize: Math.max(1, Math.min(segmentSize, 50)),
        delay: Math.max(2, Math.min(delayBetweenSegments, 10)),
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3',
        outputDir: musicFolder
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ Error en descarga masiva:', errorMsg);
      throw new Error(`Error en descarga masiva: ${errorMsg}`);
    }
  }
};

