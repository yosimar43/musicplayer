/**
 * 🎯 AUDIO MANAGER - Abstracción de HTMLAudioElement
 * 
 * PRINCIPIOS:
 * ✅ NO importa stores directamente
 * ✅ Usa callbacks para comunicar eventos
 * ✅ Responsabilidad única: manejo del elemento audio
 * ✅ Fácilmente testeable/mockeable
 * 
 * El usePlayer hook conecta este adapter con el store
 */

import { convertFileSrc } from '@tauri-apps/api/core';

// 🎯 Constantes de configuración
const VOLUME_MIN = 0;
const VOLUME_MAX = 100;

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface AudioCallbacks {
  onTimeUpdate: (currentTime: number) => void;
  onEnded: () => void;
  onError: (error: string) => void;
  onLoadedMetadata: (duration: number) => void;
  onCanPlay: () => void;
}

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO MANAGER
// ═══════════════════════════════════════════════════════════════════════════

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private eventListeners: Map<string, EventListener> = new Map();
  private callbacks: AudioCallbacks | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = "metadata";
    }
  }

  /**
   * 🔌 Inicializa el manager con callbacks para eventos
   * Debe llamarse antes de usar cualquier otro método
   */
  initialize(callbacks: AudioCallbacks): void {
    if (!this.audio) {
      console.warn('⚠️ AudioManager: No hay elemento de audio disponible');
      return;
    }

    this.callbacks = callbacks;
    this.setupEventListeners();
    this.setupMediaSession();
    console.log('🎵 AudioManager inicializado con callbacks');
  }

  private setupEventListeners(): void {
    if (!this.audio || !this.callbacks) return;

    const callbacks = this.callbacks;

    // 🎵 Cuando cambia el tiempo
    const timeUpdateHandler = () => {
      callbacks.onTimeUpdate(this.audio?.currentTime ?? 0);
    };
    this.audio.addEventListener('timeupdate', timeUpdateHandler);
    this.eventListeners.set('timeupdate', timeUpdateHandler);

    // 🔚 Cuando termina la canción
    const endedHandler = () => {
      console.log('🏁 Track terminado');
      callbacks.onEnded();
    };
    this.audio.addEventListener('ended', endedHandler);
    this.eventListeners.set('ended', endedHandler);

    // ❌ Manejo de errores
    const errorHandler = () => {
      console.error('❌ [AudioManager] Error del elemento de audio');
      if (this.audio?.error) {
        const error = this.audio.error;
        const errorMessages: Record<number, string> = {
          [error.MEDIA_ERR_ABORTED]: 'Reproducción abortada',
          [error.MEDIA_ERR_NETWORK]: 'Error de red',
          [error.MEDIA_ERR_DECODE]: 'Error de decodificación',
          [error.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'Formato no soportado'
        };
        callbacks.onError(errorMessages[error.code] || 'Error desconocido');
      } else {
        callbacks.onError('Error desconocido');
      }
    };
    this.audio.addEventListener('error', errorHandler);
    this.eventListeners.set('error', errorHandler);

    // 📊 Cuando se carga la metadata
    const loadedMetadataHandler = () => {
      callbacks.onLoadedMetadata(this.audio?.duration ?? 0);
      console.log('📊 Duración cargada:', this.audio?.duration);
    };
    this.audio.addEventListener('loadedmetadata', loadedMetadataHandler);
    this.eventListeners.set('loadedmetadata', loadedMetadataHandler);

    // 🔊 Cuando puede empezar a reproducir
    const canPlayHandler = () => {
      console.log('✅ Audio listo para reproducir');
      callbacks.onCanPlay();
    };
    this.audio.addEventListener('canplay', canPlayHandler);
    this.eventListeners.set('canplay', canPlayHandler);
  }

  /**
   * 🎮 Configura MediaSession API para controles del sistema
   */
  private setupMediaSession(): void {
    if ('mediaSession' in navigator && this.audio) {
      console.log('🎮 MediaSession API disponible');
    }
  }

  /**
   * Carga y reproduce un archivo de audio
   * Soporta rutas locales y URLs de streaming
   */
  async play(filePathOrUrl: string): Promise<void> {
    if (!this.audio) {
      throw new Error('Audio element no disponible');
    }

    if (!filePathOrUrl || filePathOrUrl.trim() === '') {
      throw new Error('Ruta o URL inválida');
    }

    try {
      let audioUrl: string;

      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        try {
          new URL(filePathOrUrl);
          audioUrl = filePathOrUrl;
        } catch {
          throw new Error('URL de streaming inválida');
        }
      } else {
        audioUrl = convertFileSrc(filePathOrUrl);
      }

      this.audio.src = audioUrl;
      await this.audio.play();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('❌ Error reproduciendo:', errorMsg);
      throw new Error(`Error de reproducción: ${errorMsg}`);
    }
  }

  /**
   * ⏸️ Pausa la reproducción
   */
  pause(): void {
    if (this.audio) {
      this.audio.pause();
      console.log('⏸️ Pausado');
    }
  }

  /**
   * ▶️ Reanuda la reproducción
   */
  resume(): void {
    if (this.audio) {
      this.audio.play().catch(error => {
        console.error('❌ Error al reanudar:', error);
      });
      console.log('▶️ Reanudado');
    }
  }

  /**
   * ⏹️ Detiene la reproducción
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      console.log('⏹️ Detenido');
    }
  }

  /**
   * Establece el volumen (0-100)
   */
  setVolume(volume: number): void {
    if (!this.audio) return;

    if (typeof volume !== 'number' || isNaN(volume)) {
      console.error('❌ Volumen inválido:', volume);
      return;
    }

    const clampedVolume = Math.max(VOLUME_MIN, Math.min(VOLUME_MAX, volume));
    this.audio.volume = clampedVolume / 100;
  }

  /**
   * Silencia o activa el audio
   */
  setMuted(muted: boolean): void {
    if (!this.audio) return;
    this.audio.muted = Boolean(muted);
  }

  /**
   * Busca a una posición específica (0-100)
   */
  seek(percentage: number): void {
    if (!this.audio) return;

    if (typeof percentage !== 'number' || isNaN(percentage)) {
      console.error('❌ Porcentaje inválido:', percentage);
      return;
    }

    const duration = this.audio.duration;
    if (!duration || isNaN(duration) || !isFinite(duration)) {
      console.warn('⚠️ No se puede buscar: duración no disponible');
      return;
    }

    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    this.audio.currentTime = (clampedPercentage / 100) * duration;
  }

  /**
   * 🎵 Actualiza MediaSession con metadata del track
   */
  updateMediaSession(metadata: TrackMetadata): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title || 'Desconocido',
        artist: metadata.artist || 'Artista Desconocido',
        album: metadata.album || '',
        artwork: metadata.artwork ? [
          { src: metadata.artwork, sizes: '512x512', type: 'image/jpeg' }
        ] : undefined
      });

      console.log('🎮 MediaSession actualizada:', metadata.title);
    }
  }

  /**
   * 🧹 Limpia recursos y event listeners
   */
  destroy(): void {
    if (this.audio) {
      this.eventListeners.forEach((handler, event) => {
        this.audio?.removeEventListener(event, handler);
      });
      this.eventListeners.clear();

      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
      this.callbacks = null;

      console.log('🧹 AudioManager limpiado');
    }
  }

  /**
   * 🔍 Getters de estado
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  isPaused(): boolean {
    return this.audio?.paused ?? true;
  }

  isReady(): boolean {
    return this.audio !== null && this.audio.readyState >= 2;
  }

  isInitialized(): boolean {
    return this.callbacks !== null;
  }
}

// ✨ Singleton del AudioManager
export const audioManager = new AudioManager();

// 🧹 Cleanup al cerrar la ventana
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioManager.destroy();
  });
}
