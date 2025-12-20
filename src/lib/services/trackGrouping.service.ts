import type { MusicFile } from '@/lib/types';

/**
 * Servicio para agrupar tracks por letra inicial
 */
export class TrackGroupingService {
  /**
   * Agrupa tracks por letra inicial, ordenando alfabéticamente
   */
  static groupByLetter(tracks: MusicFile[]): Array<[string, MusicFile[]]> {
    const grouped = new Map<string, MusicFile[]>();

    for (const track of tracks) {
      const firstChar = (track.title || track.path).charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

      if (!grouped.has(letter)) {
        grouped.set(letter, []);
      }
      grouped.get(letter)!.push(track);
    }

    // Ordenar canciones dentro de cada grupo alfabéticamente
    for (const tracks of grouped.values()) {
      tracks.sort((a, b) => {
        const titleA = (a.title || a.path).toLowerCase();
        const titleB = (b.title || b.path).toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }

    return Array.from(grouped.entries())
      .sort((a, b) => {
        if (a[0] === '#') return 1;
        if (b[0] === '#') return -1;
        return a[0].localeCompare(b[0]);
      })
      .filter(([letter]) => letter !== '#')
      .concat(Array.from(grouped.entries()).filter(([letter]) => letter === '#'));
  }
}