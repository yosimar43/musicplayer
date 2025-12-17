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

  // Gradient colors derived from control buttons
  const gradientColors = {
    left: "rgba(6, 182, 212, 0.8)", // Previous button - cyan-500
    center: "rgba(34, 211, 238, 0.8)", // Play button - cyan-400
    right: "rgba(56, 189, 248, 0.8)", // Next button - sky-500
  };

  function interpolateColor(
    color1: string,
    color2: string,
    factor: number,
  ): string {
    // Simple RGB interpolation for rgba colors
    const rgba1 = color1.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/,
    );
    const rgba2 = color2.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/,
    );

    if (!rgba1 || !rgba2) return color1;

    const r1 = parseInt(rgba1[1]),
      g1 = parseInt(rgba1[2]),
      b1 = parseInt(rgba1[3]);
    const r2 = parseInt(rgba2[1]),
      g2 = parseInt(rgba2[2]),
      b2 = parseInt(rgba2[3]);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }

  function getBarColor(index: number): string {
    const progress = index / (BAR_COUNT - 1); // 0 to 1

    if (progress <= 0.33) {
      // Left third - interpolate between left and center
      const localProgress = progress / 0.33;
      return interpolateColor(
        gradientColors.left,
        gradientColors.center,
        localProgress,
      );
    } else if (progress <= 0.66) {
      // Center third - interpolate between center and right
      const localProgress = (progress - 0.33) / 0.33;
      return interpolateColor(
        gradientColors.center,
        gradientColors.right,
        localProgress,
      );
    } else {
      // Right third - pure right color
      return gradientColors.right;
    }
  }

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

  function handleKeyDown(e: KeyboardEvent) {
    if (!containerRef) return;
    
    let newProgress = player.progress;
    const step = 1; // 1% steps
    const pageStep = 10; // 10% page steps
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newProgress = Math.max(0, player.progress - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newProgress = Math.min(100, player.progress + step);
        break;
      case 'PageDown':
        newProgress = Math.max(0, player.progress - pageStep);
        break;
      case 'PageUp':
        newProgress = Math.min(100, player.progress + pageStep);
        break;
      case 'Home':
        newProgress = 0;
        break;
      case 'End':
        newProgress = 100;
        break;
      default:
        return; // Don't prevent default for other keys
    }
    
    e.preventDefault();
    player.seek(newProgress);
  }

</script>

<div
  bind:this={containerRef}
  onclick={handleSeek}
  onkeydown={handleKeyDown}
  onmouseenter={handleMouseEnter}
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
      style="height: {BAR_MAX_HEIGHT}px; --bar-color: {getBarColor(i)};"
    ></div>
  {/each}

  <!-- Progress indicator line -->
  <div class="progress-indicator" style="left: {player.progress}%;"></div>

  <!-- Progress overlay for clearer distinction -->
  <div class="progress-overlay" style="width: {player.progress}%;"></div>
</div>

<style>
  .waveform-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2px;
    height: 40px;
    padding: 0 12px;
    cursor: pointer;
    position: relative;
    flex: 1;
    min-width: 120px;
    max-width: 300px;
    border-radius: 12px;
    transition: all 0.3s ease;
    opacity: 0.9;
    /* Frosted glass effect - etched into surface */
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.01) 100%
    );
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    /* Subtle inner shadow for depth */
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.08),
      inset 0 -1px 1px rgba(0, 0, 0, 0.05);
  }

  .waveform-container:hover {
    opacity: 1;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.1),
      inset 0 -1px 1px rgba(0, 0, 0, 0.05),
      0 0 20px rgba(103, 232, 249, 0.08);
  }

  .waveform-bar {
    width: 2px;
    min-width: 2px;
    /* Softer, more translucent bars */
    background: rgba(255, 255, 255, 0.25);
    border-radius: 1px;
    will-change: transform;
    transform-origin: center center;
    transition: all 0.2s ease;
    position: relative;
  }

  /* Bars that have been "played" get soft glow */
  .waveform-bar.played {
    background: linear-gradient(
      to top,
      rgba(103, 232, 249, 0.4),
      rgba(103, 232, 249, 0.6)
    );
    box-shadow: 0 0 4px rgba(103, 232, 249, 0.3);
  }

  /* On hover, subtle brightening */
  .waveform-container:hover .waveform-bar {
    background: rgba(255, 255, 255, 0.35);
  }

  .waveform-container:hover .waveform-bar.played {
    background: linear-gradient(
      to top,
      rgba(103, 232, 249, 0.5),
      rgba(103, 232, 249, 0.7)
    );
    box-shadow: 0 0 6px rgba(103, 232, 249, 0.4);
  }

  /* Progress indicator line - subtle marker */
  .progress-indicator {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 1px;
    box-shadow: 0 0 6px rgba(103, 232, 249, 0.4);
    pointer-events: none;
    z-index: 20;
    transition: left 0.1s ease;
    opacity: 0.8;
  }

  .waveform-container:hover .progress-indicator {
    opacity: 1;
    background: rgba(255, 255, 255, 0.85);
    box-shadow: 0 0 8px rgba(103, 232, 249, 0.5);
  }

  /* Progress overlay for played portion - very subtle */
  .progress-overlay {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: linear-gradient(
      to right,
      rgba(103, 232, 249, 0.03),
      transparent
    );
    pointer-events: none;
    z-index: 5;
    transition: width 0.1s ease;
    border-radius: 12px 0 0 12px;
  }

  .waveform-container:hover .progress-overlay {
    background: linear-gradient(
      to right,
      rgba(103, 232, 249, 0.05),
      transparent
    );
  }
</style>
