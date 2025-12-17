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

  // Web Audio API infrastructure (for waveform visualization)
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private webAudioInitialized = false;

  constructor() {
    // No crear el audio element aquí - se creará de forma lazy
    this.ensureAudioElement();
  }

  /**
   * 🎵 Initialize Web Audio API for waveform visualization
   * This MUST only be called ONCE per audio element lifetime
   * Returns true if already initialized or successfully initialized
   */
  initializeWebAudio(): boolean {
    if (this.webAudioInitialized) return true;
    if (!this.audio) {
      console.warn('⚠️ AudioManager: Cannot init Web Audio - no audio element');
      return false;
    }

    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create analyser with optimized settings for visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // 128 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      // Create source from audio element - THIS CAN ONLY BE DONE ONCE
      this.source = this.audioContext.createMediaElementSource(this.audio);

      // Connect: source → analyser → destination
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.webAudioInitialized = true;
      console.log('✅ AudioManager: Web Audio API initialized for visualization');
      return true;
    } catch (error) {
      console.error('❌ AudioManager: Failed to initialize Web Audio:', error);
      return false;
    }
  }

  /**
   * 🎤 Get the analyser node for read-only frequency data access
   * Used by waveform visualization - NEVER modify the returned node
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * 🔊 Get the AudioContext for checking state
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * 🔄 Resume AudioContext if suspended (required after user interaction)
   */
  async resumeAudioContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('▶️ AudioContext resumed');
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
      }
    }
  }

  /**
   * Asegurar que el audio element existe
   */
  private ensureAudioElement(): void {
    if (this.audio) return;

    if (typeof window === 'undefined') {
      console.warn('⚠️ AudioManager: No estamos en el navegador');
      return;
    }

    try {
      this.audio = new Audio();
      this.audio.crossOrigin = "anonymous"; // Essential for Web Audio API
      this.audio.preload = "metadata";
      console.log('✅ AudioManager: Elemento de audio creado');
    } catch (error) {
      console.error('❌ AudioManager: Error creando elemento de audio:', error);
    }
  }

  /**
   * 🔌 Inicializa el manager con callbacks para eventos
   * Debe llamarse antes de usar cualquier otro método
   */
  initialize(callbacks: AudioCallbacks): void {
    this.ensureAudioElement();

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

    // ❌ Manejo de errores mejorado
    const errorHandler = () => {
      console.error('❌ [AudioManager] Error del elemento de audio');
      if (this.audio?.error) {
        const error = this.audio.error;
        const errorMessages: Record<number, string> = {
          [error.MEDIA_ERR_ABORTED]: 'Reproducción abortada por el usuario',
          [error.MEDIA_ERR_NETWORK]: 'Error de red al cargar el audio',
          [error.MEDIA_ERR_DECODE]: 'El archivo de audio está corrupto o dañado',
          [error.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'Formato de audio no soportado'
        };

        const userFriendlyMsg = errorMessages[error.code] || 'Error desconocido al reproducir';
        console.error(`🔴 Código de error: ${error.code} - ${userFriendlyMsg}`);

        callbacks.onError(userFriendlyMsg);
      } else {
        callbacks.onError('Error desconocido al reproducir el audio');
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
   * ✅ OPTIMIZACIÓN: Retry logic para errores de red
   */
  async play(filePathOrUrl: string, retries = 3): Promise<void> {
    this.ensureAudioElement();

    if (!this.audio) {
      throw new Error('Audio element no disponible');
    }

    if (!filePathOrUrl || filePathOrUrl.trim() === '') {
      throw new Error('Ruta o URL inválida');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
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

        // Si llegamos aquí, éxito
        if (attempt > 0) {
          console.log(`✅ Reproducción exitosa después de ${attempt + 1} intentos`);
        }
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Error desconocido');

        // No reintentar para errores no recuperables
        if (lastError.message.includes('inválida') ||
          lastError.message.includes('no soportado') ||
          lastError.name === 'NotSupportedError') {
          console.error('❌ Error no recuperable:', lastError.message);
          throw lastError;
        }

        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
          console.warn(`⚠️ Intento ${attempt + 1}/${retries} falló, reintentando en ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    const errorMsg = lastError?.message || 'Error desconocido';
    console.error(`❌ Error reproduciendo después de ${retries} intentos:`, errorMsg);

    // Categorizar error para mejor manejo
    const errorCategory = this.categorizeError(lastError);
    throw new Error(`${errorCategory}: ${errorMsg}`);
  }

  /**
   * Precarga un archivo de audio sin reproducir
   */
  async preload(filePathOrUrl: string): Promise<void> {
    if (!this.audio) return;

    const src = filePathOrUrl.startsWith('http')
      ? filePathOrUrl
      : convertFileSrc(filePathOrUrl);

    if (this.audio.src !== src) {
      this.audio.src = src;
      this.audio.load();
    }
  }

  /**
   * ✅ NUEVO: Categoriza errores para mejor UX
   */
  private categorizeError(error: Error | null): string {
    if (!error) return 'Error desconocido';

    const msg = error.message.toLowerCase();

    if (msg.includes('red') || msg.includes('network')) {
      return 'Error de red';
    }
    if (msg.includes('decode') || msg.includes('decodificación')) {
      return 'Archivo corrupto';
    }
    if (msg.includes('no soportado') || msg.includes('not supported')) {
      return 'Formato no soportado';
    }
    if (msg.includes('aborted') || msg.includes('abortada')) {
      return 'Reproducción cancelada';
    }

    return 'Error de reproducción';
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
    this.ensureAudioElement();

    if (!this.audio) {
      console.warn('⚠️ No hay elemento de audio disponible para seek');
      return;
    }

    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    const duration = this.audio.duration;

    if (!duration || isNaN(duration) || !isFinite(duration)) {
      console.warn('⚠️ No se puede buscar: duración no disponible');
      return;
    }

    const newTime = (clampedPercentage / 100) * duration;
    this.audio.currentTime = newTime;

    // Disparar callback inmediatamente con el nuevo tiempo
    if (this.callbacks) {
      this.callbacks.onTimeUpdate(newTime);
    }
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
    // Clean up Web Audio API resources
    if (this.source) {
      try { this.source.disconnect(); } catch (e) { /* ignore */ }
      this.source = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) { /* ignore */ }
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
    this.webAudioInitialized = false;

    // Clean up audio element
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
