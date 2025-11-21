export interface MusicFile {
  path: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  year: number | null;
  genre: string | null;
  albumArt?: string | null;
  lastFmData?: any;
}

export type Track = MusicFile;
