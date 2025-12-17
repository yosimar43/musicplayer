import { untrack } from 'svelte';

class WaveformStore {
    isPlaying = $state(false);
    amplitude = $state(0); // 0-1 normalized

    setPlaying(playing: boolean) {
        untrack(() => { this.isPlaying = playing; });
    }

    setAmplitude(amp: number) {
        untrack(() => { this.amplitude = Math.max(0, Math.min(1, amp)); });
    }
}

export const waveformStore = new WaveformStore();
