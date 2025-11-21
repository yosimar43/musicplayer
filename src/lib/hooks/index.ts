/**
 * Barrel export para todos los hooks
 * Facilita las importaciones en los componentes
 */

export { useSpotifyAuth } from './useSpotifyAuth.svelte';
export type { SpotifyUserProfile } from './useSpotifyAuth.svelte';

export { useSpotifyTracks } from './useSpotifyTracks.svelte';
export type { SpotifyTrack, SpotifyTrackWithDownload } from '@/lib/types';

export { useSpotifyPlaylists } from './useSpotifyPlaylists.svelte';
export type { SpotifyPlaylist } from '@/lib/types';

export { useDownload } from './useDownload.svelte';
export type { DownloadProgress, DownloadStats } from '@/lib/types';

export { useTrackFilters } from './useTrackFilters.svelte';
export type { SortBy, SortOrder, PopularityFilter } from '@/lib/types';

export { createAlbumArtLoader } from './useAlbumArt.svelte';
export type { AlbumArtState } from './useAlbumArt.svelte';

// Hooks de utilidades avanzadas
export { useLibrarySync } from './useLibrarySync.svelte';
export { usePersistedState } from './usePersistedState.svelte';

// Hook de biblioteca local
export { useLibrary } from './useLibrary.svelte';
export type { UseLibraryReturn } from './useLibrary.svelte';

// UI
export { useUI } from './useUI.svelte';
export type { UseUIReturn } from './useUI.svelte';

// Stores reactivos (nueva arquitectura)
export {
  enrichmentStore,
  libraryStore,
  musicDataStore,
  type EnrichmentStore,
  type Track,
  type EnrichmentProgress,
  type MusicDataStore
} from '@/lib/stores';