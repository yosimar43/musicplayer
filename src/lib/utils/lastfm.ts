/**
 * Cliente de API de Last.fm
 * Maneja todas las peticiones a la API de Last.fm con caché
 */

import type {
  LastFmArtistInfo,
  LastFmAlbumInfo,
  LastFmTrackInfo,
  LastFmError,
  ProcessedArtistInfo,
  ProcessedAlbumInfo,
  ProcessedTrackInfo
} from '@/lib/types/lastfm';
import { cache } from '@/lib/utils/cache';

const API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

if (!API_KEY) {
  console.error('⚠️ Last.fm API Key no encontrada. Agrega VITE_LASTFM_API_KEY a tu archivo .env');
}

/**
 * Realiza una petición a la API de Last.fm
 */
async function lastfmFetch<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE_URL);
  
  // Parámetros comunes
  url.searchParams.append('api_key', API_KEY);
  url.searchParams.append('format', 'json');
  
  // Parámetros personalizados
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verificar si hay error de Last.fm
    if ('error' in data) {
      const error = data as LastFmError;
      throw new Error(`Last.fm error ${error.error}: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error en petición Last.fm:', error);
    throw error;
  }
}

/**
 * Extrae la mejor imagen disponible (más grande primero)
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
  
  // Si no hay imagen con tamaño específico, devolver la primera no vacía
  const anyImage = images.find(img => img['#text']);
  return anyImage ? anyImage['#text'] : null;
}

/**
 * Limpia el HTML de las biografías/resúmenes de Last.fm
 */
function cleanHtml(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<a[^>]*>([^<]+)<\/a>/g, '$1') // Eliminar enlaces pero mantener texto
    .replace(/<[^>]+>/g, '') // Eliminar todas las etiquetas HTML
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

/**
 * Obtiene información de un artista (con caché)
 */
export async function getArtistInfo(artistName: string): Promise<ProcessedArtistInfo | null> {
  const cacheKey = `artist:${artistName.toLowerCase()}`;
  
  // Verificar caché
  const cached = cache.get<ProcessedArtistInfo>(cacheKey);
  if (cached) return cached;
  
  try {
    const response = await lastfmFetch<{ artist: LastFmArtistInfo }>({
      method: 'artist.getinfo',
      artist: artistName,
      autocorrect: '1'
    });
    
    const artist = response.artist;
    
    const result = {
      name: artist.name,
      image: getBestImage(artist.image || []),
      bio: cleanHtml(artist.bio?.summary || ''),
      bioFull: cleanHtml(artist.bio?.content || ''),
      tags: artist.tags?.tag?.slice(0, 5).map(t => t.name) || [],
      listeners: parseInt(artist.stats?.listeners || '0'),
      playcount: parseInt(artist.stats?.playcount || '0'),
      url: artist.url
    };
    
    // Guardar en caché
    cache.set(cacheKey, result, CACHE_TTL);
    
    return result;
  } catch (error) {
    console.error(`Error obteniendo info del artista "${artistName}":`, error);
    return null;
  }
}

/**
 * Obtiene información de un álbum
 */
export async function getAlbumInfo(
  artistName: string,
  albumName: string
): Promise<ProcessedAlbumInfo | null> {
  try {
    const response = await lastfmFetch<{ album: LastFmAlbumInfo }>({
      method: 'album.getinfo',
      artist: artistName,
      album: albumName,
      autocorrect: '1'
    });
    
    const album = response.album;
    
    return {
      name: album.name,
      artist: album.artist,
      image: getBestImage(album.image || []),
      summary: cleanHtml(album.wiki?.summary || ''),
      tags: album.tags?.tag?.slice(0, 5).map(t => t.name) || [],
      listeners: parseInt(album.listeners || '0'),
      playcount: parseInt(album.playcount || '0'),
      url: album.url,
      trackCount: album.tracks?.track?.length || 0
    };
  } catch (error) {
    console.error(`Error obteniendo info del álbum "${albumName}" de "${artistName}":`, error);
    return null;
  }
}

/**
 * Obtiene información de una canción
 */
export async function getTrackInfo(
  artistName: string,
  trackName: string
): Promise<ProcessedTrackInfo | null> {
  try {
    const response = await lastfmFetch<{ track: LastFmTrackInfo }>({
      method: 'track.getinfo',
      artist: artistName,
      track: trackName,
      autocorrect: '1'
    });
    
    const track = response.track;
    
    return {
      name: track.name,
      artist: track.artist.name,
      album: track.album?.title || null,
      image: track.album ? getBestImage(track.album.image || []) : null,
      tags: track.toptags?.tag?.slice(0, 5).map(t => t.name) || [],
      duration: parseInt(track.duration || '0') / 1000, // Convertir ms a segundos
      listeners: parseInt(track.listeners || '0'),
      playcount: parseInt(track.playcount || '0'),
      url: track.url
    };
  } catch (error) {
    console.error(`Error obteniendo info de la canción "${trackName}" de "${artistName}":`, error);
    return null;
  }
}

/**
 * Busca artistas por nombre
 */
export async function searchArtist(query: string, limit = 10) {
  try {
    const response = await lastfmFetch<{
      results: {
        artistmatches: {
          artist: Array<{
            name: string;
            listeners: string;
            mbid: string;
            url: string;
            image: { '#text': string; size: string }[];
          }>;
        };
      };
    }>({
      method: 'artist.search',
      artist: query,
      limit: limit.toString()
    });
    
    return response.results.artistmatches.artist.map(artist => ({
      name: artist.name,
      listeners: parseInt(artist.listeners),
      image: getBestImage(artist.image),
      url: artist.url
    }));
  } catch (error) {
    console.error(`Error buscando artista "${query}":`, error);
    return [];
  }
}

/**
 * Busca álbumes por nombre
 */
export async function searchAlbum(query: string, limit = 10) {
  try {
    const response = await lastfmFetch<{
      results: {
        albummatches: {
          album: Array<{
            name: string;
            artist: string;
            url: string;
            image: { '#text': string; size: string }[];
          }>;
        };
      };
    }>({
      method: 'album.search',
      album: query,
      limit: limit.toString()
    });
    
    return response.results.albummatches.album.map(album => ({
      name: album.name,
      artist: album.artist,
      image: getBestImage(album.image),
      url: album.url
    }));
  } catch (error) {
    console.error(`Error buscando álbum "${query}":`, error);
    return [];
  }
}
