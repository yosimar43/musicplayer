<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import type { Track } from '@/lib/types';

  let { track, previousTrackPath = $bindable(), isPlaying }: { track: Track | null; previousTrackPath?: string | null; isPlaying: boolean } = $props();

  let avatarRef = $state<HTMLElement>();
  let ctx: gsap.Context | null = null;
  let currentAnimation: gsap.core.Timeline | null = null;
  let isAnimating = $state(false);
  let rotationAnimation: gsap.core.Tween | null = null;

  function startRotation() {
    if (rotationAnimation) return;
    if (!avatarRef || isAnimating) return;
    
    if (ctx) {
      ctx.add(() => {
        rotationAnimation = gsap.to(avatarRef, {
          rotate: "-=360",
          duration: 8,
          ease: "none",
          repeat: -1
        });
      });
    }
  }

  function stopRotation() {
    if (rotationAnimation) {
      rotationAnimation.kill();
      rotationAnimation = null;
    }
  }

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {
      // Inicializar propiedades de animación
      if (avatarRef) {
        gsap.set(avatarRef, {
          x: 0,
          rotate: 0,
          scale: 1,
          opacity: 1,
          filter: "brightness(1) drop-shadow(0 0 0 rgba(34, 211, 238, 0))"
        });
      }
    }, avatarRef);

    return () => {
      ctx?.revert();
      ctx = null;
      if (currentAnimation) {
        currentAnimation.kill();
        currentAnimation = null;
      }
      stopRotation();
      isAnimating = false;
    };
  });

  // --- TRACK CHANGE ANIMATION ---
  $effect(() => {
    const currentTrackPath = track?.path;
    
    if (!avatarRef || !ctx) return;
    
    // Kill previous animation
    if (currentAnimation) {
      currentAnimation.kill();
      currentAnimation = null;
    }
    
    // Kill rotation during track change
    stopRotation();
    
    // Detectar cambio de canción
    if (currentTrackPath && currentTrackPath !== previousTrackPath) {
      console.log("🎵 Animando cambio de avatar:", currentTrackPath, "vs", previousTrackPath);
      
      isAnimating = true;
      
      ctx.add(() => {
        const tl = gsap.timeline({ 
          defaults: { ease: "power2.inOut" }
        });
        
        currentAnimation = tl;
        
        // Fase 1: Salida - Avatar rota hacia la derecha cubriendo el texto
        tl.to(avatarRef, {
          x: 100,  // Movimiento moderado para cubrir texto sin salir del contenedor
          scale: 0.9,
          rotate: 90,  // Rotación hacia la derecha
          opacity: 0.5,
          filter: "brightness(1.2) drop-shadow(0 0 20px rgba(34, 211, 238, 0.5))",  // Efecto shiny
          duration: 0.6,
          ease: "power2.in"
        })
        // Fase 2: Regreso - Avatar vuelve con nueva información y efecto shiny
        .to(avatarRef, {
          x: 0,
          scale: 1.1,
          rotate: 0,
          opacity: 1,
          filter: "brightness(1.5) drop-shadow(0 0 30px rgba(34, 211, 238, 0.8))",  // Más shiny
          duration: 0.8,
          ease: "back.out(2)"
        })
        // Pequeño rebote y fade del efecto shiny
        .to(avatarRef, {
          scale: 1,
          filter: "brightness(1) drop-shadow(0 0 0 rgba(34, 211, 238, 0))",  // Regreso normal
          duration: 0.4,
          ease: "elastic.out(1, 0.5)"
        })
        .call(() => {
          currentAnimation = null;
          isAnimating = false;
          // Restart rotation if playing
          if (isPlaying) {
            startRotation();
          }
        });
      });
    }
    
    // Actualizar track anterior
    if (currentTrackPath) {
      previousTrackPath = currentTrackPath;
    } else {
      previousTrackPath = null;
    }
  });

  // --- ROTATION ANIMATION ---
  $effect(() => {
    if (isPlaying && !isAnimating) {
      startRotation();
    } else {
      stopRotation();
    }
  });
</script>

<div class="h-12 w-12 inline-block" style="will-change: transform; position: relative;">
  {#if track}
    <Avatar.Root class="h-12 w-12 ring-2 ring-cyan-500/20">
      <Avatar.Image 
        src={track.albumArt || ''} 
        alt={track.album || 'Album cover'} 
      />
      <Avatar.Fallback class="bg-slate-700/80 text-cyan-400 text-xs font-semibold">
        {track.title?.slice(0, 2).toUpperCase() || '♪'}
      </Avatar.Fallback>
    </Avatar.Root>
  {:else}
    <!-- Skeleton cuando no hay canción -->
    <div class="h-12 w-12 rounded-full bg-slate-700/50 animate-pulse"></div>
  {/if}
</div>
