<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat } from 'lucide-svelte';
   import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { usePlayer } from '@/lib/hooks/usePlayer.svelte';

  const player = usePlayer();

  // --- STATE ---
  let playerContainerRef = $state<HTMLElement>();
  let playerRef = $state<HTMLElement>();
  let glowLineRef = $state<HTMLElement>();
  let glowSpotRef = $state<HTMLElement>();
  let activationZoneRef = $state<HTMLElement>();
  let avatarRef = $state<HTMLElement>();
  let trackInfoRef = $state<HTMLElement>();

  let isMouseNear = $state(false);
  let isHovering = $state(false);
  let previousTrack = $state<string | null>(null);

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
        glow: { lineOpacity: 0.2, spotOpacity: 0 }
      },
      active: {
        player: { scale: 1, z: 0, rotateX: 0, opacity: 1 },
        glow: { lineOpacity: 0.6, spotOpacity: 0.4 }
      },
      focus: {
        player: { 
          scale: 1.05, 
          z: 20, 
          rotateX: 0, 
          opacity: 1,
          boxShadow: "0 20px 50px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.2), 0 0 80px rgba(147, 51, 234, 0.15)"
        },
        glow: { lineOpacity: 0.8, spotOpacity: 0.6 }
      }
    };

    const duration = targetMode === "focus" ? 0.4 : 1.2;
    const ease = targetMode === "focus" ? "back.out(1.5)" : "power1.out";

    gsap.to(playerRef, { ...config[targetMode].player, duration, ease });
    gsap.to([glowLineRef, glowSpotRef], { 
      opacity: config[targetMode].glow.lineOpacity, 
      duration, 
      ease 
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
          opacity: 1
        });

        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.set(playerRef, { y: 100, opacity: 0, rotateX: -20 })
          .to(playerRef, {
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
    
    const handleMouseEnter = () => { isMouseNear = true; };
    const handleMouseLeave = () => { isMouseNear = false; };
    
    activationZoneRef.addEventListener('mouseenter', handleMouseEnter);
    activationZoneRef.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      activationZoneRef?.removeEventListener('mouseenter', handleMouseEnter);
      activationZoneRef?.removeEventListener('mouseleave', handleMouseLeave);
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

  // --- TRACK CHANGE ANIMATION ---
  $effect(() => {
    const currentTrackPath = player.current?.path;
    
    if (!avatarRef || !trackInfoRef) return;
    
    // Detectar cambio de canción
    if (currentTrackPath && currentTrackPath !== previousTrack && previousTrack !== null) {
      // Animar cambio de canción
      const tl = gsap.timeline({ 
        defaults: { ease: "power2.inOut" },
        onStart: () => {
          console.log("🎵 Animando cambio de canción");
        }
      });
      
      // Fase 1: Salida - Avatar se mueve a la derecha mientras rota y se desvanece
      tl.to(avatarRef, {
        x: 300,
        scale: 0.8,
        rotation: 180,
        opacity: 0.3,
        duration: 0.5,
        ease: "power2.in"
      })
      // Texto se desvanece simultáneamente
      .to(trackInfoRef, {
        opacity: 0,
        x: -30,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.in"
      }, "<")
      // Fase 2: Regreso - Avatar vuelve con rotación y efecto elástico
      .to(avatarRef, {
        x: 0,
        scale: 1.15,
        rotation: 360,
        opacity: 1,
        duration: 0.7,
        ease: "back.out(2)"
      })
      // Pequeño rebote al final
      .to(avatarRef, {
        scale: 1,
        duration: 0.5,
        ease: "elastic.out(1, 0.5)"
      })
      // Texto reaparece con delay y desde abajo
      .fromTo(trackInfoRef, {
        opacity: 0,
        y: 10,
        scale: 0.9
      }, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.5)"
      }, "-=0.5");
    }
    
    // Actualizar track anterior
    if (currentTrackPath) {
      previousTrack = currentTrackPath;
    } else {
      previousTrack = null;
    }
  });

</script>

