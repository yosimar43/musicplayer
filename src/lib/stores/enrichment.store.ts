import { untrack } from 'svelte';
import type { MusicFile } from '@/lib/types';

/**
 * Estado de progreso del enriquecimiento con Last.fm
 */
export interface EnrichmentProgress {
  current: number;
  total: number;
  currentTrack?: string;
}

/**
 * Store reactivo para el enriquecimiento de tracks con Last.fm
 */
class EnrichmentStore {
  // Estado reactivo
  isEnriching = $state(false);
  progress = $state<EnrichmentProgress>({ current: 0, total: 0 });
  enrichedTracks = $state<Map<string, MusicFile>>(new Map());
  error = $state<string | null>(null);

  // Estado derivado
  isComplete = $derived(this.progress.current >= this.progress.total && this.progress.total > 0);
  percentComplete = $derived(
    this.progress.total > 0 ? Math.round((this.progress.current / this.progress.total) * 100) : 0
  );
  currentTrack = $derived(this.progress.currentTrack);

  /**
   * Iniciar el proceso de enriquecimiento
   */
  startEnrichment(totalTracks: number) {
    untrack(() => {
      this.isEnriching = true;
      this.progress = { current: 0, total: totalTracks };
      this.enrichedTracks.clear();
      this.error = null;
    });
  }

  /**
   * Añadir track enriquecido
   */
  addEnrichedTrack(track: MusicFile) {
    const key = `${track.artist}-${track.title}`;
    untrack(() => {
      this.enrichedTracks.set(key, track);
    });
  }

  /**
   * Actualizar progreso
   */
  updateProgress(current: number, currentTrack?: string) {
    untrack(() => {
      this.progress = {
        ...this.progress,
        current,
        currentTrack
      };
    });
  }

  /**
   * Completar el enriquecimiento
   */
  completeEnrichment(totalEnriched: number) {
    untrack(() => {
      this.progress = {
        ...this.progress,
        current: totalEnriched
      };
      this.isEnriching = false;
    });
  }

  /**
   * Establecer error
   */
  setError(errorMessage: string) {
    untrack(() => {
      this.error = errorMessage;
      this.isEnriching = false;
    });
  }

  /**
   * Finalizar el enriquecimiento
   */
  finishEnrichment() {
    untrack(() => {
      this.isEnriching = false;
      this.progress = { current: this.progress.total, total: this.progress.total };
    });
  }

  /**
   * Resetear el estado
   */
  reset() {
    untrack(() => {
      this.isEnriching = false;
      this.progress = { current: 0, total: 0 };
      this.enrichedTracks.clear();
      this.error = null;
    });
  }

  /**
   * Obtener track enriquecido por clave
   */
  getEnrichedTrack(artist: string, title: string): MusicFile | undefined {
    const key = `${artist}-${title}`;
    return this.enrichedTracks.get(key);
  }
}

// Exportar instancia singleton
export const enrichmentStore = new EnrichmentStore();
export type { EnrichmentStore };