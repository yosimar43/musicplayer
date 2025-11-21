/**
 * 🏪 Store reactivo para la biblioteca de música local
 * Reemplaza library.svelte.ts con estado reactivo tipado
 */

import { untrack } from 'svelte';
import { TauriCommands } from '@/lib/utils/tauriCommands';
import type { MusicFile } from '@/lib/types';

const { getDefaultMusicFolder, scanMusicFolder, getAudioMetadata } = TauriCommands;

// Re-exportar MusicFile como Track para compatibilidad
export type Track = MusicFile;

export class LibraryStore {
  // Estado reactivo
  tracks = $state<MusicFile[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentFolder = $state<string>('');

  // Estadísticas derivadas
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(
    this.tracks.reduce((acc, track) => acc + (track.duration || 0), 0)
  );
  artists = $derived(
    [...new Set(this.tracks.map(t => t.artist).filter(Boolean))] as string[]
  );
  albums = $derived(
    [...new Set(this.tracks.map(t => t.album).filter(Boolean))] as string[]
  );

  // Acciones
  async loadLibrary(folderPath?: string, enrichWithLastFm = true) {
    this.isLoading = true;
    this.error = null;

    try {
      // Obtener carpeta por defecto si no se especifica
      if (!folderPath) {
        folderPath = await getDefaultMusicFolder();
        this.currentFolder = folderPath;
      }

      console.log('🔍 Escaneando directorio:', folderPath);

      // Escanear carpeta via Tauri
      const scannedTracks = await scanMusicFolder(folderPath);

      untrack(() => {
        this.tracks = scannedTracks;
        this.currentFolder = folderPath!;
      });

      console.log('✅ Cargadas', scannedTracks.length, 'canciones');

      // Enriquecer con Last.fm si está habilitado
      if (enrichWithLastFm && scannedTracks.length > 0) {
        await this.enrichTracksWithLastFm(scannedTracks);
      }

      return scannedTracks;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load library';
      console.error('❌ Library load error:', err);
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async reload(enrichWithLastFm = true) {
    if (this.currentFolder) {
      await this.loadLibrary(this.currentFolder, enrichWithLastFm);
    }
  }

  async getTrackMetadata(filePath: string): Promise<MusicFile | null> {
    try {
      return await getAudioMetadata(filePath);
    } catch (err) {
      console.error('❌ Metadata error:', err);
      return null;
    }
  }

  clearLibrary() {
    this.tracks = [];
    this.currentFolder = '';
    this.error = null;
  }

  // Método interno para enriquecimiento (será movido a un servicio separado)
  private async enrichTracksWithLastFm(tracks: MusicFile[]) {
    const { enrichmentStore } = await import('@/lib/stores/enrichment.store');

    // Filtrar tracks con artista y título válidos
    const validTracks = tracks.filter(track =>
      track.artist && track.title &&
      track.artist.trim() && track.title.trim()
    );

    if (validTracks.length === 0) {
      console.log('⚠️ No hay tracks válidos para enriquecer');
      return;
    }

    // Iniciar enriquecimiento
    enrichmentStore.startEnrichment(validTracks.length);

    try {
      // Procesar en lotes de 5 para no sobrecargar la API
      const batchSize = 5;
      const batches = [];

      for (let i = 0; i < validTracks.length; i += batchSize) {
        batches.push(validTracks.slice(i, i + batchSize));
      }

      // Procesar cada lote
      for (const batch of batches) {
        const promises = batch.map(async (track) => {
          try {
    // Importar musicData store dinámicamente para evitar dependencias circulares
    const { musicDataStore } = await import('@/lib/stores/musicData.store');            // Intentar obtener info del track desde Last.fm
            const trackData = await musicDataStore.getTrack(track.artist!, track.title!);

            // Si tenemos datos del track, intentar obtener info del artista también
            if (trackData) {
              await musicDataStore.getArtist(track.artist!);

              // Si el track tiene álbum, obtener info del álbum
              if (track.album) {
                await musicDataStore.getAlbum(track.artist!, track.album);
              }
            }

            enrichmentStore.updateProgress(enrichmentStore.progress.current + 1, `${track.artist} - ${track.title}`);
            return track;
          } catch (error) {
            console.warn(`⚠️ Error enriqueciendo ${track.artist} - ${track.title}:`, error);
            enrichmentStore.updateProgress(enrichmentStore.progress.current + 1);
            return track;
          }
        });

        // Esperar a que termine el lote actual antes de continuar
        await Promise.all(promises);

        // Pequeña pausa entre lotes para no sobrecargar
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      enrichmentStore.completeEnrichment(validTracks.length);

    } catch (error) {
      console.error('❌ Error en enriquecimiento con Last.fm:', error);
      enrichmentStore.setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  }
}

export const libraryStore = new LibraryStore();

// Funciones de búsqueda (mantenidas por compatibilidad)
export function searchTracks(query: string): MusicFile[] {
  const lowerQuery = query.toLowerCase();
  return libraryStore.tracks.filter(track =>
    track.title?.toLowerCase().includes(lowerQuery) ||
    track.artist?.toLowerCase().includes(lowerQuery) ||
    track.album?.toLowerCase().includes(lowerQuery)
  );
}

export function getTracksByArtist(artist: string): MusicFile[] {
  return libraryStore.tracks.filter(track => track.artist === artist);
}

export function getTracksByAlbum(album: string): MusicFile[] {
  return libraryStore.tracks.filter(track => track.album === album);
}

export function clearLibrary() {
  libraryStore.clearLibrary();
}