<!-- PLAYER CONTAINER -->
<div
  bind:this={playerContainerRef}
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
    onmouseenter={() => isHovering = true}
    onmouseleave={() => isHovering = false}
    role="region"
    class="relative w-full max-w-3xl overflow-hidden border pointer-events-auto bg-slate-800/60 backdrop-blur-2xl backdrop-saturate-150 border-slate-600/30 rounded-2xl"
    style="transform-style: preserve-3d; will-change: transform, opacity;"
  >
    <!-- Top Light Border (Reflection) -->
    <div
      class="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent opacity-80"
    ></div>

    <!-- Glow Line & Spot (Consolidated) -->
    <div
      bind:this={glowLineRef}
      class="absolute top-px left-0 right-0 h-px blur-px pointer-events-none"
      style="background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.6), rgba(147, 51, 234, 0.4), transparent); opacity: 0.6;"
    ></div>

    <div
      bind:this={glowSpotRef}
      class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 blur-[60px] pointer-events-none rounded-full"
      style="background: linear-gradient(to bottom, rgba(34, 211, 238, 0.15), rgba(147, 51, 234, 0.1)); opacity: 0.4;"
    ></div>

    <!-- CONTENT -->
    <div class="relative z-10 px-3 py-2 md:px-4 md:py-3 flex items-center gap-3">
      <!-- Avatar con skeleton -->
      <div bind:this={avatarRef} style="will-change: transform;">
        {#if hasTrack}
          <Avatar.Root class="h-12 w-12 ring-2 ring-cyan-500/20">
            <Avatar.Image 
              src={player.current?.albumArt || ''} 
              alt={player.current?.album || 'Album cover'} 
            />
            <Avatar.Fallback class="bg-slate-700/80 text-cyan-400 text-xs font-semibold">
              {player.current?.title?.slice(0, 2).toUpperCase() || '♪'}
            </Avatar.Fallback>
          </Avatar.Root>
        {:else}
          <!-- Skeleton cuando no hay canción -->
          <div class="h-12 w-12 rounded-full bg-slate-700/50 animate-pulse"></div>
        {/if}
      </div>
      
      <!-- Track info -->
      <div bind:this={trackInfoRef} class="flex-1 min-w-0 relative" style="will-change: transform, opacity;">
        <h3 class="track-title">
          {player.current?.title || 'Sin canción'}
        </h3>
        <div class="title-accent"></div>
        {#if player.current?.artist}
          <p class="text-white/60 text-xs truncate mt-1">{player.current.artist}</p>
        {/if}
      </div>

      <!-- Player Controls -->
      {#if hasTrack}
        <div class="player-controls">
          <!-- Previous Button -->
          <button
            class="control-button"
            onclick={() => player.previous()}
            title="Anterior"
          >
            <div class="button-bg"></div>
            <div class="button-content">
              <SkipBack size={18} class="button-icon" />
            </div>
          </button>

          <!-- Next Button -->
          <button
            class="control-button"
            onclick={() => player.next()}
            title="Siguiente"
          >
            <div class="button-bg"></div>
            <div class="button-content">
              <SkipForward size={18} class="button-icon" />
            </div>
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .track-title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(56, 189, 248, 0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  }

  .title-accent {
    position: absolute;
    bottom: -4px;
    left: 0;
    height: 2px;
    width: 80px;
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.6), transparent);
    border-radius: 1px;
  }

  /* Player Controls */
  .player-controls {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  /* Control Button Style - Circular con anillo animado */
  .control-button {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    transition: all 0.3s ease;
    cursor: pointer;
    user-select: none;
    outline: none;
    background: rgba(56, 189, 248, 0.15);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(56, 189, 248, 0.3);
  }

  .control-button:focus-visible {
    outline: 2px solid rgba(56, 189, 248, 0.5);
    outline-offset: 2px;
  }

  /* Anillo animado en hover */
  .button-bg {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, rgba(103, 232, 249, 0.8), rgba(56, 189, 248, 0.6));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    animation: rotate-ring 2s linear infinite;
    animation-play-state: paused;
  }

  @keyframes rotate-ring {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .control-button:hover .button-bg {
    opacity: 1;
    animation-play-state: running;
  }

  /* Button Content */
  .button-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  /* Icon Styling */
  :global(.control-button .button-icon) {
    color: rgba(255, 255, 255, 0.95);
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.4));
  }

  .control-button:hover :global(.button-icon) {
    color: rgba(103, 232, 249, 1);
    filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.8));
    transform: scale(1.1);
  }

  .control-button:active {
    transform: scale(0.95);
  }
</style>

