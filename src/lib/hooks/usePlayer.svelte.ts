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

import { untrack } from 'svelte';
import { tick } from 'svelte';
import { playerStore } from '@/lib/stores/player.store.svelte';
import { audioManager } from '@/lib/utils/audioManager';
import { EnrichmentService } from '@/lib/services/enrichment.service';
import { useKeyboard } from './useKeyboard.svelte';
import { useLibrary } from './useLibrary.svelte';
import type { Track } from '@/lib/stores/library.store.svelte';

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCIA DE VOLUMEN
// ═══════════════════════════════════════════════════════════════════════════

const VOLUME_STORAGE_KEY = 'player-volume';
const DEFAULT_VOLUME = 70;

function getPersistedVolume(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
  const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
  return saved ? Number(saved) : DEFAULT_VOLUME;
}

function persistVolume(volume: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
}

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
  playOrToggle: () => Promise<void>;
  stop: () => void;
  seek: (percentage: number) => void;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQueue: (tracks: Track[], startIndex?: number, sort?: boolean) => Promise<void>;
  playQueue: (tracks: Track[], startIndex?: number, sort?: boolean) => Promise<void>;

  // Control de cola
  addToQueue: (track: Track) => void;
  insertToQueue: (track: Track, index: number) => void;
  addMultipleToQueue: (tracks: Track[]) => void;
  enqueueNext: (track: Track) => void;
  enqueueNextMultiple: (tracks: Track[]) => void;
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

  const keyboard = useKeyboard();
  const library = useLibrary();

  // Keyboard handlers
  const handleSpace = async (e: KeyboardEvent) => {
    e.preventDefault();
    console.log('🎵 Space pressed - calling playOrToggle');
    await playOrToggle();
    console.log('🎵 Space handling complete');
  };

  const handleArrowLeft = (e: KeyboardEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 5;
    seek(Math.max(0, playerStore.progress - step));
  };

  const handleArrowRight = (e: KeyboardEvent) => {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 5;
    seek(Math.min(100, playerStore.progress + step));
  };

  const handleN = (e: KeyboardEvent) => {
    e.preventDefault();
    next();
  };

  const handleP = (e: KeyboardEvent) => {
    e.preventDefault();
    previous();
  };

  const handleR = (e: KeyboardEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      playerStore.toggleShuffle();
      console.log('🔀 Shuffle toggled via Ctrl+R');
    }
  };

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

    // Cargar volumen persistido
    const savedVolume = getPersistedVolume();
    untrack(() => playerStore.setVolume(savedVolume));

    audioManager.initialize({
      onTimeUpdate: (currentTime) => {
        // ✅ Sincronizar duración si hay discrepancia (corrige metadata errónea)
        const realDuration = audioManager.getDuration();
        // Validar que sea un número finito y positivo
        if (Number.isFinite(realDuration) && realDuration > 0) {
          if (Math.abs(playerStore.duration - realDuration) > 0.5) {
            console.log(`⏱️ Corrigiendo duración: ${playerStore.duration} -> ${realDuration}`);
            playerStore.setDuration(realDuration);
          }
        }

        // ✅ SIEMPRE actualizar el store, incluso durante seek
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

    // Registrar handlers de teclado global
    keyboard.initialize(); // 🔧 FIX: Inicializar keyboard manager antes de agregar handlers
    keyboard.addHandler(' ', handleSpace);
    keyboard.addHandler('ArrowLeft', handleArrowLeft);
    keyboard.addHandler('ArrowRight', handleArrowRight);
    keyboard.addHandler('n', handleN);
    keyboard.addHandler('p', handleP);
    keyboard.addHandler('r', handleR);

    _isInitialized = true;
    console.log('🎵 usePlayer inicializado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS PARA SINCRONIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  // Sincronizar volumen del store con audioManager + persistir
  $effect(() => {
    if (_isInitialized) {
      audioManager.setVolume(playerStore.volume);
      persistVolume(playerStore.volume);
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
      
      // Ensure state is correctly synchronized after playback starts
      // Small delay to let the audio element update its state
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Double-check that we're in the correct playing state
      playerStore.setPlaying(true);
      
      // Force UI update
      await tick();
      
      // Verify audio is actually playing and update state accordingly
      const audioElement = (audioManager as any).audio;
      if (audioElement && !audioElement.paused) {
        playerStore.setPlaying(true);
        console.log('✅ Audio confirmed playing, state updated');
      } else {
        console.log('⚠️ Audio not playing after play() call');
        playerStore.setPlaying(false);
      }

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
   * Alterna play/pause, o inicia reproducción si no hay canción actual
   */
  async function playOrToggle(): Promise<void> {
    console.log('🎵 playOrToggle called - current:', playerStore.current?.title, 'isPlaying:', playerStore.isPlaying);
    
    // If no current track, start playing from queue or library
    if (!playerStore.current) {
      console.log('🎵 No current track, checking queue/library...');
      if (playerStore.queue.length > 0) {
        console.log('🎵 Queue has tracks, calling goToIndex(0)');
        // Set index to first track in queue and play
        const trackAtIndex = playerStore.goToIndex(0);
        console.log('🎵 goToIndex returned track:', !!trackAtIndex, 'current now:', !!playerStore.current);
        if (trackAtIndex) {
          console.log('🎵 Calling play with track:', trackAtIndex.title);
          await play(trackAtIndex, false);
          console.log('🎵 After play - isPlaying:', playerStore.isPlaying);
          // Force UI update
          await tick();
        }
      } else if (library.tracks.length > 0) {
        // Play first track from library
        await play(library.tracks[0], true);
      }
      return;
    }
    
    // Normal toggle play/pause
    togglePlay();
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
    audioManager.seek(percentage);
  }

  /**
   * Salta al siguiente track
   */
  async function next(): Promise<void> {
    let nextTrack: Track | null = null;

    if (playerStore.hasNext) {
      nextTrack = playerStore.queue[playerStore.currentIndex + 1];
    } else if (playerStore.isShuffle && playerStore.queue.length > 0) {
      // Cuando shuffle está activado y se llega al final, remezclar la cola
      console.log('🔀 Shuffle activado - remezclando cola al llegar al final');
      playerStore.shuffleQueue();
      // Después del shuffle, la canción actual está en una nueva posición
      // Intentar ir al siguiente si existe
      if (playerStore.hasNext) {
        nextTrack = playerStore.queue[playerStore.currentIndex + 1];
      }
    }

    if (!nextTrack) return;

    playerStore.setIsTransitioning(true);

    try {
      // Precargar: album art + metadata + audio
      await Promise.all([
        EnrichmentService.getAlbumArt(nextTrack),
        audioManager.preload(nextTrack.path)
      ]);

      const track = playerStore.goToNext();
      if (track) {
        playerStore.setPlaying(true);
        await audioManager.play(track.path);
      }
    } finally {
      playerStore.setIsTransitioning(false);
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
  async function setQueue(tracks: Track[], startIndex = 0, sort = true): Promise<void> {
    if (!_isInitialized) initialize();

    const track = tracks[startIndex];
    if (!track) return;

    playerStore.setQueue(tracks, startIndex, sort);
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
   * Alias más semántico para setQueue - reproduce inmediatamente
   */
  async function playQueue(tracks: Track[], startIndex = 0, sort = true): Promise<void> {
    return setQueue(tracks, startIndex, sort);
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
   * ✅ OPTIMIZACIÓN: Memory leak prevention mejorado
   */
  function cleanup(): void {
    // Remover handlers de teclado
    keyboard.removeHandler(' ', handleSpace);
    keyboard.removeHandler('ArrowLeft', handleArrowLeft);
    keyboard.removeHandler('ArrowRight', handleArrowRight);
    keyboard.removeHandler('n', handleN);
    keyboard.removeHandler('p', handleP);

    // Destruir audioManager (ya se encarga de cleanup interno)
    audioManager.destroy();

    // Reset flags
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
    playOrToggle,
    stop,
    seek,
    next,
    previous,
    setVolume,
    toggleMute,
    setQueue,
    playQueue,

    // Control de cola
    addToQueue: playerStore.addToQueue.bind(playerStore),
    insertToQueue: playerStore.insertToQueue.bind(playerStore),
    addMultipleToQueue: playerStore.addMultipleToQueue.bind(playerStore),
    enqueueNext: playerStore.enqueueNext.bind(playerStore),
    enqueueNextMultiple: playerStore.enqueueNextMultiple.bind(playerStore),
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
