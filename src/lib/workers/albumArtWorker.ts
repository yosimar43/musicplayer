/**
 * 🔧 Web Worker para procesamiento de Album Art
 * Corre en thread separado para no bloquear UI
 */

import { cache } from '@/lib/utils/cache';

// Tipos de mensajes que el worker puede recibir
export interface WorkerRequest {
  id: string; // ID único para tracking
  type: 'getAlbumArt';
  payload: {
    artist: string;
    title: string;
    album?: string | null;
    trackPath: string; // Para verificar si el track cambió
  };
}

// Tipos de respuestas que el worker puede enviar
export interface WorkerResponse {
  id: string;
  type: 'success' | 'error';
  payload: {
    albumArt?: string | null;
    trackPath: string;
    error?: string;
  };
}

// Cache interno del worker (separado del main thread)
const workerCache = new Map<string, string | null>();

// ✅ API Key global que se configurará desde el main thread
let API_KEY = '';

/**
 * Genera clave de cache
 */
function getCacheKey(artist: string, title: string, album?: string | null): string {
  const parts = [artist, title];
  if (album) parts.push(album);
  return parts.map(p => p.toLowerCase().trim()).join('::');
}

/**
 * Obtiene la mejor imagen de un array de imágenes de Last.fm
 */
function getBestImage(images: { '#text': string; size: string }[]): string | null {
  if (!images || images.length === 0) return null;
  
  const sizeOrder = ['mega', 'extralarge', 'large', 'medium', 'small'];
  
  for (const size of sizeOrder) {
    const image = images.find(img => img.size === size);
    if (image && image['#text']) {
      return image['#text'];
    }
  }
  
  const anyImage = images.find(img => img['#text']);
  return anyImage ? anyImage['#text'] : null;
}

/**
 * Fetch a Last.fm API
 */
async function lastfmFetch<T>(params: Record<string, string>): Promise<T> {
  const API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
  
  if (!API_KEY) {
    throw new Error('API Key not configured in worker');
  }
  
  const url = new URL(API_BASE_URL);
  url.searchParams.append('api_key', API_KEY);
  url.searchParams.append('format', 'json');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if ('error' in data) {
    throw new Error(`Last.fm error ${data.error}: ${data.message}`);
  }
  
  return data;
}

/**
 * Obtiene album art de Last.fm con cascada (track → album → artist)
 */
async function fetchAlbumArt(artist: string, title: string, album?: string | null): Promise<string | null> {
  const cacheKey = getCacheKey(artist, title, album);
  
  // Verificar cache del worker
  if (workerCache.has(cacheKey)) {
    return workerCache.get(cacheKey)!;
  }
  
  try {
    // 1. Intentar obtener de track
    try {
      const trackData = await lastfmFetch<any>({
        method: 'track.getinfo',
        artist,
        track: title
      });
      
      if (trackData?.track?.album?.image) {
        const image = getBestImage(trackData.track.album.image);
        if (image) {
          workerCache.set(cacheKey, image);
          return image;
        }
      }
    } catch (err) {
      console.log('Track info not found, trying album...');
    }
    
    // 2. Intentar obtener de álbum (si existe)
    if (album) {
      try {
        const albumData = await lastfmFetch<any>({
          method: 'album.getinfo',
          artist,
          album
        });
        
        if (albumData?.album?.image) {
          const image = getBestImage(albumData.album.image);
          if (image) {
            workerCache.set(cacheKey, image);
            return image;
          }
        }
      } catch (err) {
        console.log('Album info not found, trying artist...');
      }
    }
    
    // 3. Fallback a imagen del artista
    try {
      const artistData = await lastfmFetch<any>({
        method: 'artist.getinfo',
        artist
      });
      
      if (artistData?.artist?.image) {
        const image = getBestImage(artistData.artist.image);
        if (image) {
          workerCache.set(cacheKey, image);
          return image;
        }
      }
    } catch (err) {
      console.log('Artist info not found');
    }
    
    // Sin resultado
    workerCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error('Error fetching album art:', error);
    workerCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Handler de mensajes del main thread
 */
self.addEventListener('message', async (event: MessageEvent<WorkerRequest | { type: 'config'; apiKey: string }>) => {
  const { type } = event.data;
  
  // Configurar API key
  if (type === 'config') {
    API_KEY = event.data.apiKey;
    console.log('✅ API Key configured in worker');
    return;
  }
  
  // Procesar petición de album art
  if (type === 'getAlbumArt') {
    const { id, payload } = event.data as WorkerRequest;
    
    try {
      const { artist, title, album, trackPath } = payload;
      
      const albumArt = await fetchAlbumArt(artist, title, album);
      
      const response: WorkerResponse = {
        id,
        type: 'success',
        payload: {
          albumArt,
          trackPath
        }
      };
      
      self.postMessage(response);
    } catch (error) {
      const response: WorkerResponse = {
        id: (event.data as WorkerRequest).id,
        type: 'error',
        payload: {
          trackPath: (event.data as WorkerRequest).payload.trackPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      self.postMessage(response);
    }
  }
});

console.log('🔧 Album Art Worker initialized');
