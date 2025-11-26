import { musicDataStore } from '@/lib/stores/musicData.store.svelte';

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

  // Track para evitar cargas duplicadas
  let lastKey = $state('');

  $effect(() => {
    if (!artist || !title) {
      state.isLoading = false;
      return;
    }

    // Crear una clave única para esta combinación de artista/título/álbum
    const currentKey = `${artist}|${title}|${album || ''}`;

    // Solo cargar si realmente cambió
    if (currentKey === lastKey) {
      return;
    }

    lastKey = currentKey;
    state.isLoading = true;
    state.hasError = false;
    state.url = null;

    // Intentar cargar desde track primero
    musicDataStore.getTrack(artist, title)
      .then(data => {
        // Verificar que aún es la misma canción antes de actualizar
        if (lastKey !== currentKey) return;

        if (data?.image) {
          state.url = data.image;
          state.isLoading = false;
        } else if (album) {
          // Si no hay imagen del track, intentar con el álbum
          return musicDataStore.getAlbum(artist, album);
        } else {
          state.isLoading = false;
        }
      })
      .then(albumData => {
        // Verificar que aún es la misma canción antes de actualizar
        if (lastKey !== currentKey) return;

        if (albumData?.image && !state.url) {
          state.url = albumData.image;
          state.isLoading = false;
        } else if (!state.url) {
          // Si no hay imagen de álbum, intentar con el artista
          return musicDataStore.getArtist(artist);
        } else {
          state.isLoading = false;
        }
      })
      .then(artistData => {
        // Verificar que aún es la misma canción antes de actualizar
        if (lastKey !== currentKey) return;

        if (artistData?.image && !state.url) {
          state.url = artistData.image;
        }
        state.isLoading = false;
      })
      .catch(() => {
        if (lastKey !== currentKey) return;
        state.isLoading = false;
        state.hasError = true;
      });
  });

  return state;
}
