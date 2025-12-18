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

  // Optimización de carga
  isLoadingTrack = $state(false);
  isTransitioning = $state(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADOS DERIVADOS (Solo $derived)
  // ═══════════════════════════════════════════════════════════════════════════

  hasNext = $derived(this.currentIndex < this.queue.length - 1);
  hasPrevious = $derived(this.currentIndex > 0);
  nextTrackPreview = $derived(this.hasNext ? this.queue[this.currentIndex + 1] : null);
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
      // Recalcular progreso con la nueva duración para mantener consistencia
      if (this.duration > 0 && this.currentTime > 0) {
        this.progress = Math.min(100, (this.currentTime / this.duration) * 100);
      }
    });
  }

  /**
   * Establece progreso para seek (el hook traducirá a currentTime)
   * NO actualiza currentTime aquí - eso viene del audioManager
   */
  setProgress(percentage: number) {
    untrack(() => {
      this.progress = Math.max(0, Math.min(100, percentage));
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

  setIsLoadingTrack(loading: boolean) {
    untrack(() => {
      this.isLoadingTrack = loading;
    });
  }

  setIsTransitioning(transitioning: boolean) {
    untrack(() => {
      this.isTransitioning = transitioning;
    });
  }

  batchSetTracks(tracks: Track[]) {
    untrack(() => {
      this.queue = tracks;
      this.originalQueue = [...tracks];
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE COLA (Mutaciones puras)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Establece la cola de reproducción
   * @param tracks Los tracks a agregar
   * @param startIndex Índice del track inicial
   * @param sort Si ordenar alfabéticamente (default: true)
   * ✅ OPTIMIZACIÓN: Validación de tracks y sanitización
   */
  setQueue(tracks: Track[], startIndex = 0, sort = true) {
    // Validar y filtrar tracks inválidos
    const validTracks = tracks.filter(track => this.isValidTrack(track));

    if (validTracks.length === 0) {
      console.warn('⚠️ No hay tracks válidos en la cola');
      this.clearQueue();
      return;
    }

    // Eliminar duplicados basados en path
    const uniqueTracks = this.removeDuplicates(validTracks);

    // Ordenar alfabéticamente si se solicita
    const finalTracks = sort ? uniqueTracks.sort((a, b) => {
      const titleA = (a.title || a.path).toLowerCase();
      const titleB = (b.title || b.path).toLowerCase();
      return titleA.localeCompare(titleB);
    }) : uniqueTracks;

    untrack(() => {
      this.queue = finalTracks;
      this.originalQueue = [...finalTracks];
      this.currentIndex = Math.max(0, Math.min(startIndex, finalTracks.length - 1));

      const track = finalTracks[this.currentIndex];
      if (track) {
        this.setCurrentTrack(track);
      }

      // If shuffle is enabled, shuffle the queue but keep the selected track at start
      if (this.isShuffle) {
        // Shuffle all tracks
        const shuffled = [...finalTracks];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Move the selected track to the beginning
        const selectedTrack = finalTracks[startIndex];
        if (selectedTrack) {
          const selectedIndex = shuffled.findIndex(t => t.path === selectedTrack.path);
          if (selectedIndex > 0) {
            shuffled.splice(selectedIndex, 1);
            shuffled.unshift(selectedTrack);
          }
        }

        this.queue = shuffled;
        this.currentIndex = 0; // Selected track is now at index 0
      }
    });

    console.log(`📋 Cola establecida: ${finalTracks.length} tracks (${tracks.length - finalTracks.length} inválidos/duplicados)`);
  }

  /**
   * ✅ NUEVO: Valida que un track sea reproducible
   */
  private isValidTrack(track: Track): boolean {
    if (!track) {
      console.warn('⚠️ Track nulo/undefined');
      return false;
    }

    if (!track.path || typeof track.path !== 'string' || track.path.trim() === '') {
      console.warn('⚠️ Track sin path válido:', track);
      return false;
    }

    // Validar formato de archivo (extensiones comunes)
    const supportedFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.wma'];
    const hasValidExtension = supportedFormats.some(ext =>
      track.path.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      console.warn('⚠️ Formato no soportado:', track.path);
      return false;
    }

    // Validar metadata mínima
    if (!track.title || track.title.trim() === '') {
      console.warn('⚠️ Track sin título:', track.path);
      // Permitir pero advertir
    }

    return true;
  }

  /**
   * ✅ NUEVO: Elimina tracks duplicados por path
   */
  private removeDuplicates(tracks: Track[]): Track[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      const path = track.path.toLowerCase(); // Case-insensitive
      if (seen.has(path)) {
        console.warn('⚠️ Track duplicado ignorado:', track.path);
        return false;
      }
      seen.add(path);
      return true;
    });
  }

  /**
   * ✅ NUEVO: Sanitiza metadata de un track
   */
  private sanitizeTrack(track: Track): Track {
    return {
      ...track,
      title: track.title?.trim() || 'Sin título',
      artist: track.artist?.trim() || 'Artista desconocido',
      album: track.album?.trim() || '',
      path: track.path.trim()
    };
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
   * ✅ OPTIMIZACIÓN: Con validación de duplicados
   */
  addToQueue(track: Track) {
    if (!this.isValidTrack(track)) {
      console.warn('⚠️ Track inválido no agregado a cola');
      return;
    }

    // Prevenir duplicados exactos (case-insensitive)
    if (this.queue.some(t => t.path.toLowerCase() === track.path.toLowerCase())) {
      console.warn('⚠️ Track ya existe en cola:', track.path);
      return;
    }

    const sanitized = this.sanitizeTrack(track);

    untrack(() => {
      this.queue = [...this.queue, sanitized];
      // ✅ FIX: Mantener originalQueue sincronizada - añadir a originalQueue también durante shuffle
      this.originalQueue = [...this.originalQueue, sanitized];
    });

    console.log('✅ Track agregado a cola:', sanitized.title);
  }

  /**
   * Inserta un track en una posición específica de la cola
   */
  insertToQueue(track: Track, index: number) {
    if (!this.isValidTrack(track)) {
      console.warn('⚠️ Track inválido no insertado en cola');
      return;
    }

    // Prevenir duplicados exactos (case-insensitive)
    if (this.queue.some(t => t.path.toLowerCase() === track.path.toLowerCase())) {
      console.warn('⚠️ Track ya existe en cola:', track.path);
      return;
    }

    const sanitized = this.sanitizeTrack(track);
    const safeIndex = Math.max(0, Math.min(index, this.queue.length));

    untrack(() => {
      const newQueue = [...this.queue];
      newQueue.splice(safeIndex, 0, sanitized);
      this.queue = newQueue;

      // ✅ FIX: Mantener originalQueue sincronizada - insertar en originalQueue también durante shuffle
      // Para shuffle, necesitamos encontrar la posición correspondiente en originalQueue
      if (this.isShuffle && this.originalQueue.length > 0) {
        // Si estamos en shuffle, añadir al final de originalQueue para mantener consistencia
        this.originalQueue = [...this.originalQueue, sanitized];
      } else {
        // Si no hay shuffle, mantener sincronizada con la cola actual
        this.originalQueue = [...this.queue];
      }

      // Ajustar currentIndex si es necesario
      if (safeIndex <= this.currentIndex) {
        this.currentIndex++;
      }
    });

    console.log(`✅ Track insertado en posición ${safeIndex}:`, sanitized.title);
  }

  /**
   * Agrega múltiples tracks a la cola
   * ✅ OPTIMIZACIÓN: Con validación y deduplicación
   */
  addMultipleToQueue(tracks: Track[]) {
    const validTracks = tracks.filter(track => this.isValidTrack(track));

    if (validTracks.length === 0) {
      console.warn('⚠️ No hay tracks válidos para agregar');
      return;
    }

    // Filtrar duplicados con cola existente (case-insensitive)
    const existingPaths = new Set(this.queue.map(t => t.path.toLowerCase()));
    const newTracks = validTracks
      .filter(track => !existingPaths.has(track.path.toLowerCase()))
      .map(track => this.sanitizeTrack(track));

    // Eliminar duplicados dentro del nuevo batch
    const uniqueNewTracks = this.removeDuplicates(newTracks);

    if (uniqueNewTracks.length === 0) {
      console.warn('⚠️ Todos los tracks ya están en la cola');
      return;
    }

    untrack(() => {
      this.queue = [...this.queue, ...uniqueNewTracks];
      // ✅ FIX: Mantener originalQueue sincronizada - añadir a originalQueue también durante shuffle
      this.originalQueue = [...this.originalQueue, ...uniqueNewTracks];
    });

    console.log(`✅ ${uniqueNewTracks.length} tracks agregados a cola (${tracks.length - uniqueNewTracks.length} duplicados/inválidos)`);
  }

  /**
   * 🎯 ENQUEUE NEXT - Inserta un track inmediatamente después del track actual
   * Shuffle-aware: no perturba el orden existente, solo inserta en la siguiente posición
   * ✅ Permite duplicados (a diferencia de addToQueue)
   * ✅ Ignora si es el track actual reproduciendo
   */
  enqueueNext(track: Track) {
    // Validar track
    if (!this.isValidTrack(track)) {
      console.warn('⚠️ Track inválido no encolado');
      return;
    }

    // Ignorar si es el track actualmente reproduciendo
    if (this.current?.path.toLowerCase() === track.path.toLowerCase()) {
      console.log('ℹ️ Track ya está reproduciéndose, ignorando');
      return;
    }

    const sanitized = this.sanitizeTrack(track);

    // Si la cola está vacía, simplemente agregar
    if (this.queue.length === 0) {
      untrack(() => {
        this.queue = [sanitized];
      });
      console.log(`🎵 Encolado (cola vacía): "${sanitized.title}"`);
      return;
    }

    // Insertar inmediatamente después del track actual
    const insertIndex = this.currentIndex + 1;

    untrack(() => {
      const newQueue = [...this.queue];
      newQueue.splice(insertIndex, 0, sanitized);
      this.queue = newQueue;
    });

    console.log(`🎵 Encolado siguiente: "${sanitized.title}" en posición ${insertIndex}`);
  }

  /**
   * 🎯 ENQUEUE NEXT MULTIPLE - Inserta múltiples tracks como bloque contiguo después del actual
   * Mantiene el orden interno de los tracks insertados
   */
  enqueueNextMultiple(tracks: Track[]) {
    const validTracks = tracks.filter(t => this.isValidTrack(t));
    if (validTracks.length === 0) {
      console.warn('⚠️ No hay tracks válidos para encolar');
      return;
    }

    // Filtrar el track actual si está en la lista (no duplicar el que está sonando)
    const currentPath = this.current?.path.toLowerCase();
    const filtered = currentPath
      ? validTracks.filter(t => t.path.toLowerCase() !== currentPath)
      : validTracks;

    if (filtered.length === 0) {
      console.log('ℹ️ Todos los tracks ya están reproduciéndose');
      return;
    }

    const sanitized = filtered.map(t => this.sanitizeTrack(t));

    // Si la cola está vacía, simplemente establecer
    if (this.queue.length === 0) {
      untrack(() => {
        this.queue = sanitized;
      });
      console.log(`🎵 Encolados ${sanitized.length} tracks (cola vacía)`);
      return;
    }

    // Insertar bloque después del track actual
    const insertIndex = this.currentIndex + 1;

    untrack(() => {
      const newQueue = [...this.queue];
      newQueue.splice(insertIndex, 0, ...sanitized);
      this.queue = newQueue;
    });

    console.log(`🎵 Encolados ${sanitized.length} tracks después del actual en posición ${insertIndex}`);
  }

  /**
   * Elimina un track de la cola por índice
   */
  removeFromQueue(index: number): boolean {
    if (index < 0 || index >= this.queue.length) return false;

    const trackToRemove = this.queue[index];

    untrack(() => {
      this.queue = this.queue.filter((_, i) => i !== index);
      // ✅ FIX: Mantener originalQueue sincronizada - eliminar de originalQueue también durante shuffle
      if (trackToRemove) {
        this.originalQueue = this.originalQueue.filter(t => t.path !== trackToRemove.path);
      }
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
    // Mezclar TODA la cola con Fisher-Yates
    const shuffled = [...this.queue];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Encontrar dónde quedó la canción actual después del shuffle
    const currentTrack = this.current;
    if (currentTrack) {
      const newIndex = shuffled.findIndex(t => t.path === currentTrack.path);
      this.currentIndex = newIndex !== -1 ? newIndex : 0;
    } else {
      this.currentIndex = 0;
    }

    this.queue = shuffled;
  }

  private restoreOriginalQueue() {
    if (this.originalQueue.length === 0) return;

    // Ordenar alfabéticamente antes de restaurar
    const sortedQueue = [...this.originalQueue].sort((a, b) => {
      const titleA = (a.title || a.path).toLowerCase();
      const titleB = (b.title || b.path).toLowerCase();
      return titleA.localeCompare(titleB);
    });

    const currentTrack = this.current;
    this.queue = sortedQueue;

    if (currentTrack) {
      const originalIndex = this.queue.findIndex((t) => t.path === currentTrack.path);
      if (originalIndex !== -1) {
        this.currentIndex = originalIndex;
        // ✅ FIX: Asegurar que currentTrack esté sincronizado
        this.setCurrentTrack(this.queue[originalIndex]);
      } else {
        // Si la canción actual no está en la cola restaurada, usar la primera
        this.currentIndex = 0;
        this.setCurrentTrack(this.queue[0]);
      }
    } else {
      this.currentIndex = 0;
      if (this.queue.length > 0) {
        this.setCurrentTrack(this.queue[0]);
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
