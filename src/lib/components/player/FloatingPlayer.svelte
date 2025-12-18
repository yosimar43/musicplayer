<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { usePlayer } from "@/lib/hooks/usePlayer.svelte";
  import { uiStore } from "@/lib/stores";
  import PlayerAvatar from "./PlayerAvatar.svelte";
  import TrackInfo from "./TrackInfo.svelte";
  import PlayerControls from "./PlayerControls.svelte";
  import PlayerGlow from "./PlayerGlow.svelte";
  import Waveform from "./Waveform.svelte";

  const player = usePlayer();

  // --- STATE ---
  let playerContainerRef = $state<HTMLElement>();
  let playerRef = $state<HTMLElement>();
  let activationZoneRef = $state<HTMLElement>();
  let glowLineRef = $state<HTMLElement>();
  let glowSpotRef = $state<HTMLElement>();

  let isMouseNear = $state(false);
  let isHovering = $state(false);
  let previousTrackPath = $state<string | null>(null);

  let ctx: gsap.Context | null = null;

  // Reactive state - solo activar si hay canción
  const hasTrack = $derived(!!player.current);

  // --- ANIMATION FUNCTIONS ---
  function animatePlayer(targetMode: "retreat" | "active" | "focus") {
    if (!ctx || !playerRef || !glowLineRef || !glowSpotRef) return;

    gsap.killTweensOf([playerRef, glowLineRef, glowSpotRef]);

    const config = {
      retreat: {
        player: { scale: 0.9, z: -50, rotateX: 10, opacity: 0.4 },
        glow: { lineOpacity: 0.2, spotOpacity: 0 },
      },
      active: {
        player: { scale: 1, z: 0, rotateX: 0, opacity: 1 },
        glow: { lineOpacity: 0.6, spotOpacity: 0.4 },
      },
      focus: {
        player: {
          scale: 1.05,
          z: 20,
          rotateX: 0,
          opacity: 1,
          boxShadow:
            "0 20px 50px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.2), 0 0 80px rgba(147, 51, 234, 0.15)",
        },
        glow: { lineOpacity: 0.8, spotOpacity: 0.6 },
      },
    };

    const duration = targetMode === "focus" ? 0.4 : 1.2;
    const ease = targetMode === "focus" ? "back.out(1.5)" : "power1.out";

    gsap.to(playerRef, { ...config[targetMode].player, duration, ease });
    gsap.to([glowLineRef, glowSpotRef], {
      opacity: config[targetMode].glow.lineOpacity,
      duration,
      ease,
    });
  }

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {
      if (playerRef) {
        gsap.set(playerRef, {
          transformPerspective: 1200,
          scale: 1,
          z: 0,
          rotateX: 0,
          opacity: 1,
        });

        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.set(playerRef, { y: 100, opacity: 0, rotateX: -20 }).to(playerRef, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1.5,
          ease: "power4.out",
        });
      }
    }, playerContainerRef);

    return () => {
      ctx?.revert();
      ctx = null;
    };
  });

  // --- MOUSE PROXIMITY (solo si hay canción) ---
  $effect(() => {
    if (!activationZoneRef || !hasTrack) return;

    const handleMouseEnter = () => {
      isMouseNear = true;
    };
    const handleMouseLeave = () => {
      isMouseNear = false;
    };

    activationZoneRef.addEventListener("mouseenter", handleMouseEnter);
    activationZoneRef.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      activationZoneRef?.removeEventListener("mouseenter", handleMouseEnter);
      activationZoneRef?.removeEventListener("mouseleave", handleMouseLeave);
    };
  });

  // --- STATE SYNCHRONIZATION ---
  $effect(() => {
    if (!ctx) return;

    // Si no hay canción, siempre en retreat
    if (!hasTrack) {
      animatePlayer("retreat");
      return;
    }

    // Si hay canción, determinar estado según interacción
    const targetMode = isHovering ? "focus" : isMouseNear ? "active" : "active";
    animatePlayer(targetMode);
  });

  // --- DRAG & DROP STATE ---
  // Removed: let isDragOver = $state(false);

  // --- DRAG HANDLERS ---
  // Removed: handleDragOver, handleDragEnter, handleDragLeave, handleDrop functions
</script>

<!-- PLAYER CONTAINER -->
<div
  bind:this={playerContainerRef}
  id="floating-player-bar"
  class="flex justify-center px-4 pb-6 pointer-events-none fixed bottom-0 left-0 right-0"
  style="perspective: 1000px;"
>
  <!-- Invisible activation zone (solo si hay canción) -->
  {#if hasTrack}
    <div
      bind:this={activationZoneRef}
      class="pointer-events-auto"
      style="position: absolute; top: -32px; left: -32px; right: -32px; bottom: -32px; z-index: -1; background: transparent;"
    ></div>
  {/if}

  <!-- PLAYER ELEMENT - 3D object with glassmorphism -->
  <div
    bind:this={playerRef}
    onmouseenter={() => (isHovering = true)}
    onmouseleave={() => (isHovering = false)}
    role="region"
    class="relative w-full max-w-3xl overflow-hidden border pointer-events-auto bg-slate-800/60 backdrop-blur-2xl backdrop-saturate-150 border-slate-600/30 rounded-2xl transition-all duration-300 ease-out"
    style="transform-style: preserve-3d; will-change: transform, opacity, box-shadow, border-color, background;"
  >
    <!-- Efectos visuales (glow) -->
    <PlayerGlow
      bind:glowLineRef
      bind:glowSpotRef
      isPlaying={player.isPlaying}
    />

    <!-- CONTENT -->
    <div class="relative z-10 px-3 py-2 md:px-4 md:py-3 flex flex-col gap-1">
      <div class="flex items-center justify-around gap-3 w-full">
        <!-- Avatar -->
        <PlayerAvatar track={player.current} bind:previousTrackPath />

        <!-- Track info -->
        <TrackInfo track={player.current} />

        <!-- Waveform Visualizer (Replaces Slider) -->
        {#if hasTrack}
          <div
            class="flex-1 px-2 flex justify-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <Waveform />
          </div>
        {/if}
        <!-- Player Controls -->
        {#if hasTrack}
          <PlayerControls
            isPlaying={player.isPlaying}
            onPlayPause={() => player.togglePlay()}
            onPrevious={() => player.previous()}
            onNext={() => player.next()}
          />
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Removed: .player-drop-active styles */
</style>
