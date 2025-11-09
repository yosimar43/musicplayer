/**
 * Audio Visualizer usando Web Audio API
 * Proporciona datos de frecuencia y waveform en tiempo real
 */

export type VisualizerMode = 'bars' | 'wave' | 'circular';

export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray = new Uint8Array(0);
  private bufferLength: number = 0;
  private isInitialized = false;

  /**
   * Inicializa el visualizador con un elemento de audio
   */
  initialize(audioElement: HTMLAudioElement) {
    if (this.isInitialized) {
      console.warn('⚠️ AudioVisualizer already initialized');
      return;
    }

    try {
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Crear analizador
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // Más bajo = menos barras pero más rendimiento
      this.analyser.smoothingTimeConstant = 0.8; // Suavizado entre 0-1
      
      // Conectar audio element al analizador
      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      // Preparar array para datos
      this.bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(this.bufferLength);
      
      this.isInitialized = true;
      console.log('✅ AudioVisualizer initialized:', this.bufferLength, 'frequency bins');
    } catch (error) {
      console.error('❌ Error initializing AudioVisualizer:', error);
    }
  }

  /**
   * Obtiene datos de frecuencia (0-255 por cada banda)
   * Ideal para barras de ecualizador
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.dataArray) {
      return new Uint8Array(128);
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Obtiene datos de waveform (0-255)
   * Ideal para osciloscopio/onda
   */
  getWaveformData(): Uint8Array {
    if (!this.analyser || !this.dataArray) {
      return new Uint8Array(128);
    }

    this.analyser.getByteTimeDomainData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Obtiene el volumen promedio actual (0-1)
   */
  getAverageVolume(): number {
    if (!this.analyser || !this.dataArray) {
      return 0;
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    
    const sum = Array.from(this.dataArray).reduce((acc, val) => acc + val, 0);
    return sum / (this.dataArray.length * 255); // Normalizado 0-1
  }

  /**
   * Obtiene volumen por bandas (bajo, medio, alto)
   */
  getBandVolumes(): { low: number; mid: number; high: number } {
    if (!this.analyser || !this.dataArray) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyser.getByteFrequencyData(this.dataArray);
    const length = this.dataArray.length;

    // Dividir en 3 bandas
    const lowEnd = Math.floor(length * 0.3);
    const midEnd = Math.floor(length * 0.7);

    let low = 0, mid = 0, high = 0;

    for (let i = 0; i < length; i++) {
      const value = this.dataArray[i] / 255;
      if (i < lowEnd) {
        low += value;
      } else if (i < midEnd) {
        mid += value;
      } else {
        high += value;
      }
    }

    return {
      low: low / lowEnd,
      mid: mid / (midEnd - lowEnd),
      high: high / (length - midEnd)
    };
  }

  /**
   * Resume el contexto de audio (necesario después de interacción del usuario)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🔊 AudioContext resumed');
    }
  }

  /**
   * Limpia recursos
   */
  dispose() {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
    console.log('🗑️ AudioVisualizer disposed');
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const audioVisualizer = new AudioVisualizer();
