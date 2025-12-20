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
import { audioManager, debugLogger } from '@/lib/utils/audioManager';
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
  readonly isReady: boolean;
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
  readonly isTransitioning: boolean;

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
  playWithSortedQueue: (track: Track) => Promise<void>;

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
    await playOrToggle();
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

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el reproductor con callbacks que actualizan el store
   */
  function initialize(): void {
    if (_isInitialized || audioManager.isInitialized()) {
      debugLogger.log('🎵 usePlayer ya inicializado');
      _isInitialized = true;
      return;
    }

    debugLogger.log('🎵 INICIALIZANDO usePlayer...');

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
            debugLogger.log(`⏱️ Corrigiendo duración: ${playerStore.duration} -> ${realDuration}`);
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
        debugLogger.log(`❌ AUDIO ERROR CALLBACK: ${error}`, 'ERROR');
        playerStore.setError(error);
        playerStore.setPlaying(false);
      },
      onLoadedMetadata: (duration) => {
        debugLogger.log(`📊 LOADED METADATA CALLBACK - Duration: ${duration}`);
        playerStore.setDuration(duration);
      },
      onCanPlay: () => {
        debugLogger.log('✅ CAN PLAY CALLBACK - Canción lista para reproducir');
        playerStore.setReady(true);
      },
      onPlayStateChange: (isPlaying) => {
        debugLogger.log(`🔄 PLAY STATE CHANGE CALLBACK - Audio isPlaying: ${isPlaying}`);
        // Sincronizar el estado del store con el estado real del audio
        playerStore.setPlaying(isPlaying);
      }
    });

    // Registrar handlers de teclado global
    // keyboard.initialize(); // Ya se inicializa ANTES en useMasterHook
    keyboard.addHandler(' ', handleSpace);
    keyboard.addHandler('ArrowLeft', handleArrowLeft);
    keyboard.addHandler('ArrowRight', handleArrowRight);
    keyboard.addHandler('n', handleN);
    keyboard.addHandler('p', handleP);

    _isInitialized = true;
    // usePlayer inicializado
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

    debugLogger.log(`🎵 PLAY CALLED - Track: ${track.title || track.path}, Path: ${track.path}`);

    // Reset ready state when starting new track
    playerStore.setReady(false);

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
      debugLogger.log('🎵 CALLING audioManager.play()...');
      await audioManager.play(track.path);
      debugLogger.log('✅ audioManager.play() COMPLETED');
      
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
        debugLogger.log('✅ Audio confirmed playing, state updated');
      } else {
        debugLogger.log('⚠️ Audio not playing after play() call', 'WARN');
        playerStore.setPlaying(false);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      debugLogger.log(`❌ PLAY ERROR: ${errorMsg}`, 'ERROR');
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
    // No actualizar store aquí - dejar que onPlayStateChange lo haga cuando el audio realmente pause
  }

  /**
   * Reanuda la reproducción
   */
  function resume(): void {
    if (playerStore.current) {
      audioManager.resume();
      // No actualizar store aquí - dejar que onPlayStateChange lo haga cuando el audio realmente reanude
    }
  }

  /**
   * Alterna play/pause, o inicia reproducción si no hay canción actual
   */
  async function playOrToggle(): Promise<void> {
    
    // If no current track, start playing from queue or library
    if (!playerStore.current) {
      if (playerStore.queue.length > 0) {
        // Set index to first track in queue and play
        const trackAtIndex = playerStore.goToIndex(0);
        if (trackAtIndex) {
          await play(trackAtIndex, false);
          // Force UI update
          await tick();
        }
      } else if (library.tracks.length > 0) {
        if (playerStore.isShuffle) {
          // Shuffle and play first random track
          const shuffledTracks = shuffleArray(library.tracks);
          await playQueue(shuffledTracks, 0, false);
        } else {
          // Play first sorted track
          const sortedTracks = getSortedTracks();
          await playWithSortedQueue(sortedTracks[0]);
        }
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
   * Salta al siguiente track o repite el actual si es el último
   */
  async function next(): Promise<void> {
    if (playerStore.queue.length === 0 || playerStore.isTransitioning) return;

    let nextTrack: Track | null = null;
    let shouldRepeat = false;

    if (playerStore.currentIndex < playerStore.queue.length - 1) {
      // Hay siguiente track
      nextTrack = playerStore.queue[playerStore.currentIndex + 1];
      playerStore.setCurrentIndex(playerStore.currentIndex + 1);
    } else {
      // Es el último, repetir el actual
      nextTrack = playerStore.current;
      shouldRepeat = true;
    }

    if (!nextTrack) return;

    playerStore.setIsTransitioning(true);

    try {
      if (!shouldRepeat) {
        // Precargar para navegación normal
        await Promise.all([
          EnrichmentService.getAlbumArt(nextTrack),
          audioManager.preload(nextTrack.path)
        ]);
      }

      // setCurrentTrack ya se hizo en setCurrentIndex o es el mismo para repeat
      playerStore.setPlaying(true);
      await audioManager.play(nextTrack.path);
    } finally {
      playerStore.setIsTransitioning(false);
    }
  }

  /**
   * Salta al track anterior o va al último si es el primero
   */
  async function previous(): Promise<void> {
    if (playerStore.queue.length === 0 || playerStore.isTransitioning) return;

    let prevTrack: Track | null = null;
    let shouldRestart = false;

    if (playerStore.currentIndex > 0) {
      // Hay track anterior
      prevTrack = playerStore.queue[playerStore.currentIndex - 1];
      playerStore.setCurrentIndex(playerStore.currentIndex - 1);
    } else {
      // Es el primero, ir al último
      const lastIndex = playerStore.queue.length - 1;
      prevTrack = playerStore.queue[lastIndex];
      playerStore.setCurrentIndex(lastIndex);
    }

    if (!prevTrack) return;

    playerStore.setIsTransitioning(true);

    try {
      // Precargar
      await Promise.all([
        EnrichmentService.getAlbumArt(prevTrack),
        audioManager.preload(prevTrack.path)
      ]);

      // setCurrentTrack ya se hizo en setCurrentIndex
      playerStore.setPlaying(true);
      await audioManager.play(prevTrack.path);
    } finally {
      playerStore.setIsTransitioning(false);
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
   * 🎯 UTILIDAD: Obtiene tracks ordenados alfabéticamente (lógica centralizada)
   * ✅ Reutilizada por playWithSortedQueue y playOrToggle
   */
  function getSortedTracks(): Track[] {
    const grouped = new Map<string, typeof library.tracks>();

    for (const track of library.tracks) {
      const firstChar = (track.title || track.path).charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

      if (!grouped.has(letter)) {
        grouped.set(letter, []);
      }
      grouped.get(letter)!.push(track);
    }

    // Ordenar tracks dentro de cada grupo alfabéticamente
    for (const tracks of grouped.values()) {
      tracks.sort((a, b) => {
        const titleA = (a.title || a.path).toLowerCase();
        const titleB = (b.title || b.path).toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }

    // Flatten groups in alphabetical order (A-Z first, then #)
    return Array.from(grouped.entries())
      .sort((a, b) => {
        if (a[0] === '#') return 1;
        if (b[0] === '#') return -1;
        return a[0].localeCompare(b[0]);
      })
      .flatMap(([, tracks]) => tracks);
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 🎯 PLAY WITH SORTED QUEUE - Centraliza la lógica de reproducción con cola ordenada
   * Crea una cola completa ordenada alfabéticamente y reproduce desde la canción especificada
   * ✅ Elimina duplicación de código entre MusicCard3D y playOrToggle
   * ✅ Lógica centralizada para flujo consistente
   */
  async function playWithSortedQueue(track: Track): Promise<void> {
    let tracks: Track[];

    if (playerStore.isShuffle) {
      // For shuffle, shuffle all tracks but put the selected track first
      const allTracks = [...library.tracks];
      const otherTracks = allTracks.filter(t => t.path !== track.path);
      const shuffledOthers = shuffleArray(otherTracks);
      tracks = [track, ...shuffledOthers];
    } else {
      tracks = getSortedTracks();
    }

    const trackIndex = tracks.findIndex((t) => t.path === track.path);
    if (trackIndex !== -1) {
      await setQueue(tracks, trackIndex, false); // sort=false
    } else {
      // Fallback: just play the track
      await play(track);
    }
  }

  /**
   * Maneja el fin de un track
   */
  async function handleTrackEnded(): Promise<void> {

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
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RETORNO
  // ═══════════════════════════════════════════════════════════════════════════

  _instance = {
    // Estado (desde store, solo lectura)
    get current() { return playerStore.current; },
    get queue() { return playerStore.queue; },
    get isPlaying() { return playerStore.isPlaying; },
    get isReady() { return playerStore.isReady; },
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
    get isTransitioning() { return playerStore.isTransitioning; },

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
    playWithSortedQueue,

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
