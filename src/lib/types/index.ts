/**
 * Tipos centralizados de la aplicación
 * Este archivo consolida todos los tipos para mejor control y mantenibilidad
 */

// Tipos base de música
export type { MusicFile, Track } from './music';

// Tipos de Spotify
export type { SpotifyTrack, SpotifyPlaylist, SpotifyArtist } from '@/lib/utils/tauriCommands';

// Tipos extendidos para hooks
export type { SpotifyTrackWithDownload } from '@/lib/hooks/useSpotifyTracks.svelte';
export type { DownloadProgress, DownloadStats } from '@/lib/hooks/useDownload.svelte';
export type { SpotifyUserProfile } from '@/lib/hooks/useSpotifyAuth.svelte';

// Tipos de Last.fm
export type {
  LastFmImage,
  LastFmTag,
  LastFmArtistInfo,
  LastFmAlbumInfo,
  LastFmTrackInfo,
  LastFmError,
  ProcessedArtistInfo,
  ProcessedAlbumInfo,
  ProcessedTrackInfo
} from './lastfm';

// Re-exportar tipos de estado para conveniencia
export type { RepeatMode } from '@/lib/stores/player.store.svelte';
export type { Theme, ViewMode } from '@/lib/stores/ui.store.svelte';
