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
musicDataStore,
  type EnrichmentStore,
    type Track,
      type EnrichmentProgress,
        type MusicDataStore
} from '@/lib/stores';