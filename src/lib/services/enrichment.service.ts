import { enrichmentStore } from '@/lib/stores/enrichment.store.svelte';
import type { MusicFile } from '@/lib/types';
import { TauriCommands } from '@/lib/utils/tauriCommands';


/**
 * Servicio de enriquecimiento con Last.fm
 * Separa la lógica de enriquecimiento del store de biblioteca
 */
export class EnrichmentService {
  private static cache = new Map<string, { url: string, timestamp: number }>();
  private static CACHE_KEY = 'album-art-cache';
  private static MAX_CACHE_SIZE = 500;
  private static CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  static initialize() {
    this.loadCache();
  }

  private static loadCache() {
    if (typeof localStorage === 'undefined') return;
    const data = localStorage.getItem(this.CACHE_KEY);
    if (data) {
      try {
        const entries = JSON.parse(data);
        this.cache = new Map(entries);
      } catch (e) {
        console.error('Failed to load album art cache', e);
      }
    }
  }

  private static persistCache() {
    if (typeof localStorage === 'undefined') return;
    const data = JSON.stringify(Array.from(this.cache.entries()));
    localStorage.setItem(this.CACHE_KEY, data);
  }

  private static setCache(key: string, url: string) {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { url, timestamp: Date.now() });
    this.persistCache();
  }

  static async getAlbumArt(track: MusicFile): Promise<string | null> {
    if (!track.artist || !track.title) return null;
    const key = `${track.artist}-${track.title}`;

    // 1. Memory Cache
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (Date.now() - entry.timestamp < this.CACHE_EXPIRY) {
        return entry.url;
      }
      this.cache.delete(key);
    }

    // 2. Fetch
    try {
      const trackInfo = await TauriCommands.getLastFmTrackInfo(track.artist, track.title);
      if (trackInfo && trackInfo.image) {
        this.setCache(key, trackInfo.image);
        return trackInfo.image;
      }

    } catch (e) {
      console.warn('Failed to fetch album art', e);
    }

    return null;
  }

  /**
   * Verifica si un track necesita enriquecimiento
   */
  static needsEnrichment(track: MusicFile): boolean {
    return !track.albumArt && !track.lastFmData;
  }

  /**
   * Obtiene el estado actual de enriquecimiento
   */
  static getEnrichmentState() {
    return {
      isEnriching: enrichmentStore.isEnriching,
      progress: enrichmentStore.progress,
      error: enrichmentStore.error
    };
  }

  /**
   * Verifica si está enriqueciendo actualmente
   */
  static isEnriching(): boolean {
    return enrichmentStore.isEnriching;
  }

  /**
   * Obtiene el progreso actual
   */
  static getProgress() {
    return enrichmentStore.progress;
  }

  /**
   * Enriquece un track específico (lazy enrichment)
   */
  static async enrichTrack(track: MusicFile): Promise<MusicFile | null> {
    if (!track.artist || !track.title || !this.needsEnrichment(track)) {
      return null;
    }

    try {
      const enrichedResult = await TauriCommands.enrichTracksBatch([track]);
      if (enrichedResult.length > 0 && enrichedResult[0].enriched) {
        const result = enrichedResult[0];
        const enrichedTrack: MusicFile = {
          ...track,
          albumArt: track.albumArt || result.albumArtUrl,
          lastFmData: result.enriched
        };
        enrichmentStore.addEnrichedTrack(enrichedTrack);
        return enrichedTrack;
      }
    } catch (error) {
      console.warn('Failed to enrich track:', track.title, error);
    }

    return null;
  }

  /**
   * Enriquecer un lote de tracks con Last.fm
   */
  static async enrichTracksBatch(tracks: MusicFile[]): Promise<void> {
    const validTracks = tracks.filter(track =>
      track.artist && track.title && this.needsEnrichment(track)
    );

    if (validTracks.length === 0) {
      console.log('ℹ️ No hay tracks que necesiten enriquecimiento');
      return;
    }

    console.log(`🚀 Iniciando enriquecimiento de ${validTracks.length} tracks`);

    // Iniciar enriquecimiento
    enrichmentStore.startEnrichment(validTracks.length);

    try {
      // Use Rust batch command for better performance and concurrency
      const enrichedResults = await TauriCommands.enrichTracksBatch(validTracks);

      // Process results
      enrichedResults.forEach((result, i) => {
        const track = result.original;
        enrichmentStore.updateProgress(i + 1, `${track.artist} - ${track.title}`);

        if (result.enriched) {
          const enrichedTrack: MusicFile = {
            ...track,
            albumArt: track.albumArt || result.albumArtUrl,
            lastFmData: result.enriched
          };
          enrichmentStore.addEnrichedTrack(enrichedTrack);
        }
      });

      // Completar enriquecimiento
      enrichmentStore.completeEnrichment(validTracks.length);
      console.log(`✅ Enriquecimiento completado: ${validTracks.length} tracks procesados`);
    } catch (error) {
      console.error('❌ Error en el proceso de enriquecimiento:', error);
      enrichmentStore.setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  }
}
