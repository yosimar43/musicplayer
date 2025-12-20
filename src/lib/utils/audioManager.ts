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

// 🎯 Servicio de logging para producción
class DebugLogger {
  private logs: string[] = [];
  private maxLogs = 100;

  log(message: string, level: 'INFO' | 'ERROR' | 'WARN' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    
    // console.log(logEntry);
    this.logs.push(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // En producción, los logs se mantienen en memoria
    // El usuario puede verlos a través del DebugPanel
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const debugLogger = new DebugLogger();

// Initialize with a test log
// debugLogger.log('🔍 DebugLogger initialized - ready to capture audio events');

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
  onPlayStateChange?: (isPlaying: boolean) => void;
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
      debugLogger.log('✅ AudioManager: Web Audio API initialized for visualization');
      return true;
    } catch (error) {
      debugLogger.log(`❌ AudioManager: Failed to initialize Web Audio: ${error}`, 'ERROR');
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
        debugLogger.log('▶️ AudioContext resumed');
      } catch (error) {
        debugLogger.log(`❌ Failed to resume AudioContext: ${error}`, 'ERROR');
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
      debugLogger.log('✅ AudioManager: Elemento de audio creado');
    } catch (error) {
      debugLogger.log(`❌ AudioManager: Error creando elemento de audio: ${error}`, 'ERROR');
    }
  }

  /**
   * 🔌 Inicializa el manager con callbacks para eventos
   * Debe llamarse antes de usar cualquier otro método
   */
  initialize(callbacks: AudioCallbacks): void {
    debugLogger.log('🎵 AudioManager.initialize() called');
    
    this.ensureAudioElement();

    if (!this.audio) {
      debugLogger.log('❌ AudioManager: No hay elemento de audio disponible', 'ERROR');
      return;
    }

    this.callbacks = callbacks;
    this.setupEventListeners();
    this.setupMediaSession();
    debugLogger.log('✅ AudioManager inicializado con callbacks');
  }

