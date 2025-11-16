/**
 * Barrel export para todos los hooks
 * Facilita las importaciones en los componentes
 */

export { useSpotifyAuth } from './useSpotifyAuth.svelte';
export type { SpotifyUserProfile } from './useSpotifyAuth.svelte';

export { useSpotifyTracks } from './useSpotifyTracks.svelte';
export type { SpotifyTrack, SpotifyTrackWithDownload } from './useSpotifyTracks.svelte';

export { useSpotifyPlaylists } from './useSpotifyPlaylists.svelte';
export type { SpotifyPlaylist } from './useSpotifyPlaylists.svelte';

export { useDownload } from './useDownload.svelte';
export type { DownloadProgress, DownloadStats } from './useDownload.svelte';

export { useTrackFilters } from './useTrackFilters.svelte';
export type { SortBy, SortOrder, PopularityFilter } from './useTrackFilters.svelte';

export { createAlbumArtLoader } from './useAlbumArt.svelte';
export type { AlbumArtState } from './useAlbumArt.svelte';

// Hooks de utilidades avanzadas
export { useLibrarySync } from './useLibrarySync.svelte';
export { usePersistedState } from './usePersistedState.svelte';
export { useEventBus, EVENTS } from './useEventBus.svelte';

// Hook de biblioteca local
export { useLibrary } from './useLibrary.svelte';
export type { UseLibraryReturn } from './useLibrary.svelte';

// Hook de UI
export { useUI } from './useUI.svelte';
export type { UseUIReturn } from './useUI.svelte';