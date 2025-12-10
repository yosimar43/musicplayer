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

export { useLibrary } from './useLibrary.svelte';

export { usePlayer } from './usePlayer.svelte';

export { useMasterHook } from './useMasterHook.svelte';
export type { MasterHookReturn } from './useMasterHook.svelte';

export { usePersistedState } from './usePersistedState.svelte';

export { useUI } from './useUI.svelte';

export { usePlayerUI } from './usePlayerUI.svelte';

// Re-exportar stores para conveniencia
export {
  playerStore,
  libraryStore,
  musicDataStore,
  enrichmentStore,
  uiStore,
  type Track,
  type EnrichmentStore,
  type EnrichmentProgress,
  type MusicDataStore
} from '@/lib/stores';