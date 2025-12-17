<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { useWaveformAnalyser } from "@/lib/hooks/useWaveformAnalyser.svelte";
  import { usePlayer } from "@/lib/hooks/usePlayer.svelte";

  const waveform = useWaveformAnalyser(60);
  const player = usePlayer();

  let containerRef = $state<HTMLElement>();
  let barsRef: HTMLDivElement[] = [];
  let ctx: gsap.Context | null = null;

  // Configuration
  const BAR_COUNT = 60;
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 1.0;
  const BAR_MAX_HEIGHT = 32;

  // Derive which bar index corresponds to current progress
  const progressBarIndex = $derived(
    Math.floor((player.progress / 100) * BAR_COUNT),
  );

  onMount(() => {
    ctx = gsap.context(() => {
      gsap.set(barsRef, {
        scaleY: MIN_SCALE,
        transformOrigin: "center center",
      });
    }, containerRef);

    return () => {
      ctx?.revert();
      waveform.cleanup();
    };
  });

  // Reactive animation based on bar amplitudes
  $effect(() => {
    if (!ctx || !barsRef.length) return;

    const amplitudes = waveform.barAmplitudes;
    if (!amplitudes || amplitudes.length === 0) return;

    ctx.add(() => {
      barsRef.forEach((bar, i) => {
        if (!bar) return;

        const amplitude = amplitudes[i] ?? MIN_SCALE;
        const targetScale = MIN_SCALE + amplitude * (MAX_SCALE - MIN_SCALE);

        gsap.to(bar, {
          scaleY: targetScale,
          duration: 0.08,
          ease: "power2.out",
          overwrite: true,
        });
      });
    });
  });

  function handleSeek(e: MouseEvent) {
    if (!containerRef) return;
    waveform.initialize();

    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(100, Math.max(0, (x / rect.width) * 100));
    player.seek(percent);
  }

  function handleMouseEnter() {
    waveform.initialize();
  }

  function handleKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      player.seek(Math.max(0, player.progress - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      player.seek(Math.min(100, player.progress + step));
    }
  }
</script>

<div
  bind:this={containerRef}
  onclick={handleSeek}
  onmouseenter={handleMouseEnter}
  onkeydown={handleKeydown}
  role="slider"
  tabindex="0"
  aria-label="Seek track"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={player.progress}
  class="waveform-container"
>
  {#each Array(BAR_COUNT) as _, i}
    <div
      bind:this={barsRef[i]}
      class="waveform-bar"
      class:played={i < progressBarIndex}
      style="height: {BAR_MAX_HEIGHT}px;"
    ></div>
  {/each}
</div>

<style>
  .waveform-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    height: 40px;
    padding: 0 8px;
    cursor: pointer;
    position: relative;
    flex: 1;
    min-width: 120px;
    max-width: 300px;
    border-radius: 8px;
    transition: opacity 0.2s ease;
    opacity: 0.85;
  }

  .waveform-container:hover {
    opacity: 1;
  }

  .waveform-bar {
    width: 3px;
    min-width: 2px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 2px;
    will-change: transform;
    transform-origin: center center;
    transition: background 0.15s ease;
  }

  /* Bars that have been "played" get the accent color */
  .waveform-bar.played {
    background: linear-gradient(
      to top,
      rgba(103, 232, 249, 0.7),
      rgba(103, 232, 249, 1)
    );
  }
</style>
