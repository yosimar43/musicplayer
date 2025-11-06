import { musicData } from '@/lib/stores/musicData.svelte';

export interface AlbumArtState {
  url: string | null;
  isLoading: boolean;
  hasError: boolean;
}

export function createAlbumArtLoader(artist: string | null, title: string | null, album?: string | null) {
  let state = $state<AlbumArtState>({
    url: null,
    isLoading: true,
    hasError: false
  });

  $effect(() => {
    if (!artist || !title) {
      state.isLoading = false;
      return;
    }

    state.isLoading = true;
    state.hasError = false;
    state.url = null;

    // Intentar cargar desde track primero
    musicData.getTrack(artist, title)
      .then(data => {
        if (data?.image) {
          state.url = data.image;
          state.isLoading = false;
        } else if (album) {
          // Si no hay imagen del track, intentar con el álbum
          return musicData.getAlbum(artist, album);
        } else {
          state.isLoading = false;
        }
      })
      .then(albumData => {
        if (albumData?.image && !state.url) {
          state.url = albumData.image;
        }
        state.isLoading = false;
      })
      .catch(() => {
        state.isLoading = false;
        state.hasError = true;
      });
  });

  return state;
}
