import type { Track } from "./library.store.svelte";
import { audioManager } from "@/lib/utils/audioManager";
import { untrack } from "svelte";

export type RepeatMode = "off" | "one" | "all";

// 🎯 Constantes de configuración
const RESTART_TRACK_THRESHOLD = 3; // segundos
const DEFAULT_VOLUME = 70;

class PlayerStore {
  // Propiedades de estado reactivo
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  originalQueue = $state<Track[]>([]); // Cola original antes de shuffle
  currentIndex = $state(0);
  isPlaying = $state(false);
  volume = $state(DEFAULT_VOLUME);
  isMuted = $state(false);
  progress = $state(0); // 0-100
  currentTime = $state(0); // segundos
  duration = $state(0); // segundos
  isShuffle = $state(false);
  repeatMode = $state<RepeatMode>("off");
  error = $state<string | null>(null);

  // Estados derivados
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);
  queueLength = $derived(this.queue.length);
  formattedTime = $derived(this.formatTime(this.currentTime));
  formattedDuration = $derived(this.formatTime(this.duration));

  /**
   * 🎵 Método optimizado para cargar track con batch updates
   * Actualiza todas las propiedades de estado de forma atómica
   */
  loadTrack(track: Track, shouldPlay: boolean = true) {
    // Actualizar todas las propiedades de estado juntas
    // En Svelte 5, las mutaciones directas en objetos/arrays reactivos son seguras
    this.isPlaying = shouldPlay;
    this.duration = track.duration || 0;
    this.currentTime = 0;
    this.progress = 0;
    this.error = null;
    this.current = track;

    // Actualizar MediaSession
    if (typeof window !== 'undefined') {
      audioManager.updateMediaSession({
        title: track.title || undefined,
        artist: track.artist || undefined,
        album: track.album || undefined
      });
    }
  }

  /**
   * Busca a una posición específica (0-100)
   */
  seek(percentage: number) {
    this.progress = Math.max(0, Math.min(100, percentage));
    this.currentTime = (this.progress / 100) * this.duration;
    if (typeof window !== 'undefined') {
      audioManager.seek(percentage);
    }
  }

  /**
   * ⏱️ Formatea segundos a MM:SS
   */
  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const playerStore = new PlayerStore();

/**
 * 🎵 Reproduce una canción
 */
export async function play(track: Track, addToQueue = true): Promise<void> {
  try {
    // Actualizar cola si es necesario
    if (addToQueue) {
      // Si no está en la cola, agregarlo
      const trackIndex = playerStore.queue.findIndex(t => t.path === track.path);
      if (trackIndex === -1) {
        // Reasignar array completo (mejor práctica Svelte 5)
        playerStore.queue = [...playerStore.queue, track];
        playerStore.currentIndex = playerStore.queue.length - 1;
      } else {
        playerStore.currentIndex = trackIndex;
      }
    }

    // Usar método optimizado para actualizar estado
    playerStore.loadTrack(track, true);

    // Reproducir el audio real
    if (typeof window !== 'undefined') {
      await audioManager.play(track.path);
      console.log('✅ Reproduciendo:', track.title || track.path);
    }
  } catch (error) {
    playerStore.error = `Error al reproducir: ${error}`;
    console.error('❌ Error en play():', error);
    throw error;
  }
}

/**
 * Pausa la reproducción
 */
export function pause() {
  playerStore.isPlaying = false;

  if (typeof window !== 'undefined') {
    audioManager.pause();
  }
}

/**
 * Alterna entre play/pause
 */
export function togglePlay() {
  if (playerStore.isPlaying) {
    pause();
  } else if (playerStore.current) {
    resume();
  }
}

/**
 * Reanuda la reproducción
 */
export function resume() {
  if (playerStore.current) {
    playerStore.isPlaying = true;

    if (typeof window !== 'undefined') {
      audioManager.resume();
    }
  }
}

/**
 * Detiene la reproducción
 */
export function stop() {
  playerStore.isPlaying = false;
  playerStore.currentTime = 0;
  playerStore.progress = 0;

  if (typeof window !== 'undefined') {
    audioManager.stop();
  }
}

/**
 * Salta a la siguiente canción
 */
export function next() {
  if (playerStore.hasNext) {
    playerStore.currentIndex++;
    const trackToPlay = playerStore.queue[playerStore.currentIndex];

    // Usar método batch para actualizar estado
    playerStore.loadTrack(trackToPlay, true);

    if (typeof window !== 'undefined') {
      audioManager.play(trackToPlay.path);
    }
  } else if (playerStore.repeatMode === "all" && playerStore.queue.length > 0) {
    playerStore.currentIndex = 0;
    const trackToPlay = playerStore.queue[0];

    // Usar método batch para actualizar estado
    playerStore.loadTrack(trackToPlay, true);

    if (typeof window !== 'undefined') {
      audioManager.play(trackToPlay.path);
    }
  }
}

/**
 * ⏮️ Vuelve a la canción anterior
 */
export function previous() {
  if (playerStore.currentTime > RESTART_TRACK_THRESHOLD) {
    // Si llevamos más de X segundos, reinicia la canción actual
    console.log('🔄 Reiniciando track actual');
    seek(0);
  } else if (playerStore.hasPrevious) {
    playerStore.currentIndex--;
    const trackToPlay = playerStore.queue[playerStore.currentIndex];

    // Usar método batch para actualizar estado
    playerStore.loadTrack(trackToPlay, true);

    if (typeof window !== 'undefined') {
      audioManager.play(trackToPlay.path);
    }
  } else {
    console.log('⚠️ No hay track anterior');
  }
}

/**
 * Establece el volumen (0-100)
 */
