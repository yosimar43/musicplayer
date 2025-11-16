/** Almacena metadata relacionada con las canciones, como la imagen del álbum */
import type { Track } from '@/lib/types/music';

export class TrackMetadataStore {
  private metadata = new Map<string, { albumImage?: string }>();

  /** Guarda la imagen del álbum para una canción específica */
  setAlbumImage(track: Track, imageUrl: string | null | undefined): void {
    if (!imageUrl) return;
    const entry = this.metadata.get(track.path) ?? {};
    entry.albumImage = imageUrl;
    this.metadata.set(track.path, entry);
  }

  /** Obtiene la imagen del álbum para una canción */
  getAlbumImage(track: Track): string | null {
    return this.metadata.get(track.path)?.albumImage ?? null;
  }

  /** Limpia la metadata de una canción */
  clear(track: Track): void {
    this.metadata.delete(track.path);
  }

  /** Limpia toda la metadata */
  clearAll(): void {
    this.metadata.clear();
  }
}

export const trackMetadata = new TrackMetadataStore();