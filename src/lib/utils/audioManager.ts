import { player, updateTime, next } from '@/lib/state/player.svelte';
import { convertFileSrc } from '@tauri-apps/api/core';
import { audioVisualizer } from './audioVisualizer';
import { crossfadeManager } from './crossfade';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private updateInterval: number | null = null;
  private crossfadeEnabled = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous"; // Habilitar CORS
      this.audio.preload = "auto"; // Precargar automáticamente
      this.setupEventListeners();
    }
  }

  /**
   * Inicializa el visualizador de audio
   */
  initializeVisualizer() {
    if (this.audio && !audioVisualizer.initialized) {
      audioVisualizer.initialize(this.audio);
    }
  }

  /**
   * Habilita/deshabilita crossfade
   */
  setCrossfadeEnabled(enabled: boolean) {
    this.crossfadeEnabled = enabled;
    console.log('🔀 Crossfade:', enabled ? 'enabled' : 'disabled');
  }

  private setupEventListeners() {
    if (!this.audio) return;



    // Cuando cambia el tiempo
    this.audio.addEventListener('timeupdate', () => {
      if (this.audio) {
        updateTime(this.audio.currentTime);
      }
    });

    // Cuando termina la canción
    this.audio.addEventListener('ended', () => {
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
        // Solo actualizar si es diferente (evitar re-render innecesario)
        if (player.duration !== this.audio.duration) {
          player.duration = this.audio.duration;
        }
      }
    });
  }

  /**
   * Carga y reproduce un archivo de audio
   * Soporta tanto rutas locales (C:\...) como URLs de streaming (http/https)
   * Con soporte opcional de crossfade
   */
  async play(filePathOrUrl: string) {
    if (!this.audio) {
      console.error('❌ Audio element no disponible');
      return;
    }

    try {
      let audioUrl: string;

      // Detectar si es una URL de streaming (http/https) o una ruta local
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        // Es una URL de streaming, usarla directamente
        audioUrl = filePathOrUrl;
      } else {
        // Es una ruta local, convertirla con convertFileSrc
        audioUrl = convertFileSrc(filePathOrUrl);
      }

      // Si crossfade está habilitado y hay audio reproduciéndose
      if (this.crossfadeEnabled && this.audio.src && !this.audio.paused) {
        console.log('🔀 Using crossfade transition');
        const newAudio = await crossfadeManager.crossfade(
          this.audio,
          audioUrl,
          { duration: 2500, curve: 'logarithmic' }
        );
        
        // Reemplazar el elemento de audio
        this.audio = newAudio;
        this.setupEventListeners();
        
        // Re-inicializar visualizador con el nuevo audio
        if (audioVisualizer.initialized) {
          audioVisualizer.dispose();
          audioVisualizer.initialize(this.audio);
        }
      } else {
        // Reproducción normal sin crossfade
        this.audio.src = audioUrl;
        await this.audio.play();
      }
      
      this.startTimeTracking();
      
      // Resume el contexto de audio del visualizador si está suspendido
      if (audioVisualizer.initialized) {
        await audioVisualizer.resume();
      }
    } catch (error) {
      console.error('❌ Error al reproducir audio:', error);
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
