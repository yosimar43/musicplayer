/**
 * 🎯 USE PLAYER HOOK
 * 
 * RESPONSABILIDADES:
 * ✅ Orquesta playerStore + audioManager
 * ✅ Inicializa audioManager con callbacks
 * ✅ Escucha eventos de audio (timeupdate, ended, error)
 * ✅ Maneja MediaSession API
 * ✅ Expone acciones coordinadas (play, pause, next, etc.)
 * ✅ Maneja cleanup
 * 
 * PRINCIPIOS:
 * - Hook → puede depender de stores y adapters
 * - Centraliza TODA la lógica de reproducción
 * - playerStore solo tiene estado puro
 * 
 * ⚠️ SINGLETON: Evita múltiples audioManager
 */

import { playerStore } from '@/lib/stores/player.store.svelte';
import { audioManager } from '@/lib/utils/audioManager';
import type { Track } from '@/lib/stores/library.store.svelte';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface UsePlayerReturn {
  // Estado (desde store, solo lectura)
  readonly current: Track | null;
  readonly queue: Track[];
  readonly isPlaying: boolean;
  readonly volume: number;
  readonly isMuted: boolean;
  readonly progress: number;
  readonly currentTime: number;
  readonly duration: number;
  readonly formattedTime: string;
  readonly formattedDuration: string;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
  readonly isShuffle: boolean;
  readonly repeatMode: 'off' | 'one' | 'all';
  readonly error: string | null;
  readonly isInitialized: boolean;

  // Acciones
  initialize: () => void;
  play: (track: Track, addToQueue?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  stop: () => void;
  seek: (percentage: number) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  
  // Control de cola
  addToQueue: (track: Track) => void;
  addMultipleToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => boolean;
  clearQueue: () => void;
  
  // Shuffle y Repeat
  toggleShuffle: () => void;
  toggleRepeat: () => void;

  // Lifecycle
  cleanup: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON PATTERN - Evita múltiples audioManager
// ═══════════════════════════════════════════════════════════════════════════

let _instance: UsePlayerReturn | null = null;
let _isInitialized = false;

/**
 * Hook principal para reproducción de audio
 * 
 * ⚠️ SINGLETON: Todas las llamadas retornan la misma instancia
 */
export function usePlayer(): UsePlayerReturn {
  if (_instance) return _instance;

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el reproductor con callbacks que actualizan el store
   */
  function initialize(): void {
    if (_isInitialized || audioManager.isInitialized()) {
      console.log('🎵 usePlayer ya inicializado');
      _isInitialized = true;
      return;
    }

    audioManager.initialize({
      onTimeUpdate: (currentTime) => {
        playerStore.setTime(currentTime);
      },
      onEnded: () => {
        handleTrackEnded();
      },
      onError: (error) => {
        playerStore.setError(error);
        playerStore.setPlaying(false);
      },
      onLoadedMetadata: (duration) => {
        playerStore.setDuration(duration);
      },
      onCanPlay: () => {
        console.log('✅ Audio listo para reproducir');
      }
    });

    _isInitialized = true;
    console.log('🎵 usePlayer inicializado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS PARA SINCRONIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  // Sincronizar volumen del store con audioManager
  $effect(() => {
    if (_isInitialized) {
      audioManager.setVolume(playerStore.volume);
    }
  });

  // Sincronizar mute del store con audioManager
  $effect(() => {
    if (_isInitialized) {
      audioManager.setMuted(playerStore.isMuted);
    }
  });

  // Actualizar MediaSession cuando cambia el track
  $effect(() => {
    if (playerStore.current) {
      audioManager.updateMediaSession({
        title: playerStore.current.title ?? undefined,
        artist: playerStore.current.artist ?? undefined,
        album: playerStore.current.album ?? undefined,
        artwork: playerStore.current.albumArt ?? undefined
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES COORDINADAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reproduce un track
   */
  async function play(track: Track, addToQueue = true): Promise<void> {
    if (!_isInitialized) initialize();

    try {
      // Actualizar cola si es necesario
      if (addToQueue) {
        const trackIndex = playerStore.queue.findIndex(t => t.path === track.path);
        if (trackIndex === -1) {
          playerStore.addToQueue(track);
          playerStore.goToIndex(playerStore.queue.length - 1);
        } else {
          playerStore.goToIndex(trackIndex);
        }
      }

      // Actualizar estado
      playerStore.setCurrentTrack(track);
      playerStore.setPlaying(true);

      // Reproducir audio
      await audioManager.play(track.path);
      console.log('✅ Reproduciendo:', track.title || track.path);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      playerStore.setError(`Error al reproducir: ${errorMsg}`);
      playerStore.setPlaying(false);
      throw error;
    }
  }

  /**
   * Pausa la reproducción
   */
  function pause(): void {
    audioManager.pause();
    playerStore.setPlaying(false);
  }

  /**
   * Reanuda la reproducción
   */
  function resume(): void {
    if (playerStore.current) {
      audioManager.resume();
      playerStore.setPlaying(true);
    }
  }

  /**
   * Alterna play/pause
   */
  function togglePlay(): void {
    if (playerStore.isPlaying) {
      pause();
    } else {
      resume();
    }
  }

  /**
   * Detiene la reproducción
   */
  function stop(): void {
    audioManager.stop();
    playerStore.setPlaying(false);
    playerStore.setTime(0);
  }

  /**
   * Busca a una posición (0-100)
   */
  function seek(percentage: number): void {
    playerStore.setProgress(percentage);
    audioManager.seek(percentage);
  }

  /**
   * Salta al siguiente track
   */
  async function next(): Promise<void> {
    const track = playerStore.goToNext();
    if (track) {
      playerStore.setPlaying(true);
      await audioManager.play(track.path);
    }
  }

  /**
   * Salta al track anterior o reinicia el actual
   */
  async function previous(): Promise<void> {
    const { track, shouldRestart } = playerStore.goToPrevious();
    
    if (shouldRestart && track) {
      seek(0);
    } else if (track) {
      playerStore.setPlaying(true);
      await audioManager.play(track.path);
    }
  }

  /**
   * Establece el volumen
   */
  function setVolume(volume: number): void {
    playerStore.setVolume(volume);
    // El $effect sincronizará con audioManager
  }

  /**
   * Alterna mute
   */
  function toggleMute(): void {
    playerStore.toggleMute();
    // El $effect sincronizará con audioManager
  }

  /**
   * Establece la cola y empieza a reproducir
   */
  async function setQueue(tracks: Track[], startIndex = 0): Promise<void> {
    if (!_isInitialized) initialize();

    const track = tracks[startIndex];
    if (!track) return;

    playerStore.setQueue(tracks, startIndex);
    playerStore.setPlaying(true);

    try {
      await audioManager.play(track.path);
      console.log(`🎵 Cola establecida: ${tracks.length} tracks, iniciando en índice ${startIndex}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      playerStore.setError(`Error al establecer cola: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Maneja el fin de un track
   */
  async function handleTrackEnded(): Promise<void> {
    console.log('🏁 Track terminado');

    if (playerStore.repeatMode === 'one') {
      // Repetir el track actual
      if (playerStore.current) {
        await audioManager.play(playerStore.current.path);
      }
    } else {
      // Ir al siguiente
      await next();
    }
  }

  /**
   * Limpia recursos
   */
  function cleanup(): void {
    audioManager.destroy();
    _isInitialized = false;
    console.log('🧹 usePlayer limpiado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  _instance = {
    // Estado (desde store, solo lectura)
    get current() { return playerStore.current; },
    get queue() { return playerStore.queue; },
    get isPlaying() { return playerStore.isPlaying; },
    get volume() { return playerStore.volume; },
    get isMuted() { return playerStore.isMuted; },
    get progress() { return playerStore.progress; },
    get currentTime() { return playerStore.currentTime; },
    get duration() { return playerStore.duration; },
    get formattedTime() { return playerStore.formattedTime; },
    get formattedDuration() { return playerStore.formattedDuration; },
    get hasNext() { return playerStore.hasNext; },
    get hasPrevious() { return playerStore.hasPrevious; },
    get isShuffle() { return playerStore.isShuffle; },
    get repeatMode() { return playerStore.repeatMode; },
    get error() { return playerStore.error; },
    get isInitialized() { return _isInitialized; },

    // Acciones
    initialize,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    seek,
    next,
    previous,
    setVolume,
    toggleMute,
    setQueue,
    
    // Control de cola
    addToQueue: playerStore.addToQueue.bind(playerStore),
    addMultipleToQueue: playerStore.addMultipleToQueue.bind(playerStore),
    removeFromQueue: playerStore.removeFromQueue.bind(playerStore),
    clearQueue: playerStore.clearQueue.bind(playerStore),
    
    // Shuffle y Repeat
    toggleShuffle: playerStore.toggleShuffle.bind(playerStore),
    toggleRepeat: playerStore.toggleRepeat.bind(playerStore),

    // Lifecycle
    cleanup
  };

  return _instance;
}

/**
 * Reset para testing - NO usar en producción
 */
export function resetPlayerInstance() {
  if (_instance) {
    _instance.cleanup();
  }
  _instance = null;
  _isInitialized = false;
}
