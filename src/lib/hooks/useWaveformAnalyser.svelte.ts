/**
 * 🎵 useWaveformAnalyser - Read-only hook for audio frequency visualization
 * 
 * ARCHITECTURE:
 * ✅ Reads from audioManager's AnalyserNode (single source of truth)
 * ✅ Never creates its own AudioContext
 * ✅ Pure visualization - never controls audio playback
 * ✅ Uses RAF for smooth 60fps updates
 * ✅ Provides per-bar amplitude data with smoothing
 */

import { onMount } from 'svelte';
import { audioManager } from '@/lib/utils/audioManager';
import { playerStore } from '@/lib/stores/player.store.svelte';

// Configuration
const SMOOTHING_FACTOR = 0.15; // Lower = smoother, higher = more responsive
const DECAY_FACTOR = 0.92; // How fast bars decay when audio stops
const IDLE_AMPLITUDE = 0.08; // Base amplitude for idle breathing
const IDLE_VARIATION = 0.04; // How much breathing varies

export interface WaveformAnalyserReturn {
    /** Per-bar amplitude values (0-1), length = barCount */
    readonly barAmplitudes: number[];
    /** Whether audio is currently playing */
    readonly isPlaying: boolean;
    /** Whether Web Audio is ready */
    readonly isReady: boolean;
    /** Manual initialization (call on first user interaction) */
    initialize(): void;
    /** Cleanup resources */
    cleanup(): void;
}

let _instance: WaveformAnalyserReturn | null = null;

/**
 * Creates a waveform analyser hook
 * @param barCount Number of bars to generate amplitude data for
 */
export function useWaveformAnalyser(barCount: number = 60): WaveformAnalyserReturn {
    // Singleton pattern
    if (_instance && _instance.barAmplitudes.length === barCount) {
        return _instance;
    }

    // State
    let barAmplitudes = $state<number[]>(new Array(barCount).fill(IDLE_AMPLITUDE));
    let isPlaying = $state(false);
    let isReady = $state(false);

    // Internal state (not reactive)
    let animationFrame: number | null = null;
    let previousAmplitudes: number[] = new Array(barCount).fill(0);
    let dataArray: Uint8Array | null = null;
    let idlePhase = 0;

    /**
     * Initialize Web Audio through audioManager
     */
    function initialize(): void {
        if (isReady) return;

        const success = audioManager.initializeWebAudio();
        if (success) {
            const analyser = audioManager.getAnalyser();
            if (analyser) {
                dataArray = new Uint8Array(analyser.frequencyBinCount);
                isReady = true;
                console.log('✅ WaveformAnalyser: Ready with', analyser.frequencyBinCount, 'frequency bins');
            }
        }
    }

    /**
     * Generate idle breathing animation
     */
    function generateIdleAmplitudes(): void {
        idlePhase += 0.02;

        for (let i = 0; i < barCount; i++) {
            // Center-weighted breathing with wave effect
            const centerWeight = 1 - Math.abs((i - barCount / 2) / (barCount / 2)) * 0.5;
            const wave = Math.sin(idlePhase + (i * 0.15)) * 0.5 + 0.5;
            const target = IDLE_AMPLITUDE + (wave * IDLE_VARIATION * centerWeight);

            // Smooth transition
            previousAmplitudes[i] = previousAmplitudes[i] + (target - previousAmplitudes[i]) * 0.1;
            barAmplitudes[i] = previousAmplitudes[i];
        }
    }

    /**
     * Process frequency data into bar amplitudes
     */
    function processFrequencyData(): void {
        const analyser = audioManager.getAnalyser();
        if (!analyser || !dataArray) {
            generateIdleAmplitudes();
            return;
        }

        // Resume AudioContext if needed
        audioManager.resumeAudioContext();

        // Get frequency data
        analyser.getByteFrequencyData(dataArray);

        const binCount = dataArray.length;

        // Map frequency bins to bars with center weighting
        // Focus on mids (bins 2-40 roughly 340Hz-6800Hz at 44100Hz sample rate)
        const startBin = 2;
        const endBin = Math.min(50, binCount);
        const usableBins = endBin - startBin;

        for (let i = 0; i < barCount; i++) {
            // Map bar index to frequency bin range
            const binStart = startBin + Math.floor((i / barCount) * usableBins);
            const binEnd = startBin + Math.floor(((i + 1) / barCount) * usableBins);

            // Average the bins for this bar
            let sum = 0;
            let count = 0;
            for (let j = binStart; j < binEnd && j < binCount; j++) {
                sum += dataArray[j];
                count++;
            }

            const rawAmplitude = count > 0 ? sum / count / 255 : 0;

            // Center weighting: bars in center get boosted
            const centerIndex = barCount / 2;
            const distanceFromCenter = Math.abs(i - centerIndex) / centerIndex;
            const centerWeight = 1 - (distanceFromCenter * 0.3); // Center is 1.0, edges are 0.7

            const weighted = rawAmplitude * centerWeight;

            // Smooth with previous value (prevents jitter)
            const smoothed = previousAmplitudes[i] + (weighted - previousAmplitudes[i]) * SMOOTHING_FACTOR;
            previousAmplitudes[i] = smoothed;

            // Ensure minimum visibility + apply smoothed value
            barAmplitudes[i] = Math.max(IDLE_AMPLITUDE, smoothed);
        }
    }

    /**
     * Decay bars when audio stops
     */
    function decayToIdle(): void {
        let allAtIdle = true;

        for (let i = 0; i < barCount; i++) {
            if (previousAmplitudes[i] > IDLE_AMPLITUDE + 0.01) {
                previousAmplitudes[i] *= DECAY_FACTOR;
                barAmplitudes[i] = previousAmplitudes[i];
                allAtIdle = false;
            } else {
                // Transition to idle breathing
                generateIdleAmplitudes();
                return;
            }
        }

        if (allAtIdle) {
            generateIdleAmplitudes();
        }
    }

    /**
     * Main animation loop
     */
    function animate(): void {
        const shouldAnimate = playerStore.isPlaying && playerStore.current;
        isPlaying = !!shouldAnimate;

        if (shouldAnimate && isReady) {
            processFrequencyData();
        } else {
            decayToIdle();
        }

        animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Start the animation loop
     */
    function startLoop(): void {
        if (animationFrame) return;
        animate();
    }

    /**
     * Stop the animation loop
     */
    function stopLoop(): void {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    }

    /**
     * Cleanup resources
     */
    function cleanup(): void {
        stopLoop();
        previousAmplitudes = new Array(barCount).fill(0);
        barAmplitudes = new Array(barCount).fill(IDLE_AMPLITUDE);
        isReady = false;
        _instance = null;
        console.log('🧹 WaveformAnalyser: Cleaned up');
    }

    // Lifecycle
    onMount(() => {
        startLoop();
        return () => {
            stopLoop();
        };
    });

    // Auto-initialize when player starts (with delay for user interaction requirement)
    $effect(() => {
        if (playerStore.isPlaying && !isReady) {
            // Small delay to ensure user gesture context
            setTimeout(() => initialize(), 100);
        }
    });

    _instance = {
        get barAmplitudes() { return barAmplitudes; },
        get isPlaying() { return isPlaying; },
        get isReady() { return isReady; },
        initialize,
        cleanup
    };

    return _instance;
}
