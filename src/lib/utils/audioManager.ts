import { player, updateTime, next } from '@/lib/state/player.svelte';
import { convertFileSrc } from '@tauri-apps/api/core';

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private updateInterval: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    if (!this.audio) return;

    // Cuando el audio está listo para reproducir
    this.audio.addEventListener('canplay', () => {
      console.log('✅ Audio listo para reproducir');
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
      console.error('❌ Error reproduciendo audio:', e);
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
   */
  async play(filePath: string) {
    if (!this.audio) return;

    try {
      // Convertir la ruta del archivo a URL compatible con Tauri
      const assetUrl = convertFileSrc(filePath);
      
      console.log('🎵 Cargando:', filePath);
      console.log('🔗 URL:', assetUrl);

      this.audio.src = assetUrl;
      await this.audio.play();
      
      this.startTimeTracking();
      console.log('▶️ Reproduciendo');
    } catch (error) {
      console.error('❌ Error al reproducir:', error);
    }
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
