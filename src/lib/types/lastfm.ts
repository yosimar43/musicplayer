/**
 * Tipos TypeScript para la API de Last.fm
 */

import type { MusicFile } from '@/lib/types';

export interface LastFmImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
}

export interface LastFmTag {
  name: string;
  url: string;
}

export interface LastFmArtistInfo {
  name: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  stats?: {
    listeners: string;
    playcount: string;
  };
  bio?: {
    summary: string;
    content: string;
    published?: string;
  };
  tags?: {
    tag: LastFmTag[];
  };
}

export interface LastFmAlbumInfo {
  name: string;
  artist: string;
  mbid?: string;
  url: string;
  image: LastFmImage[];
  listeners?: string;
  playcount?: string;
  tags?: {
    tag: LastFmTag[];
  };
  wiki?: {
    summary: string;
    content: string;
    published?: string;
  };
  tracks?: {
    track: Array<{
      name: string;
      duration: string;
      url: string;
      streamable: { '#text': string; fulltrack: string };
      artist: {
        name: string;
        mbid: string;
        url: string;
      };
    }>;
  };
}

export interface LastFmTrackInfo {
  name: string;
  mbid?: string;
  url: string;
  duration?: string;
  listeners?: string;
  playcount?: string;
  artist: {
    name: string;
    mbid?: string;
    url: string;
  };
  album?: {
    artist: string;
    title: string;
    mbid?: string;
    url: string;
    image: LastFmImage[];
  };
  toptags?: {
    tag: LastFmTag[];
  };
  wiki?: {
    summary: string;
    content: string;
    published?: string;
  };
}

export interface LastFmError {
  error: number;
  message: string;
}

// Tipos procesados para usar en el UI
export interface ProcessedArtistInfo {
  name: string;
  image: string | null;
  bio: string;
  bioFull: string;
  tags: string[];
  listeners: number;
  playcount: number;
  url: string;
}

export interface ProcessedAlbumInfo {
  name: string;
  artist: string;
  image: string | null;
  summary: string;
  tags: string[];
  listeners: number;
  playcount: number;
  url: string;
  trackCount: number;
}

export interface ProcessedTrackInfo {
  name: string;
  artist: string;
  album: string | null;
  image: string | null;
  tags: string[];
  duration: number | null;
  listeners: number | null;
  playcount: number | null;
  wiki: string | null;
  url: string;
}

export interface EnrichedTrack {
  original: MusicFile;
  enriched: ProcessedTrackInfo | null;
  albumArtUrl: string | null;
}
