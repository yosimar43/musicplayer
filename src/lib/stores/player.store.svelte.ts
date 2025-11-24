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
   * 🎵 Reproduce una canción
   */
  async play(track: Track, addToQueue = true): Promise<void> {
    try {
      // Actualizar cola si es necesario
      if (addToQueue) {
        // Si no está en la cola, agregarlo
        const trackIndex = this.queue.findIndex(t => t.path === track.path);
        if (trackIndex === -1) {
          // Reasignar array completo (mejor práctica Svelte 5)
          this.queue = [...this.queue, track];
          this.currentIndex = this.queue.length - 1;
        } else {
          this.currentIndex = trackIndex;
        }
      }

      // Usar método optimizado para actualizar estado
      this.loadTrack(track, true);

      // Reproducir el audio real
      if (typeof window !== 'undefined') {
        await audioManager.play(track.path);
        console.log('✅ Reproduciendo:', track.title || track.path);
      }
    } catch (error) {
      this.error = `Error al reproducir: ${error}`;
      console.error('❌ Error en play():', error);
      throw error;
    }
  }

  /**
   * Pausa la reproducción
   */
  pause() {
    this.isPlaying = false;

    if (typeof window !== 'undefined') {
      audioManager.pause();
    }
  }

  /**
   * Alterna entre play/pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else if (this.current) {
      this.resume();
    }
  }

  /**
   * Reanuda la reproducción
   */
  resume() {
    if (this.current) {
      this.isPlaying = true;

      if (typeof window !== 'undefined') {
        audioManager.resume();
      }
    }
  }

  /**
   * Detiene la reproducción
   */
  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.progress = 0;

    if (typeof window !== 'undefined') {
      audioManager.stop();
    }
  }

  /**
   * Salta a la siguiente canción
   */
  next() {
    if (this.hasNext) {
      this.currentIndex++;
      const trackToPlay = this.queue[this.currentIndex];

      // Usar método batch para actualizar estado
      this.loadTrack(trackToPlay, true);

      if (typeof window !== 'undefined') {
        audioManager.play(trackToPlay.path);
      }
    } else if (this.repeatMode === "all" && this.queue.length > 0) {
      this.currentIndex = 0;
      const trackToPlay = this.queue[0];

      // Usar método batch para actualizar estado
      this.loadTrack(trackToPlay, true);

      if (typeof window !== 'undefined') {
        audioManager.play(trackToPlay.path);
      }
    }
  }

  /**
   * ⏮️ Vuelve a la canción anterior
   */
  previous() {
    if (this.currentTime > RESTART_TRACK_THRESHOLD) {
      // Si llevamos más de X segundos, reinicia la canción actual
      console.log('🔄 Reiniciando track actual');
      this.seek(0);
    } else if (this.hasPrevious) {
      this.currentIndex--;
      const trackToPlay = this.queue[this.currentIndex];

      // Usar método batch para actualizar estado
      this.loadTrack(trackToPlay, true);

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
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.volume > 0) {
      this.isMuted = false;
    }

    if (typeof window !== 'undefined') {
      audioManager.setVolume(this.volume);
    }
  }

  /**
   * Alterna el mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;

    if (typeof window !== 'undefined') {
      audioManager.setMuted(this.isMuted);
    }
  }

  /**
   * ⏱️ Actualiza el tiempo actual (llamado por audioManager)
   */
  updateTime(currentTime: number) {
    // Evitar actualizaciones innecesarias si el tiempo no cambió significativamente
    if (Math.abs(this.currentTime - currentTime) < 0.5) return;

    this.currentTime = currentTime;
    if (this.duration > 0) {
      this.progress = Math.min(100, (currentTime / this.duration) * 100);
    }
  }

  /**
   * Alterna shuffle
   */
  toggleShuffle() {
    this.isShuffle = !this.isShuffle;

    if (this.isShuffle) {
      // Guardar la cola original antes de mezclar
      this.originalQueue = [...this.queue];
      this.shuffleQueue();
    } else {
      // Restaurar la cola original
      this.restoreOriginalQueue();
    }
  }

  /**
   * Mezcla la cola de reproducción
   */
  private shuffleQueue() {
    const current = this.queue[this.currentIndex];
    const remaining = this.queue.filter((_, i) => i !== this.currentIndex);

    // Fisher-Yates shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this.queue = [current, ...remaining];
    this.currentIndex = 0;
  }

  /**
   * Restaura la cola original después de desactivar shuffle
   */
  private restoreOriginalQueue() {
    if (this.originalQueue.length === 0) return;

    const currentTrack = this.current;

    // Restaurar la cola original
    this.queue = [...this.originalQueue];

    if (currentTrack) {
      const originalIndex = this.queue.findIndex((t) => t.path === currentTrack.path);
      if (originalIndex !== -1) {
        this.currentIndex = originalIndex;
      }
    }
  }

  /**
   * 🎼 Establece la cola de reproducción
   */
  async setQueue(tracks: Track[], startIndex = 0): Promise<void> {
    const trackToPlay = tracks[startIndex];
    if (!trackToPlay) {
      console.warn('⚠️ No hay track para reproducir en el índice', startIndex);
      return;
    }

    try {
      // Actualizar la cola primero (sin disparar el track load todavía)
      this.queue = tracks;
      this.originalQueue = [...tracks];
      this.currentIndex = startIndex;

      // Usar el método batch para actualizar todo el estado del track de una vez
      this.loadTrack(trackToPlay, true);

      // Solo reproducir el audio después de actualizar el estado
      if (typeof window !== 'undefined') {
        await audioManager.play(trackToPlay.path);
        console.log(`🎵 Cola establecida: ${tracks.length} tracks, iniciando en índice ${startIndex}`);
      }
    } catch (error) {
      this.error = `Error al establecer cola: ${error}`;
      console.error('❌ Error en setQueue():', error);
      throw error;
    }
  }

  /**
   * Cicla el modo de repetición
   */
  toggleRepeat() {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const currentIdx = modes.indexOf(this.repeatMode);
    this.repeatMode = modes[(currentIdx + 1) % modes.length];
  }

  /**
   * ➕ Agrega una canción a la cola
   */
  addToQueue(track: Track) {
    // Evitar duplicados
    const exists = this.queue.some(t => t.path === track.path);
    if (!exists) {
      this.queue = [...this.queue, track];
      console.log('➕ Track agregado a la cola:', track.title || track.path);
    } else {
      console.log('⚠️ Track ya existe en la cola');
    }
  }

  /**
   * ➕ Agrega múltiples canciones a la cola
   */
  addMultipleToQueue(tracks: Track[]) {
    // Filtrar duplicados
    const newTracks = tracks.filter(track =>
      !this.queue.some(t => t.path === track.path)
    );

    if (newTracks.length > 0) {
      this.queue = [...this.queue, ...newTracks];
      console.log(`➕ ${newTracks.length} tracks agregados a la cola`);
    } else {
      console.log('⚠️ Todos los tracks ya existen en la cola');
    }
  }

  /**
   * 🗑️ Elimina un track de la cola por índice
   */
  removeFromQueue(index: number) {
    if (index < 0 || index >= this.queue.length) {
      console.warn('⚠️ Índice inválido:', index);
      return;
    }

    const removed = this.queue[index];
    this.queue = this.queue.filter((_, i) => i !== index);

    // Ajustar currentIndex si es necesario
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex && this.queue.length > 0) {
      // Si eliminamos la canción actual, reproducir la siguiente
      this.next();
    }

    console.log('🗑️ Track eliminado de la cola:', removed.title || removed.path);
  }

  /**
   * 🔄 Limpia toda la cola
   */
  clearQueue() {
    this.stop();
    this.queue = [];
    this.originalQueue = [];
    this.currentIndex = 0;
    this.current = null;
    console.log('🔄 Cola limpiada');
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
