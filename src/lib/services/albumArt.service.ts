/**
 * 🎨 Service para comunicación con Album Art Worker
 * Proporciona API simple para obtener album art sin bloquear UI
 */

import type { WorkerRequest, WorkerResponse } from '@/lib/workers/albumArtWorker';

export class AlbumArtService {
  private worker: Worker | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (albumArt: string | null) => void;
    reject: (error: Error) => void;
  }>();

  /**
   * Inicializa el worker (lazy loading)
   */
  private async initWorker() {
    if (this.worker) return;

    try {
      // Crear worker desde el archivo TypeScript
      // Vite maneja automáticamente la conversión ?worker
      this.worker = new Worker(
        new URL('@/lib/workers/albumArtWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Configurar handler de respuestas
      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this));
      
      // Configurar handler de errores
      this.worker.addEventListener('error', (error) => {
        console.error('❌ Worker error:', error);
      });

      // ✅ Enviar API key al worker
      const apiKey = import.meta.env.VITE_LASTFM_API_KEY;
      if (apiKey) {
        this.worker.postMessage({ type: 'config', apiKey });
      } else {
        console.warn('⚠️ VITE_LASTFM_API_KEY not found in environment');
      }

      console.log('✅ Album Art Worker initialized');
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error);
      this.worker = null;
    }
  }

  /**
   * Handler de mensajes del worker
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { id, type, payload } = event.data;
    
    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    if (type === 'success') {
      pending.resolve(payload.albumArt ?? null);
    } else {
      pending.reject(new Error(payload.error || 'Unknown error'));
    }

    this.pendingRequests.delete(id);
  }

  /**
   * Obtiene album art para un track
   * @returns Promise con la URL de la imagen o null
   */
  async getAlbumArt(
    artist: string,
    title: string,
    album?: string | null,
    trackPath?: string
  ): Promise<string | null> {
    // Inicializar worker si no existe
    await this.initWorker();

    // Si no hay worker (error), fallback a null
    if (!this.worker) {
      console.warn('⚠️ Worker not available, returning null');
      return null;
    }

    // Generar ID único para esta petición
    const id = `req_${++this.requestId}`;

    // Crear promesa que se resolverá cuando el worker responda
    const promise = new Promise<string | null>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    // Enviar petición al worker
    const request: WorkerRequest = {
      id,
      type: 'getAlbumArt',
      payload: {
        artist,
        title,
        album,
        trackPath: trackPath || ''
      }
    };

    this.worker.postMessage(request);

    // Timeout de 10s para evitar promesas colgadas
    const timeout = setTimeout(() => {
      const pending = this.pendingRequests.get(id);
      if (pending) {
        pending.reject(new Error('Request timeout'));
        this.pendingRequests.delete(id);
      }
    }, 10000);

    try {
      const result = await promise;
      clearTimeout(timeout);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      console.error('Error getting album art:', error);
      return null;
    }
  }

  /**
   * Batch processing: obtener múltiples album arts en paralelo
   */
  async getAlbumArtBatch(
    tracks: Array<{
      artist: string;
      title: string;
      album?: string | null;
      trackPath: string;
    }>
  ): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();

    // Procesar en paralelo (el worker manejará el throttling)
    const promises = tracks.map(async (track) => {
      const albumArt = await this.getAlbumArt(
        track.artist,
        track.title,
        track.album,
        track.trackPath
      );
      results.set(track.trackPath, albumArt);
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Limpia recursos del worker
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    console.log('🧹 Album Art Worker destroyed');
  }

  /**
   * Obtiene estadísticas de peticiones pendientes
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      workerActive: this.worker !== null
    };
  }
}

// Singleton instance
export const albumArtService = new AlbumArtService();

// Cleanup al cerrar la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    albumArtService.destroy();
  });
}
