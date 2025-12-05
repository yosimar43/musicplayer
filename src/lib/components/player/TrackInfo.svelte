<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import type { Track } from '@/lib/types';

  let { track }: { track: Track | null } = $props();

  let trackInfoRef = $state<HTMLElement>();
  let ctx: gsap.Context | null = null;
  let previousTrackPath = $state<string | null>(null);

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {}, trackInfoRef);
    return () => {
      ctx?.revert();
      ctx = null;
    };
  });

  // --- TRACK CHANGE ANIMATION ---
  $effect(() => {
    const currentTrackPath = track?.path;
    
    if (!trackInfoRef || !ctx) return;
    
    // Detectar cambio de canción
    if (currentTrackPath && currentTrackPath !== previousTrackPath && previousTrackPath !== null) {
      console.log("🎵 Animando cambio de info");
      
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" }
      });
      
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
  <h3 class="track-title">
    {track?.title || 'Sin canción'}
  </h3>
  <div class="title-accent"></div>
  {#if track?.artist}
    <p class="text-white/60 text-xs truncate mt-1">{track.artist}</p>
  {/if}
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
</style>