export function setVolume(volume: number) {
  playerStore.volume = Math.max(0, Math.min(100, volume));
  if (playerStore.volume > 0) {
    playerStore.isMuted = false;
  }

  if (typeof window !== 'undefined') {
    audioManager.setVolume(playerStore.volume);
  }
}

/**
 * Alterna el mute
 */
export function toggleMute() {
  playerStore.isMuted = !playerStore.isMuted;

  if (typeof window !== 'undefined') {
    audioManager.setMuted(playerStore.isMuted);
  }
}

/**
 * Busca a una posición específica (0-100)
 * Usa el método interno de la clase para mantener consistencia
 */
export function seek(percentage: number) {
  playerStore.seek(percentage);
}

/**
 * ⏱️ Actualiza el tiempo actual (llamado por audioManager)
 */
export function updateTime(currentTime: number) {
  // Evitar actualizaciones innecesarias si el tiempo no cambió significativamente
  if (Math.abs(playerStore.currentTime - currentTime) < 0.5) return;

  playerStore.currentTime = currentTime;
  if (playerStore.duration > 0) {
    playerStore.progress = Math.min(100, (currentTime / playerStore.duration) * 100);
  }
}

/**
 * Alterna shuffle
 */
export function toggleShuffle() {
  playerStore.isShuffle = !playerStore.isShuffle;

  if (playerStore.isShuffle) {
    // Guardar la cola original antes de mezclar
    playerStore.originalQueue = [...playerStore.queue];
    shuffleQueue();
  } else {
    // Restaurar la cola original
    restoreOriginalQueue();
  }
}

/**
 * Mezcla la cola de reproducción
 */
function shuffleQueue() {
  const current = playerStore.queue[playerStore.currentIndex];
  const remaining = playerStore.queue.filter((_, i) => i !== playerStore.currentIndex);

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  playerStore.queue = [current, ...remaining];
  playerStore.currentIndex = 0;
}

/**
 * Restaura la cola original después de desactivar shuffle
 */
function restoreOriginalQueue() {
  if (playerStore.originalQueue.length === 0) return;

  const currentTrack = playerStore.current;

  // Restaurar la cola original
  playerStore.queue = [...playerStore.originalQueue];

  if (currentTrack) {
    const originalIndex = playerStore.queue.findIndex((t) => t.path === currentTrack.path);
    if (originalIndex !== -1) {
      playerStore.currentIndex = originalIndex;
    }
  }
}

/**
 * 🎼 Establece la cola de reproducción
 */
export async function setQueue(tracks: Track[], startIndex = 0): Promise<void> {
  const trackToPlay = tracks[startIndex];
  if (!trackToPlay) {
    console.warn('⚠️ No hay track para reproducir en el índice', startIndex);
    return;
  }

  try {
    // Actualizar la cola primero (sin disparar el track load todavía)
    playerStore.queue = tracks;
    playerStore.originalQueue = [...tracks];
    playerStore.currentIndex = startIndex;

    // Usar el método batch para actualizar todo el estado del track de una vez
    playerStore.loadTrack(trackToPlay, true);

    // Solo reproducir el audio después de actualizar el estado
    if (typeof window !== 'undefined') {
      await audioManager.play(trackToPlay.path);
      console.log(`🎵 Cola establecida: ${tracks.length} tracks, iniciando en índice ${startIndex}`);
    }
  } catch (error) {
    playerStore.error = `Error al establecer cola: ${error}`;
    console.error('❌ Error en setQueue():', error);
    throw error;
  }
}

/**
 * Cicla el modo de repetición
 */
export function toggleRepeat() {
  const modes: RepeatMode[] = ["off", "all", "one"];
  const currentIdx = modes.indexOf(playerStore.repeatMode);
  playerStore.repeatMode = modes[(currentIdx + 1) % modes.length];
}

/**
 * ➕ Agrega una canción a la cola
 */
export function addToQueue(track: Track) {
  // Evitar duplicados
  const exists = playerStore.queue.some(t => t.path === track.path);
  if (!exists) {
    playerStore.queue = [...playerStore.queue, track];
    console.log('➕ Track agregado a la cola:', track.title || track.path);
  } else {
    console.log('⚠️ Track ya existe en la cola');
  }
}

/**
 * ➕ Agrega múltiples canciones a la cola
 */
export function addMultipleToQueue(tracks: Track[]) {
  // Filtrar duplicados
  const newTracks = tracks.filter(track =>
    !playerStore.queue.some(t => t.path === track.path)
  );

  if (newTracks.length > 0) {
    playerStore.queue = [...playerStore.queue, ...newTracks];
    console.log(`➕ ${newTracks.length} tracks agregados a la cola`);
  } else {
    console.log('⚠️ Todos los tracks ya existen en la cola');
  }
}

/**
 * 🗑️ Elimina un track de la cola por índice
 */
export function removeFromQueue(index: number) {
  if (index < 0 || index >= playerStore.queue.length) {
    console.warn('⚠️ Índice inválido:', index);
    return;
  }

  const removed = playerStore.queue[index];
  playerStore.queue = playerStore.queue.filter((_, i) => i !== index);

  // Ajustar currentIndex si es necesario
  if (index < playerStore.currentIndex) {
    playerStore.currentIndex--;
  } else if (index === playerStore.currentIndex && playerStore.queue.length > 0) {
    // Si eliminamos la canción actual, reproducir la siguiente
    next();
  }

  console.log('🗑️ Track eliminado de la cola:', removed.title || removed.path);
}

/**
 * 🔄 Limpia toda la cola
 */
export function clearQueue() {
  stop();
  playerStore.queue = [];
  playerStore.originalQueue = [];
  playerStore.currentIndex = 0;
  playerStore.current = null;
  console.log('🔄 Cola limpiada');
}
