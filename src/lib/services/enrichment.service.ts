/**
 * Servicio de enriquecimiento con Last.fm
 * Separa la lógica de enriquecimiento del store de biblioteca
 */

import { enrichmentStore } from '@/lib/stores/enrichment.store';
import { musicDataStore } from '@/lib/stores/musicData.store';
import type { MusicFile } from '@/lib/types';

export class EnrichmentService {
  /**
   * Enriquece un lote de tracks con datos de Last.fm
   */
  static async enrichTracksBatch(tracks: MusicFile[]): Promise<void> {
    // Filtrar tracks con artista y título válidos
    const validTracks = tracks.filter(track =>
      track.artist && track.title &&
      track.artist.trim() && track.title.trim()
    );

    if (validTracks.length === 0) {
      console.log('⚠️ No hay tracks válidos para enriquecer');
      return;
    }

    console.log(`🎵 Iniciando enriquecimiento de ${validTracks.length} tracks`);

    // Iniciar progreso
    enrichmentStore.startEnrichment(validTracks.length);

    try {
      // Procesar en lotes de 5 para no sobrecargar la API
      const batchSize = 5;
      const batches = [];

      for (let i = 0; i < validTracks.length; i += batchSize) {
        batches.push(validTracks.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const promises = batch.map(async (track) => {
          try {
            const trackName = track.title!.trim();
            const artistName = track.artist!.trim();

            // Intentar obtener imagen del track o álbum
            let imageUrl: string | null = null;

            // Primero intentar obtener datos del track
            const trackData = await musicDataStore.getTrack(artistName, trackName);
            if (trackData?.image) {
              imageUrl = trackData.image;
            }

            // Si no hay imagen del track, intentar con el álbum
            if (!imageUrl && track.album) {
              const albumData = await musicDataStore.getAlbum(artistName, track.album.trim());
              if (albumData?.image) {
                imageUrl = albumData.image;
              }
            }

            // Si encontramos imagen, agregar al track enriquecido
            if (imageUrl) {
              enrichmentStore.addEnrichedTrack(track);
            }

            // Actualizar progreso
            enrichmentStore.updateProgress(
              enrichmentStore.progress.current + 1,
              `${artistName} - ${trackName}`
            );

          } catch (error) {
            console.warn(`⚠️ Error enriqueciendo ${track.artist} - ${track.title}:`, error);
            // Continuar con el siguiente track
            enrichmentStore.updateProgress(enrichmentStore.progress.current + 1);
          }
        });

        // Esperar a que termine el batch actual
        await Promise.all(promises);

        // Pequeña pausa entre batches para no sobrecargar
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Completar enriquecimiento
      enrichmentStore.completeEnrichment(validTracks.length);
      console.log(`✅ Enriquecimiento completado: ${validTracks.length} tracks procesados`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido en enriquecimiento';
      console.error('❌ Error en enriquecimiento:', errorMsg);
      enrichmentStore.setError(errorMsg);
    }
  }

  /**
   * Verifica si el servicio de enriquecimiento está disponible
   */
  static isAvailable(): boolean {
    // Podríamos verificar aquí si Last.fm API está configurada
    return true;
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
}