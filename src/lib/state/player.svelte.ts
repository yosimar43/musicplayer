import type { Track } from "./library.svelte";
import { audioManager } from "@/lib/utils/audioManager";
import { untrack } from "svelte";

export type RepeatMode = "off" | "one" | "all";

// 🎯 Constantes de configuración
const RESTART_TRACK_THRESHOLD = 3; // segundos
const DEFAULT_VOLUME = 70;

class PlayerState {
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
  error = $state<string | null>(null); // ✨ Nuevo: manejo de errores
  
  // Estados derivados
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);
  queueLength = $derived(this.queue.length);
  formattedTime = $derived(this.formatTime(this.currentTime));
  formattedDuration = $derived(this.formatTime(this.duration));
  
  /**
   * 🎵 Método optimizado para cargar track con batch updates
   */
  loadTrack(track: Track, shouldPlay: boolean = true) {
    // Usar untrack para agrupar actualizaciones y prevenir renders intermedios
    untrack(() => {
      this.isPlaying = shouldPlay;
      this.duration = track.duration || 0;
      this.currentTime = 0;
      this.progress = 0;
      this.error = null;
    });
    
    // Actualizar current al final para disparar efectos reactivos una sola vez
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
   * ⏱️ Formatea segundos a MM:SS
   */
  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const player = new PlayerState();

/**
 * 🎵 Reproduce una canción
 */
export async function play(track: Track, addToQueue = true): Promise<void> {
  try {
    // Agrupar todas las actualizaciones de estado juntas para evitar múltiples re-renders
    if (addToQueue) {
      // Si no está en la cola, agregarlo
      const trackIndex = player.queue.findIndex(t => t.path === track.path);
      if (trackIndex === -1) {
        player.queue = [...player.queue, track];
        player.currentIndex = player.queue.length - 1;
      } else {
        player.currentIndex = trackIndex;
      }
    }
    
    // Usar método optimizado para actualizar estado
    player.loadTrack(track, true);
    
    // Reproducir el audio real
    if (typeof window !== 'undefined') {
      await audioManager.play(track.path);
      console.log('✅ Reproduciendo:', track.title || track.path);
    }
  } catch (error) {
    player.error = `Error al reproducir: ${error}`;
    console.error('❌ Error en play():', error);
    throw error;
  }
}

/**
 * Pausa la reproducción
 */
export function pause() {
  player.isPlaying = false;
  
  if (typeof window !== 'undefined') {
    audioManager.pause();
  }
}

/**
 * Alterna entre play/pause
 */
export function togglePlay() {
  if (player.isPlaying) {
    pause();
  } else if (player.current) {
    resume();
  }
}

/**
 * Reanuda la reproducción
 */
export function resume() {
  if (player.current) {
    player.isPlaying = true;
    
    if (typeof window !== 'undefined') {
      audioManager.resume();
    }
  }
}

/**
 * Detiene la reproducción
 */
export function stop() {
  player.isPlaying = false;
  player.currentTime = 0;
  player.progress = 0;
  
  if (typeof window !== 'undefined') {
    audioManager.stop();
  }
}

/**
 * Salta a la siguiente canción
 */
export function next() {
  if (player.hasNext) {
    player.currentIndex++;
    const trackToPlay = player.queue[player.currentIndex];
    
    // Usar método batch para actualizar estado
    player.loadTrack(trackToPlay, true);
    
    if (typeof window !== 'undefined') {
      audioManager.play(trackToPlay.path);
    }
  } else if (player.repeatMode === "all" && player.queue.length > 0) {
    player.currentIndex = 0;
    const trackToPlay = player.queue[0];
    
    // Usar método batch para actualizar estado
    player.loadTrack(trackToPlay, true);
    
    if (typeof window !== 'undefined') {
      audioManager.play(trackToPlay.path);
    }
  }
}

/**
 * ⏮️ Vuelve a la canción anterior
 */
export function previous() {
  if (player.currentTime > RESTART_TRACK_THRESHOLD) {
    // Si llevamos más de X segundos, reinicia la canción actual
    console.log('🔄 Reiniciando track actual');
    seek(0);
  } else if (player.hasPrevious) {
    player.currentIndex--;
    const trackToPlay = player.queue[player.currentIndex];
    
    // Usar método batch para actualizar estado
    player.loadTrack(trackToPlay, true);
    
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
  player.volume = Math.max(0, Math.min(100, volume));
  if (player.volume > 0) {
    player.isMuted = false;
  }
  
  if (typeof window !== 'undefined') {
    audioManager.setVolume(player.volume);
  }
}

/**
 * Alterna el mute
 */
export function toggleMute() {
  player.isMuted = !player.isMuted;
  
  if (typeof window !== 'undefined') {
    audioManager.setMuted(player.isMuted);
  }
}

/**
 * Busca a una posición específica (0-100)
 */
export function seek(percentage: number) {
  player.progress = Math.max(0, Math.min(100, percentage));
  player.currentTime = (player.progress / 100) * player.duration;
  
  if (typeof window !== 'undefined') {
    audioManager.seek(percentage);
  }
}

/**
 * ⏱️ Actualiza el tiempo actual (llamado por audioManager)
 */
export function updateTime(currentTime: number) {
  // Evitar actualizaciones innecesarias si el tiempo no cambió significativamente
  if (Math.abs(player.currentTime - currentTime) < 0.5) return;
  
  player.currentTime = currentTime;
  if (player.duration > 0) {
    player.progress = Math.min(100, (currentTime / player.duration) * 100);
  }
}

/**
 * Alterna shuffle
 */
export function toggleShuffle() {
  player.isShuffle = !player.isShuffle;
  
  if (player.isShuffle) {
    // Guardar la cola original antes de mezclar
    player.originalQueue = [...player.queue];
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
  const current = player.queue[player.currentIndex];
  const remaining = player.queue.filter((_, i) => i !== player.currentIndex);
  
  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  
  player.queue = [current, ...remaining];
  player.currentIndex = 0;
}

/**
 * Restaura la cola original después de desactivar shuffle
 */
function restoreOriginalQueue() {
  if (player.originalQueue.length === 0) return;

  const currentTrack = player.current;

  // Restaurar la cola original
  player.queue = [...player.originalQueue];

  if (currentTrack) {
    const originalIndex = player.queue.findIndex((t) => t.path === currentTrack.path);
    if (originalIndex !== -1) {
      player.currentIndex = originalIndex;
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
    player.queue = tracks;
    player.originalQueue = [...tracks];
    player.currentIndex = startIndex;
    
    // Usar el método batch para actualizar todo el estado del track de una vez
    player.loadTrack(trackToPlay, true);
    
    // Solo reproducir el audio después de actualizar el estado
    if (typeof window !== 'undefined') {
      await audioManager.play(trackToPlay.path);
      console.log(`🎵 Cola establecida: ${tracks.length} tracks, iniciando en índice ${startIndex}`);
    }
  } catch (error) {
    player.error = `Error al establecer cola: ${error}`;
    console.error('❌ Error en setQueue():', error);
    throw error;
  }
}

/**
 * Cicla el modo de repetición
 */
export function toggleRepeat() {
  const modes: RepeatMode[] = ["off", "all", "one"];
  const currentIdx = modes.indexOf(player.repeatMode);
  player.repeatMode = modes[(currentIdx + 1) % modes.length];
}

/**
 * ➕ Agrega una canción a la cola
 */
export function addToQueue(track: Track) {
  // Evitar duplicados
  const exists = player.queue.some(t => t.path === track.path);
  if (!exists) {
    player.queue = [...player.queue, track];
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
    !player.queue.some(t => t.path === track.path)
  );
  
  if (newTracks.length > 0) {
    player.queue = [...player.queue, ...newTracks];
    console.log(`➕ ${newTracks.length} tracks agregados a la cola`);
  } else {
    console.log('⚠️ Todos los tracks ya existen en la cola');
  }
}

/**
 * 🗑️ Elimina un track de la cola por índice
 */
export function removeFromQueue(index: number) {
  if (index < 0 || index >= player.queue.length) {
    console.warn('⚠️ Índice inválido:', index);
    return;
  }
  
  const removed = player.queue[index];
  player.queue = player.queue.filter((_, i) => i !== index);
  
  // Ajustar currentIndex si es necesario
  if (index < player.currentIndex) {
    player.currentIndex--;
  } else if (index === player.currentIndex && player.queue.length > 0) {
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
  player.queue = [];
  player.originalQueue = [];
  player.currentIndex = 0;
  player.current = null;
  console.log('🔄 Cola limpiada');
}

/**
 * Limpia la cola
 */
export function clearQueue() {
  player.queue = [];
  player.currentIndex = 0;
}

/**
 * Remueve una canción de la cola
 */
export function removeFromQueue(index: number) {
  player.queue = player.queue.filter((_, i) => i !== index);
  if (index < player.currentIndex) {
    player.currentIndex--;
  }
}
