import { playerStore, updateTime, next } from '@/lib/stores/player.store';
import { convertFileSrc } from '@tauri-apps/api/core';

// 🎯 Constantes de configuración
const SEEK_RESTART_THRESHOLD = 3; // segundos para reiniciar vs anterior
const VOLUME_MIN = 0;
const VOLUME_MAX = 100;

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private eventListeners: Map<string, EventListener> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = "metadata"; // Cambiar a "metadata" para mejor performance
      this.setupEventListeners();
      this.setupMediaSession();
    }
  }

  private setupEventListeners() {
    if (!this.audio) return;

    // 🎵 Cuando cambia el tiempo - ÚNICA fuente de verdad para tiempo
    const timeUpdateHandler = () => {
      if (this.audio) {
        updateTime(this.audio.currentTime);
      }
    };
    this.audio.addEventListener('timeupdate', timeUpdateHandler);
    this.eventListeners.set('timeupdate', timeUpdateHandler);

    // 🔚 Cuando termina la canción
    const endedHandler = () => {
      console.log('🏁 Track terminado, avanzando...');
      next();
    };
    this.audio.addEventListener('ended', endedHandler);
    this.eventListeners.set('ended', endedHandler);

    // ❌ Manejo detallado de errores
    const errorHandler = (e: Event) => {
      console.error('❌ [AudioManager] Error del elemento de audio:', e);
      if (this.audio?.error) {
        const error = this.audio.error;
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        const errorMessages: Record<number, string> = {
          [error.MEDIA_ERR_ABORTED]: '⏹️ Reproducción abortada por el usuario',
          [error.MEDIA_ERR_NETWORK]: '🌐 Error de red al intentar descargar el audio',
          [error.MEDIA_ERR_DECODE]: '🔧 Error al decodificar el audio',
          [error.MEDIA_ERR_SRC_NOT_SUPPORTED]: '🚫 Formato de audio no soportado o URL inválida'
        };
        
        console.error(errorMessages[error.code] || '❓ Error desconocido');
      }
    };
    this.audio.addEventListener('error', errorHandler);
    this.eventListeners.set('error', errorHandler);

    // 📊 Cuando se carga la metadata
    const loadedMetadataHandler = () => {
      if (this.audio && playerStore.duration !== this.audio.duration) {
        playerStore.duration = this.audio.duration;
        console.log('📊 Duración cargada:', this.audio.duration);
      }
    };
    this.audio.addEventListener('loadedmetadata', loadedMetadataHandler);
    this.eventListeners.set('loadedmetadata', loadedMetadataHandler);

    // 🔊 Cuando puede empezar a reproducir
    const canPlayHandler = () => {
      console.log('✅ Audio listo para reproducir');
    };
    this.audio.addEventListener('canplay', canPlayHandler);
    this.eventListeners.set('canplay', canPlayHandler);
  }

  /**
   * 🎮 Configura MediaSession API para controles del sistema
   */
  private setupMediaSession() {
    if ('mediaSession' in navigator && this.audio) {
      console.log('🎮 MediaSession API disponible');
      // Los metadatos se actualizarán cuando se cargue cada track
    }
  }

  /**
   * Carga y reproduce un archivo de audio
   * Soporta rutas locales y URLs de streaming con validación
   */
  async play(filePathOrUrl: string) {
    if (!this.audio) {
      throw new Error('Audio element no disponible');
    }
    
    if (!filePathOrUrl || filePathOrUrl.trim() === '') {
      throw new Error('Ruta o URL inválida');
    }

    try {
      let audioUrl: string;

      // Detectar tipo de fuente y validar
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        // URL de streaming - validar formato básico
        try {
          new URL(filePathOrUrl);
          audioUrl = filePathOrUrl;
        } catch {
          throw new Error('URL de streaming inválida');
        }
      } else {
        // Ruta local - convertir a asset protocol
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
   * Carga una canción con metadata completa
   * Actualiza MediaSession API si está disponible
   */
  async loadTrack(
    urlOrPath: string,
    metadata?: {
      title?: string;
      artist?: string;
      album?: string;
      albumArt?: string;
      duration?: number;
    }
  ) {
    // Actualizar MediaSession si hay metadata
    if (metadata && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title || 'Desconocido',
          artist: metadata.artist || 'Desconocido',
          album: metadata.album || '',
          artwork: metadata.albumArt ? [{
            src: metadata.albumArt,
            sizes: '512x512',
            type: 'image/jpeg'
          }] : []
        });
      } catch (error) {
        console.error('❌ Error actualizando MediaSession:', error);
      }
    }

    await this.play(urlOrPath);
  }

  /**
   * ⏸️ Pausa la reproducción
   */
  pause() {
    if (this.audio) {
      this.audio.pause();
      console.log('⏸️ Pausado');
    }
  }

  /**
   * ▶️ Reanuda la reproducción
   */
  resume() {
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
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      console.log('⏹️ Detenido');
    }
  }

  /**
   * Establece el volumen (0-100)
   * Valida y clampea el valor automáticamente
   */
  setVolume(volume: number) {
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
  setMuted(muted: boolean) {
    if (!this.audio) return;
    this.audio.muted = Boolean(muted);
  }

  /**
   * Busca a una posición específica (0-100)
   * Requiere que el audio tenga duración válida
   */
  seek(percentage: number) {
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
   * 🧹 Limpia recursos y event listeners
   */
  destroy() {
    if (this.audio) {
      // Remover todos los event listeners registrados
      this.eventListeners.forEach((handler, event) => {
        this.audio?.removeEventListener(event, handler);
      });
      this.eventListeners.clear();
      
      // Detener y limpiar audio
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
      
      console.log('🧹 AudioManager limpiado');
    }
  }

  /**
   * 🔍 Obtiene el estado actual
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

  /**
   * 🎵 Actualiza MediaSession con metadata del track
   */
  updateMediaSession(metadata: {
    title?: string;
    artist?: string;
    album?: string;
    artwork?: string;
  }) {
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
}

// ✨ Singleton del AudioManager
export const audioManager = new AudioManager();

// 🧹 Cleanup al cerrar la ventana
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioManager.destroy();
  });
}
