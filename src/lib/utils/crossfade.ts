/**
 * Crossfade Manager - Transiciones suaves entre canciones
 */

export interface CrossfadeOptions {
  duration: number; // Duración del crossfade en ms
  curve: 'linear' | 'logarithmic' | 'exponential';
}

export class CrossfadeManager {
  private defaultOptions: CrossfadeOptions = {
    duration: 3000, // 3 segundos
    curve: 'logarithmic' // Suena más natural
  };

  /**
   * Realiza crossfade entre dos elementos de audio
   */
  async crossfade(
    currentAudio: HTMLAudioElement,
    nextAudioUrl: string,
    options: Partial<CrossfadeOptions> = {}
  ): Promise<HTMLAudioElement> {
    const opts = { ...this.defaultOptions, ...options };
    
    console.log('🔀 Starting crossfade, duration:', opts.duration + 'ms');

    // Crear nuevo elemento de audio
    const nextAudio = new Audio(nextAudioUrl);
    nextAudio.volume = 0;

    try {
      // Precargar el siguiente audio
      await new Promise<void>((resolve, reject) => {
        nextAudio.addEventListener('canplay', () => resolve(), { once: true });
        nextAudio.addEventListener('error', reject, { once: true });
      });

      // Iniciar reproducción del siguiente
      await nextAudio.play();

      // Realizar el crossfade
      const steps = 60; // 60 pasos para suavidad
      const stepDuration = opts.duration / steps;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        
        // Aplicar curva de fade
        const fadeValue = this.applyCurve(progress, opts.curve);
        
        currentAudio.volume = Math.max(0, 1 - fadeValue);
        nextAudio.volume = Math.min(1, fadeValue);

        // Esperar al siguiente paso
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }

      // Asegurar volúmenes finales
      currentAudio.volume = 0;
      nextAudio.volume = 1;

      // Pausar y limpiar el audio anterior
      currentAudio.pause();
      currentAudio.currentTime = 0;

      console.log('✅ Crossfade completed');
      return nextAudio;

    } catch (error) {
      console.error('❌ Crossfade error:', error);
      nextAudio.pause();
      throw error;
    }
  }

  /**
   * Fade out suave (al pausar o detener)
   */
  async fadeOut(audio: HTMLAudioElement, duration: number = 1000): Promise<void> {
    const originalVolume = audio.volume;
    const steps = 30;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      audio.volume = originalVolume * (1 - progress);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }

    audio.volume = 0;
    audio.pause();
    audio.volume = originalVolume; // Restaurar para próxima reproducción
  }

  /**
   * Fade in suave (al iniciar reproducción)
   */
  async fadeIn(audio: HTMLAudioElement, targetVolume: number = 1, duration: number = 1000): Promise<void> {
    audio.volume = 0;
    
    const steps = 30;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      audio.volume = targetVolume * progress;
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }

    audio.volume = targetVolume;
  }

  /**
   * Aplica diferentes curvas de fade
   */
  private applyCurve(progress: number, curve: CrossfadeOptions['curve']): number {
    switch (curve) {
      case 'linear':
        return progress;
      
      case 'logarithmic':
        // Curva logarítmica (más natural para audio)
        return Math.pow(progress, 0.5);
      
      case 'exponential':
        // Curva exponencial (fade rápido al principio)
        return Math.pow(progress, 2);
      
      default:
        return progress;
    }
  }

  /**
   * Crossfade automático al final de la canción
   */
  setupAutoCrossfade(
    audio: HTMLAudioElement,
    onNeedNext: () => Promise<string>,
    options: Partial<CrossfadeOptions> = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    const checkCrossfade = async () => {
      const timeRemaining = audio.duration - audio.currentTime;
      
      // Iniciar crossfade X segundos antes del final
      if (timeRemaining <= opts.duration / 1000 && timeRemaining > 0) {
        try {
          const nextUrl = await onNeedNext();
          await this.crossfade(audio, nextUrl, opts);
        } catch (error) {
          console.error('Auto-crossfade failed:', error);
        }
      }
    };

    // Verificar cada segundo
    const interval = setInterval(checkCrossfade, 1000);

    // Cleanup
    return () => clearInterval(interval);
  }
}

// Singleton instance
export const crossfadeManager = new CrossfadeManager();
