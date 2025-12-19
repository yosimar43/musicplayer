<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import type { Track } from '@/lib/types';
  import ShinyText from '@/lib/components/ui/ShinyText.svelte';

  let { track }: { track: Track | null } = $props();

  let trackInfoRef = $state<HTMLElement>();
  let ctx: gsap.Context | null = null;
  let previousTrackPath = $state<string | null>(null);
  let currentAnimation: gsap.core.Timeline | null = null;

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {}, trackInfoRef);
    return () => {
      if (currentAnimation) {
        currentAnimation.kill();
        currentAnimation = null;
      }
      ctx?.revert();
      ctx = null;
    };
  });

  // --- TRACK CHANGE ANIMATION ---
  $effect(() => {
    const currentTrackPath = track?.path;
    
    if (!trackInfoRef || !ctx) return;
    
    // Kill previous animation
    if (currentAnimation) {
      currentAnimation.kill();
      currentAnimation = null;
    }
    
    // Detectar cambio de canción
    if (currentTrackPath && currentTrackPath !== previousTrackPath && previousTrackPath !== null) {
      console.log("🎵 Animando cambio de info");
      
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" }
      });
      
      currentAnimation = tl;
      
      // Texto se desvanece
      tl.to(trackInfoRef, {
        opacity: 0,
        x: -30,
        scale: 0.95,
        duration: 0.4,
        ease: "power2.in"
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
      }, "+=0.1")
      .call(() => {
        currentAnimation = null;
      });
    }
    
    // Actualizar track anterior
    if (currentTrackPath) {
      previousTrackPath = currentTrackPath;
    } else {
      previousTrackPath = null;
    }
  });
</script>

<div bind:this={trackInfoRef} class="flex-1 min-w-0 relative" style="will-change: transform, opacity;">
  <div class="track-title-wrapper">
    <ShinyText text={track?.title || 'Sin canción'} truncate={true} />
  </div>
  <div class="title-accent"></div>
  {#if track?.artist}
    <div class="mt-1">
      <ShinyText text={track.artist} subtext={true} truncate={true} />
    </div>
  {/if}
</div>

<style>
  .track-title-wrapper {
    margin-bottom: 2px;
    /* Ensure long titles don't break layout but allow sparkles to show */
    max-width: 100%;
    overflow: visible; 
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
</style>
