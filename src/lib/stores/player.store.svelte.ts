/**
 * 🎯 PLAYER STORE - Estado Puro
 * 
 * PRINCIPIOS:
 * ✅ Solo estado reactivo ($state, $derived)
 * ✅ Métodos puros (sin side effects de audio)
 * ✅ SIN dependencias de audioManager
 * ✅ Fácilmente testeable
 * 
 * La reproducción de audio se maneja en usePlayer hook
 */

import type { Track } from "./library.store.svelte";
import { untrack } from "svelte";

export type RepeatMode = "off" | "one" | "all";

// 🎯 Constantes de configuración
const RESTART_TRACK_THRESHOLD = 3; // segundos
const DEFAULT_VOLUME = 70;

class PlayerStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO REACTIVO (Solo $state)
  // ═══════════════════════════════════════════════════════════════════════════
  
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DERIVADOS (Solo $derived)
  // ═══════════════════════════════════════════════════════════════════════════
  
  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);
  queueLength = $derived(this.queue.length);
  formattedTime = $derived(this.formatTime(this.currentTime));
  formattedDuration = $derived(this.formatTime(this.duration));
  currentTrack = $derived(this.queue[this.currentIndex] ?? null);
  
  // Estado para saber si debería reiniciar track o ir al anterior
  shouldRestartOnPrevious = $derived(this.currentTime > RESTART_TRACK_THRESHOLD);

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTADORES PUROS (Sin side effects de audio)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🎵 Establece el track actual (mutación pura)
   * El hook usePlayer() se encargará de reproducir el audio
   */
  setCurrentTrack(track: Track | null) {
    untrack(() => {
      this.current = track;
      this.currentTime = 0;
      this.progress = 0;
      this.error = null;
      if (track) {
        this.duration = track.duration || 0;
      }
    });
  }

  /**
   * Establece el estado de reproducción
   */
  setPlaying(playing: boolean) {
    untrack(() => {
      this.isPlaying = playing;
    });
  }

  /**
   * Establece el volumen (0-100)
   */
  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, volume));
    untrack(() => {
      this.volume = clamped;
      if (clamped > 0) {
        this.isMuted = false;
      }
    });
  }

  /**
   * Alterna mute
   */
  toggleMute() {
    untrack(() => {
      this.isMuted = !this.isMuted;
    });
  }

  /**
   * Actualiza tiempo actual (llamado por hook cuando audio emite)
   */
  setTime(currentTime: number) {
    // Evitar actualizaciones innecesarias
    if (Math.abs(this.currentTime - currentTime) < 0.5) return;
    
    untrack(() => {
      this.currentTime = currentTime;
      if (this.duration > 0) {
        this.progress = Math.min(100, (currentTime / this.duration) * 100);
      }
    });
  }

  /**
   * Establece la duración (desde metadata del audio)
   */
  setDuration(duration: number) {
    untrack(() => {
      this.duration = duration;
    });
  }

  /**
   * Establece progreso para seek (el hook traducirá a currentTime)
   */
  setProgress(percentage: number) {
    untrack(() => {
      this.progress = Math.max(0, Math.min(100, percentage));
      this.currentTime = (this.progress / 100) * this.duration;
    });
  }

  /**
   * Establece error
   */
  setError(error: string | null) {
    untrack(() => {
      this.error = error;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE COLA (Mutaciones puras)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Establece la cola de reproducción
   */
  setQueue(tracks: Track[], startIndex = 0) {
    untrack(() => {
      this.queue = tracks;
      this.originalQueue = [...tracks];
      this.currentIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      
      const track = tracks[this.currentIndex];
      if (track) {
        this.setCurrentTrack(track);
      }
    });
  }

  /**
   * Avanza al siguiente track en la cola
   * Retorna el track a reproducir o null si no hay siguiente
   */
  goToNext(): Track | null {
    let newIndex: number;
    
    if (this.hasNext) {
      newIndex = this.currentIndex + 1;
    } else if (this.repeatMode === "all" && this.queue.length > 0) {
      newIndex = 0;
    } else {
      return null;
    }
    
    const track = this.queue[newIndex];
    if (!track) return null;
    
    untrack(() => {
      this.currentIndex = newIndex;
    });
    
    this.setCurrentTrack(track);
    return track;
  }

  /**
   * Retrocede al track anterior o reinicia el actual
   * Retorna el track a reproducir y si debe reiniciar
   */
  goToPrevious(): { track: Track | null; shouldRestart: boolean } {
    if (this.shouldRestartOnPrevious) {
      return { track: this.current, shouldRestart: true };
    }
    
    if (!this.hasPrevious) {
      return { track: null, shouldRestart: false };
    }
    
    const newIndex = this.currentIndex - 1;
    const track = this.queue[newIndex];
    if (!track) return { track: null, shouldRestart: false };
    
    untrack(() => {
      this.currentIndex = newIndex;
    });
    
    this.setCurrentTrack(track);
    return { track, shouldRestart: false };
  }

  /**
   * Salta a un índice específico en la cola
   */
  goToIndex(index: number): Track | null {
    if (index < 0 || index >= this.queue.length) return null;
    
    const track = this.queue[index];
    if (!track) return null;
    
    untrack(() => {
      this.currentIndex = index;
    });
    
    this.setCurrentTrack(track);
    return track;
  }

  /**
   * Agrega un track a la cola
   */
  addToQueue(track: Track) {
    if (this.queue.some(t => t.path === track.path)) return;
    
    untrack(() => {
      this.queue = [...this.queue, track];
    });
  }

  /**
   * Agrega múltiples tracks a la cola
   */
  addMultipleToQueue(tracks: Track[]) {
    const newTracks = tracks.filter(track =>
      !this.queue.some(t => t.path === track.path)
    );
    if (newTracks.length === 0) return;
    
    untrack(() => {
      this.queue = [...this.queue, ...newTracks];
    });
  }

  /**
   * Elimina un track de la cola por índice
   */
  removeFromQueue(index: number): boolean {
    if (index < 0 || index >= this.queue.length) return false;

    untrack(() => {
      this.queue = this.queue.filter((_, i) => i !== index);
      // Ajustar currentIndex si es necesario
      if (index < this.currentIndex) {
        this.currentIndex--;
      }
    });
    
    return true;
  }

  /**
   * Limpia toda la cola
   */
  clearQueue() {
    untrack(() => {
      this.queue = [];
      this.originalQueue = [];
      this.currentIndex = 0;
      this.current = null;
      this.isPlaying = false;
      this.currentTime = 0;
      this.progress = 0;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHUFFLE Y REPEAT (Mutaciones puras)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Alterna shuffle
   */
  toggleShuffle() {
    untrack(() => {
      this.isShuffle = !this.isShuffle;

      if (this.isShuffle) {
        this.shuffleQueue();
      } else {
        this.restoreOriginalQueue();
      }
    });
  }

  /**
   * Cicla el modo de repetición
   */
  toggleRepeat() {
    untrack(() => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const currentIdx = modes.indexOf(this.repeatMode);
      this.repeatMode = modes[(currentIdx + 1) % modes.length];
    });
  }

  private shuffleQueue() {
    const current = this.queue[this.currentIndex];
    const remaining = this.queue.filter((_, i) => i !== this.currentIndex);

    // Fisher-Yates shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this.queue = current ? [current, ...remaining] : remaining;
    this.currentIndex = 0;
  }

  private restoreOriginalQueue() {
    if (this.originalQueue.length === 0) return;

    const currentTrack = this.current;
    this.queue = [...this.originalQueue];

    if (currentTrack) {
      const originalIndex = this.queue.findIndex((t) => t.path === currentTrack.path);
      if (originalIndex !== -1) {
        this.currentIndex = originalIndex;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PURAS
  // ═══════════════════════════════════════════════════════════════════════════

  private formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Reset completo del store
   */
  reset() {
    untrack(() => {
      this.current = null;
      this.queue = [];
      this.originalQueue = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.volume = DEFAULT_VOLUME;
      this.isMuted = false;
      this.progress = 0;
      this.currentTime = 0;
      this.duration = 0;
      this.isShuffle = false;
      this.repeatMode = "off";
      this.error = null;
    });
  }
}

export const playerStore = new PlayerStore();
