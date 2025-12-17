/**
 * 🏪 Store reactivo para datos de Last.fm
 * Reemplaza musicData.svelte.ts con estado reactivo tipado
 * Ahora utiliza el caché global persistente
 */

import type { ProcessedArtistInfo, ProcessedAlbumInfo, ProcessedTrackInfo } from '@/lib/types';
import { cache } from '@/lib/utils/cache';

export class MusicDataStore {
  // Estado de carga
  loading = $state({
    artist: false,
    album: false,
    track: false
  });

  // Errores
  errors = $state({
    artist: null as string | null,
    album: null as string | null,
    track: null as string | null
  });

  // Estadísticas del cache (delegadas al cache global)
  cacheStats = $derived(cache.getStats());

  /**
   * Genera una clave única para el cache
   */
  private getCacheKey(type: 'artist' | 'album' | 'track', ...params: string[]): string {
    return params.map(p => p.toLowerCase().trim()).join('::');
  }

  /**
   * Obtiene info de artista (con cache)
   */
  async getArtist(artistName: string): Promise<ProcessedArtistInfo | null> {
    const key = this.getCacheKey('artist', artistName);

    // Verificar cache global
    if (cache.has(key)) {
      // console.log('✅ Artista desde cache:', artistName);
      return cache.get<ProcessedArtistInfo>(key);
    }

    // Cargar desde API
    this.loading.artist = true;
    this.errors.artist = null;

    try {
      const { TauriCommands } = await import('@/lib/utils/tauriCommands');
      const data = await TauriCommands.getLastFmArtistInfo(artistName);


      if (data) {
        cache.set(key, data);
        console.log('📥 Artista cargado desde Last.fm:', artistName);
      }

      return data;
    } catch (error) {
      this.errors.artist = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error cargando artista:', error);
      return null;
    } finally {
      this.loading.artist = false;
    }
  }

  /**
   * Obtiene info de álbum (con cache)
   */
  async getAlbum(artistName: string, albumName: string): Promise<ProcessedAlbumInfo | null> {
    const key = this.getCacheKey('album', artistName, albumName);

    // Verificar cache global
    if (cache.has(key)) {
      // console.log('✅ Álbum desde cache:', albumName);
      return cache.get<ProcessedAlbumInfo>(key);
    }

    // Cargar desde API
    this.loading.album = true;
    this.errors.album = null;

    try {
      const { TauriCommands } = await import('@/lib/utils/tauriCommands');
      const data = await TauriCommands.getLastFmAlbumInfo(artistName, albumName);


      if (data) {
        cache.set(key, data);
        console.log('📥 Álbum cargado desde Last.fm:', albumName);
      }

      return data;
    } catch (error) {
      this.errors.album = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error cargando álbum:', error);
      return null;
    } finally {
      this.loading.album = false;
    }
  }

  /**
   * Obtiene info de canción (con cache)
   */
  async getTrack(artistName: string, trackName: string): Promise<ProcessedTrackInfo | null> {
    const key = this.getCacheKey('track', artistName, trackName);

    // Verificar cache global
    if (cache.has(key)) {
      // console.log('✅ Canción desde cache:', trackName);
      return cache.get<ProcessedTrackInfo>(key);
    }

    // Cargar desde API
    this.loading.track = true;
    this.errors.track = null;

    try {
      const { TauriCommands } = await import('@/lib/utils/tauriCommands');
      const data = await TauriCommands.getLastFmTrackInfo(artistName, trackName);


      if (data) {
        cache.set(key, data);
        console.log('📥 Canción cargada desde Last.fm:', trackName);
      }

      return data;
    } catch (error) {
      this.errors.track = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error cargando canción:', error);
      return null;
    } finally {
      this.loading.track = false;
    }
  }

  getCacheStats() {
    return cache.getStats();
  }
}

export const musicDataStore = new MusicDataStore();
