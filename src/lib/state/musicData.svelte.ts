/**
 * 🎯 Estado global para datos de Last.fm
 * Cachea las respuestas para evitar peticiones duplicadas
 */

import type { ProcessedArtistInfo, ProcessedAlbumInfo, ProcessedTrackInfo } from '@/lib/types';

interface MusicDataCache {
  artists: Map<string, ProcessedArtistInfo>;
  albums: Map<string, ProcessedAlbumInfo>;
  tracks: Map<string, ProcessedTrackInfo>;
}

class MusicDataState {
  private cache: MusicDataCache = {
    artists: new Map(),
    albums: new Map(),
    tracks: new Map()
  };

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

    // Verificar cache
    if (this.cache.artists.has(key)) {
      console.log('✅ Artista desde cache:', artistName);
      return this.cache.artists.get(key)!;
    }

    // Cargar desde API
    this.loading.artist = true;
    this.errors.artist = null;

    try {
      const { getArtistInfo } = await import('@/lib/api/lastfm');
      const data = await getArtistInfo(artistName);

      if (data) {
        this.cache.artists.set(key, data);
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

    // Verificar cache
    if (this.cache.albums.has(key)) {
      console.log('✅ Álbum desde cache:', albumName);
      return this.cache.albums.get(key)!;
    }

    // Cargar desde API
    this.loading.album = true;
    this.errors.album = null;

    try {
      const { getAlbumInfo } = await import('@/lib/api/lastfm');
      const data = await getAlbumInfo(artistName, albumName);

      if (data) {
        this.cache.albums.set(key, data);
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

    // Verificar cache
    if (this.cache.tracks.has(key)) {
      console.log('✅ Canción desde cache:', trackName);
      return this.cache.tracks.get(key)!;
    }

    // Cargar desde API
    this.loading.track = true;
    this.errors.track = null;

    try {
      const { getTrackInfo } = await import('@/lib/api/lastfm');
      const data = await getTrackInfo(artistName, trackName);

      if (data) {
        this.cache.tracks.set(key, data);
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

  /**
   * Limpia el cache
   */
  clearCache(type?: 'artist' | 'album' | 'track') {
    if (type) {
      this.cache[`${type}s` as keyof MusicDataCache].clear();
      console.log(`🗑️ Cache de ${type} limpiado`);
    } else {
      this.cache.artists.clear();
      this.cache.albums.clear();
      this.cache.tracks.clear();
      console.log('🗑️ Todo el cache limpiado');
    }
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats() {
    return {
      artists: this.cache.artists.size,
      albums: this.cache.albums.size,
      tracks: this.cache.tracks.size,
      total: this.cache.artists.size + this.cache.albums.size + this.cache.tracks.size
    };
  }
}

export const musicData = new MusicDataState();

