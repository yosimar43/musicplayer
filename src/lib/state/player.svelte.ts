import type { Track } from "./library.svelte";
import { audioManager } from "@/lib/utils/audioManager";

export type RepeatMode = "off" | "one" | "all";

class PlayerState {
  current = $state<Track | null>(null);
  queue = $state<Track[]>([]);
  currentIndex = $state(0);
  isPlaying = $state(false);
  volume = $state(70);
  isMuted = $state(false);
  progress = $state(0); // 0-100
  currentTime = $state(0); // segundos
  duration = $state(0); // segundos
  isShuffle = $state(false);
  repeatMode = $state<RepeatMode>("off");
  
  // Estados derivados
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);
  queueLength = $derived(this.queue.length);
}

export const player = new PlayerState();

/**
 * Reproduce una canción
 */
export function play(track: Track, addToQueue = true) {
  player.current = track;
  player.isPlaying = true;
  player.duration = track.duration || 0;
  player.currentTime = 0;
  player.progress = 0;
  
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
  
  // Reproducir el audio real
  if (typeof window !== 'undefined') {
    audioManager.play(track.path);
  }
  
  console.log('▶️ Reproduciendo:', track.title);
}

/**
 * Pausa la reproducción
 */
export function pause() {
  player.isPlaying = false;
  
  if (typeof window !== 'undefined') {
    audioManager.pause();
  }
  
  console.log('⏸️ Pausado');
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
    
    console.log('▶️ Reanudado');
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
  
  console.log('⏹️ Detenido');
}

/**
 * Salta a la siguiente canción
 */
export function next() {
  if (player.hasNext) {
    player.currentIndex++;
    play(player.queue[player.currentIndex], false);
  } else if (player.repeatMode === "all" && player.queue.length > 0) {
    player.currentIndex = 0;
    play(player.queue[0], false);
  }
}

/**
 * Vuelve a la canción anterior
 */
export function previous() {
  if (player.currentTime > 3) {
    // Si llevamos más de 3 segundos, reinicia la canción
    seek(0);
  } else if (player.hasPrevious) {
    player.currentIndex--;
    play(player.queue[player.currentIndex], false);
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
 * Actualiza el tiempo actual
 */
export function updateTime(currentTime: number) {
  player.currentTime = currentTime;
  if (player.duration > 0) {
    player.progress = (currentTime / player.duration) * 100;
  }
  
  // Auto-avanzar si la canción terminó
  if (currentTime >= player.duration && player.duration > 0) {
    handleTrackEnd();
  }
}

/**
 * Maneja el fin de una canción
 */
function handleTrackEnd() {
  if (player.repeatMode === "one") {
    seek(0);
    resume();
  } else if (player.hasNext || player.repeatMode === "all") {
    next();
  } else {
    stop();
  }
}

/**
 * Alterna shuffle
 */
export function toggleShuffle() {
  player.isShuffle = !player.isShuffle;
  
  if (player.isShuffle) {
    shuffleQueue();
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
 * Cicla el modo de repetición
 */
export function toggleRepeat() {
  const modes: RepeatMode[] = ["off", "all", "one"];
  const currentIdx = modes.indexOf(player.repeatMode);
  player.repeatMode = modes[(currentIdx + 1) % modes.length];
  console.log('🔁 Modo repetición:', player.repeatMode);
}

/**
 * Establece la cola de reproducción
 */
export function setQueue(tracks: Track[], startIndex = 0) {
  player.queue = tracks;
  player.currentIndex = startIndex;
  if (tracks[startIndex]) {
    play(tracks[startIndex], false);
  }
}

/**
 * Agrega una canción a la cola
 */
export function addToQueue(track: Track) {
  player.queue = [...player.queue, track];
  console.log('➕ Agregado a la cola:', track.title);
}

/**
 * Agrega múltiples canciones a la cola
 */
export function addMultipleToQueue(tracks: Track[]) {
  player.queue = [...player.queue, ...tracks];
  console.log('➕ Agregadas', tracks.length, 'canciones a la cola');
}

/**
 * Limpia la cola
 */
export function clearQueue() {
  player.queue = [];
  player.currentIndex = 0;
  console.log('🗑️ Cola limpiada');
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
