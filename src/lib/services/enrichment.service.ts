import { enrichmentStore } from '@/lib/stores/enrichment.store';
import type { MusicFile } from '@/lib/types';
import { getTrackInfo } from '@/lib/api/lastfm';

/**
 * Servicio de enriquecimiento con Last.fm
 * Separa la lógica de enriquecimiento del store de biblioteca
 */
export class EnrichmentService {
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
   * Obtiene un track enriquecido por artista y título
   */
  static getEnrichedTrack(artist: string, title: string): MusicFile | undefined {
    return enrichmentStore.getEnrichedTrack(artist, title);
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
      for (let i = 0; i < validTracks.length; i++) {
        const track = validTracks[i];

        try {
          // Actualizar progreso
          enrichmentStore.updateProgress(i, `${track.artist} - ${track.title}`);

          // Obtener datos de Last.fm
          const trackInfo = await getTrackInfo(track.artist!, track.title!);

          if (trackInfo) {
            // Enriquecer el track
            const enrichedTrack: MusicFile = {
              ...track,
              albumArt: trackInfo.image || track.albumArt,
              lastFmData: trackInfo
            };

            // Añadir al store
            enrichmentStore.addEnrichedTrack(enrichedTrack);
          }
        } catch (error) {
          console.warn(`⚠️ Error enriqueciendo "${track.artist} - ${track.title}":`, error);
          // Continuar con el siguiente track
          enrichmentStore.updateProgress(i + 1);
        }
      }

      // Completar enriquecimiento
      enrichmentStore.completeEnrichment(validTracks.length);
      console.log(`✅ Enriquecimiento completado: ${validTracks.length} tracks procesados`);
    } catch (error) {
      console.error('❌ Error en el proceso de enriquecimiento:', error);
      enrichmentStore.setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  }
}