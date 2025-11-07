import { player, updateTime, next } from '@/lib/state/player.svelte';
import { convertFileSrc } from '@tauri-apps/api/core';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private updateInterval: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous"; // Habilitar CORS
      this.audio.preload = "auto"; // Precargar automáticamente
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.audio) return;

    // Cuando empieza a cargar
    this.audio.addEventListener('loadstart', () => {
      console.log('🔄 [AudioManager] Iniciando carga de audio...');
    });

    // Cuando hay datos disponibles
    this.audio.addEventListener('loadeddata', () => {
      console.log('📥 [AudioManager] Datos de audio cargados');
    });

    // Cuando el audio está listo para reproducir
    this.audio.addEventListener('canplay', () => {
      console.log('✅ [AudioManager] Audio listo para reproducir');
    });

    // Cuando está completamente cargado
    this.audio.addEventListener('canplaythrough', () => {
      console.log('✅ [AudioManager] Audio completamente cargado');
    });

    // Cuando empieza a reproducir
    this.audio.addEventListener('playing', () => {
      console.log('▶️ [AudioManager] Reproducción en curso');
    });

    // Cuando cambia el tiempo
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        updateTime(this.audio.currentTime);
      }
    });

    // Cuando termina la canción
    this.audio.addEventListener('ended', () => {
      console.log('🔚 Canción terminada');
      next(); // Avanza a la siguiente automáticamente
    });

    // Errores
    this.audio.addEventListener('error', (e) => {
      console.error('❌ [AudioManager] Error del elemento de audio:', e);
      if (this.audio) {
        const error = this.audio.error;
        if (error) {
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          switch (error.code) {
            case error.MEDIA_ERR_ABORTED:
              console.error('Reproducción abortada por el usuario');
              break;
            case error.MEDIA_ERR_NETWORK:
              console.error('Error de red al intentar descargar el audio');
              break;
            case error.MEDIA_ERR_DECODE:
              console.error('Error al decodificar el audio');
              break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
              console.error('Formato de audio no soportado o URL inválida');
              break;
            default:
              console.error('Error desconocido');
          }
        }
      }
    });

    // Cuando se carga la metadata
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio) {
        player.duration = this.audio.duration;
        console.log('📊 Duración:', this.audio.duration);
      }
    });
  }

  /**
   * Carga y reproduce un archivo de audio
   * Soporta tanto rutas locales (C:\...) como URLs de streaming (http/https)
   */
  async play(filePathOrUrl: string) {
    if (!this.audio) {
      console.error('❌ Audio element no disponible');
      return;
    }

    try {
      let audioUrl: string;

      console.log('🎵 [AudioManager] Iniciando reproducción:', filePathOrUrl);

      // Detectar si es una URL de streaming (http/https) o una ruta local
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        // Es una URL de streaming, usarla directamente
        audioUrl = filePathOrUrl;
        console.log('🌐 [AudioManager] Streaming URL detectada');
      } else {
        // Es una ruta local, convertirla con convertFileSrc
        audioUrl = convertFileSrc(filePathOrUrl);
        console.log('🎵 [AudioManager] Archivo local detectado');
        console.log('🔗 [AudioManager] URL convertida:', audioUrl);
      }

      console.log('🔗 [AudioManager] Estableciendo src:', audioUrl);
      this.audio.src = audioUrl;
      
      console.log('▶️ [AudioManager] Llamando a play()...');
      await this.audio.play();
      
      this.startTimeTracking();
      console.log('✅ [AudioManager] Reproducción iniciada');
    } catch (error) {
      console.error('❌ [AudioManager] Error al reproducir:', error);
      console.error('Error details:', error);
    }
  }

  /**
   * Carga una canción con metadata completa (usado por YouTube y Spotify)
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
    if (metadata) {
      console.log('🎵 Cargando:', metadata.title || 'Desconocido');
      console.log('🎤 Artista:', metadata.artist || 'Desconocido');
      // Aquí podrías actualizar el estado global del player si quisieras
      // player.currentTrack = metadata; (si tuvieras esa propiedad)
    }

    await this.play(urlOrPath);
  }

  /**
   * Pausa la reproducción
   */
  pause() {
    if (this.audio) {
      this.audio.pause();
      this.stopTimeTracking();
      console.log('⏸️ Pausado');
    }
  }

  /**
   * Reanuda la reproducción
   */
  resume() {
    if (this.audio) {
      this.audio.play();
      this.startTimeTracking();
      console.log('▶️ Reanudado');
    }
  }

  /**
   * Detiene la reproducción
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.stopTimeTracking();
      console.log('⏹️ Detenido');
    }
  }

  /**
   * Establece el volumen (0-100)
   */
  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = volume / 100;
    }
  }

  /**
   * Silencia/des-silencia el audio
   */
  setMuted(muted: boolean) {
    if (this.audio) {
      this.audio.muted = muted;
    }
  }

  /**
   * Busca a una posición específica (0-100)
   */
  seek(percentage: number) {
    if (this.audio && this.audio.duration) {
      this.audio.currentTime = (percentage / 100) * this.audio.duration;
    }
  }

  /**
   * Inicia el seguimiento de tiempo
   */
  private startTimeTracking() {
    this.stopTimeTracking();
    this.updateInterval = window.setInterval(() => {
      if (this.audio) {
        updateTime(this.audio.currentTime);
      }
    }, 100); // Actualiza cada 100ms
  }

  /**
   * Detiene el seguimiento de tiempo
   */
  private stopTimeTracking() {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Obtiene el estado actual
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  isPaused(): boolean {
    return this.audio?.paused || true;
  }
}

// Singleton del AudioManager
export const audioManager = new AudioManager();
