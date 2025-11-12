/**
 * Hook de eventos global (EventBus pattern)
 * Permite comunicación entre componentes desacoplados
 */

type EventCallback<T = any> = (data: T) => void;
type EventMap = Map<string, Set<EventCallback>>;

// EventBus global singleton
const eventBus: EventMap = new Map();

export function useEventBus() {
  const listeners: Array<{ event: string; callback: EventCallback }> = [];

  /**
   * Emitir un evento global
   * @param event - Nombre del evento
   * @param data - Datos a enviar
   */
  function emit<T = any>(event: string, data?: T): void {
    const callbacks = eventBus.get(event);
    if (callbacks) {
      console.log(`📢 Evento emitido: "${event}"`, data ? `con ${JSON.stringify(data).length} bytes` : '');
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error en listener de evento "${event}":`, error);
        }
      });
    }
  }

  /**
   * Escuchar un evento global
   * @param event - Nombre del evento
   * @param callback - Función callback
   * @returns Función para dejar de escuchar
   */
  function on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!eventBus.has(event)) {
      eventBus.set(event, new Set());
    }

    const callbacks = eventBus.get(event)!;
    callbacks.add(callback);
    listeners.push({ event, callback });

    console.log(`👂 Listener registrado para evento: "${event}"`);

    // Retornar función para dejar de escuchar
    return () => {
      callbacks.delete(callback);
      const index = listeners.findIndex(l => l.event === event && l.callback === callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      console.log(`🔇 Listener removido para evento: "${event}"`);
    };
  }

  /**
   * Escuchar un evento una sola vez
   * @param event - Nombre del evento
   * @param callback - Función callback
   */
  function once<T = any>(event: string, callback: EventCallback<T>): void {
    const wrappedCallback: EventCallback<T> = (data) => {
      callback(data);
      off(event, wrappedCallback);
    };
    on(event, wrappedCallback);
  }

  /**
   * Dejar de escuchar un evento específico
   * @param event - Nombre del evento
   * @param callback - Función callback (opcional, si no se provee se eliminan todos)
   */
  function off(event: string, callback?: EventCallback): void {
    const callbacks = eventBus.get(event);
    if (!callbacks) return;

    if (callback) {
      callbacks.delete(callback);
      const index = listeners.findIndex(l => l.event === event && l.callback === callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    } else {
      callbacks.clear();
      eventBus.delete(event);
    }
  }

  /**
   * Limpiar todos los listeners registrados por este hook
   * Llamar en onDestroy o cleanup
   */
  function cleanup(): void {
    listeners.forEach(({ event, callback }) => {
      const callbacks = eventBus.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    });
    listeners.length = 0;
    console.log('🧹 Todos los listeners del hook fueron limpiados');
  }

  /**
   * Obtener el número de listeners para un evento
   * @param event - Nombre del evento
   */
  function listenerCount(event: string): number {
    return eventBus.get(event)?.size ?? 0;
  }

  return {
    emit,
    on,
    once,
    off,
    cleanup,
    listenerCount
  };
}

/**
 * Eventos predefinidos del sistema
 */
export const EVENTS = {
  // Player
  TRACK_CHANGED: 'player:track-changed',
  PLAYBACK_STARTED: 'player:playback-started',
  PLAYBACK_PAUSED: 'player:playback-paused',
  PLAYBACK_ENDED: 'player:playback-ended',
  QUEUE_UPDATED: 'player:queue-updated',
  
  // Library
  LIBRARY_LOADED: 'library:loaded',
  LIBRARY_UPDATED: 'library:updated',
  TRACK_ADDED: 'library:track-added',
  
  // Downloads
  DOWNLOAD_STARTED: 'download:started',
  DOWNLOAD_COMPLETED: 'download:completed',
  DOWNLOAD_FAILED: 'download:failed',
  
  // Spotify
  SPOTIFY_AUTHENTICATED: 'spotify:authenticated',
  SPOTIFY_DISCONNECTED: 'spotify:disconnected',
  SPOTIFY_TRACKS_LOADED: 'spotify:tracks-loaded',
  
  // UI
  SEARCH_QUERY_CHANGED: 'ui:search-changed',
  THEME_CHANGED: 'ui:theme-changed',
  NOTIFICATION: 'ui:notification'
} as const;