  private setupEventListeners(): void {
    if (!this.audio || !this.callbacks) return;

    const callbacks = this.callbacks;

    // 🎵 Cuando cambia el tiempo
    const timeUpdateHandler = () => {
      debugLogger.log(`⏱️ TIMEUPDATE: ${this.audio?.currentTime}`);
      callbacks.onTimeUpdate(this.audio?.currentTime ?? 0);
    };
    this.audio.addEventListener('timeupdate', timeUpdateHandler);
    this.eventListeners.set('timeupdate', timeUpdateHandler);

    // 🔚 Cuando termina la canción
    const endedHandler = () => {
      debugLogger.log('🏁 Track terminado');
      callbacks.onEnded();
    };
    this.audio.addEventListener('ended', endedHandler);
    this.eventListeners.set('ended', endedHandler);

    // ❌ Manejo de errores mejorado
    const errorHandler = () => {
      debugLogger.log('❌ [AudioManager] Error del elemento de audio', 'ERROR');
      if (this.audio?.error) {
        const error = this.audio.error;
        debugLogger.log(`🔍 ERROR DETAILS: code=${error.code}, message="${error.message}"`, 'ERROR');

        const errorMessages: Record<number, string> = {
          [error.MEDIA_ERR_ABORTED]: 'Reproducción abortada por el usuario',
          [error.MEDIA_ERR_NETWORK]: 'Error de red al cargar el audio',
          [error.MEDIA_ERR_DECODE]: 'El archivo de audio está corrupto o dañado',
          [error.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'Formato de audio no soportado'
        };

        const userFriendlyMsg = errorMessages[error.code] || 'Error desconocido al reproducir';
        debugLogger.log(`🔴 Código de error: ${error.code} - ${userFriendlyMsg}`, 'ERROR');

        callbacks.onError(userFriendlyMsg);
      } else {
        debugLogger.log('❌ AUDIO ERROR: No error object available', 'ERROR');
        callbacks.onError('Error desconocido al reproducir el audio');
      }
    };
    this.audio.addEventListener('error', errorHandler);
    this.eventListeners.set('error', errorHandler);

    // 📊 Cuando se carga la metadata
    const loadedMetadataHandler = () => {
      debugLogger.log(`📊 METADATA CARGADA - Duration: ${this.audio?.duration}`);
      callbacks.onLoadedMetadata(this.audio?.duration ?? 0);
    };
    this.audio.addEventListener('loadedmetadata', loadedMetadataHandler);
    this.eventListeners.set('loadedmetadata', loadedMetadataHandler);

    // 🔊 Cuando puede empezar a reproducir
    const canPlayHandler = () => {
      debugLogger.log('✅ CAN PLAY - Audio listo para reproducir');
      callbacks.onCanPlay();
    };
    this.audio.addEventListener('canplay', canPlayHandler);
    this.eventListeners.set('canplay', canPlayHandler);

    // ▶️ Sincronización de estado play/pause
    const playHandler = () => {
      debugLogger.log('▶️ AUDIO PLAY EVENT - Sincronizando estado');
      callbacks.onPlayStateChange?.(true);
    };
    const pauseHandler = () => {
      debugLogger.log('⏸️ AUDIO PAUSE EVENT - Sincronizando estado');
      callbacks.onPlayStateChange?.(false);
    };
    this.audio.addEventListener('play', playHandler);
    this.audio.addEventListener('pause', pauseHandler);
    this.eventListeners.set('play', playHandler);
    this.eventListeners.set('pause', pauseHandler);

    // 🔄 Estado de carga
    const loadStartHandler = () => debugLogger.log('⏳ LOAD START');
    const progressHandler = () => debugLogger.log('📈 PROGRESS');
    const stalledHandler = () => debugLogger.log('⏸️ STALLED');
    const suspendHandler = () => debugLogger.log('⏸️ SUSPEND');

    this.audio.addEventListener('loadstart', loadStartHandler);
    this.audio.addEventListener('progress', progressHandler);
    this.audio.addEventListener('stalled', stalledHandler);
    this.audio.addEventListener('suspend', suspendHandler);

    this.eventListeners.set('loadstart', loadStartHandler);
    this.eventListeners.set('progress', progressHandler);
    this.eventListeners.set('stalled', stalledHandler);
    this.eventListeners.set('suspend', suspendHandler);
  }

  /**
   * 🎮 Configura MediaSession API para controles del sistema
   */
  private setupMediaSession(): void {
    if ('mediaSession' in navigator && this.audio) {
      // MediaSession API disponible
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
          // Strip Windows extended path prefix and normalize to forward slashes
          let cleanPath = filePathOrUrl.replace(/^\\\\\?\\(.+)$/, '$1');
          cleanPath = cleanPath.replace(/\\/g, '/');

          audioUrl = convertFileSrc(cleanPath);
        }

        this.audio.src = audioUrl;
        
        debugLogger.log('▶️ CALLING audio.play()...');
        const playPromise = this.audio.play();
        
        if (playPromise instanceof Promise) {
          playPromise.catch(playError => {
            debugLogger.log(`❌ AUDIO PLAY BLOCKED: ${playError}`, 'ERROR');
            throw playError;
          });
        }
        
        await playPromise;

        // Si llegamos aquí, éxito
        if (attempt > 0) {
          debugLogger.log(`✅ Reproducción exitosa después de ${attempt + 1} intentos`);
        }
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Error desconocido');

        // No reintentar para errores no recuperables
        if (lastError.message.includes('inválida') ||
          lastError.message.includes('no soportado') ||
          lastError.name === 'NotSupportedError') {
          debugLogger.log(`❌ Error no recuperable: ${lastError.message}`, 'ERROR');
          throw lastError;
        }

        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff: 1s, 2s, 4s (max 5s)
          debugLogger.log(`⚠️ Intento ${attempt + 1}/${retries} falló, reintentando en ${delay}ms...`, 'WARN');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    const errorMsg = lastError?.message || 'Error desconocido';
    debugLogger.log(`❌ Error reproduciendo después de ${retries} intentos: ${errorMsg}`, 'ERROR');

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
      : convertFileSrc(filePathOrUrl.replace(/^\\\\\?\\(.+)$/, '$1').replace(/\\/g, '/'));

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
      const currentTimeBefore = this.audio.currentTime;
      this.audio.pause();
      // Workaround for potential Tauri bug where pausing resets currentTime to 0
      if (this.audio.currentTime === 0 && currentTimeBefore > 0.1) {
        this.audio.currentTime = currentTimeBefore;
        debugLogger.log(`⏸️ Restored currentTime from 0 to ${currentTimeBefore}`);
      }
      debugLogger.log('⏸️ Pausado');
    }
  }

  /**
   * ▶️ Reanuda la reproducción
   */
  resume(): void {
    if (this.audio) {
      this.audio.play().catch(error => {
        debugLogger.log(`❌ Error al reanudar: ${error}`, 'ERROR');
      });
      debugLogger.log('▶️ Reanudado');
    }
  }

  /**
   * ⏹️ Detiene la reproducción
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      debugLogger.log('⏹️ Detenido');
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

      // MediaSession actualizada
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

      debugLogger.log('🧹 AudioManager limpiado');
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
