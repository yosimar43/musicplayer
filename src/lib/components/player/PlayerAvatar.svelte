<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import type { Track } from '@/lib/types';

  let { track, previousTrackPath = $bindable() }: { track: Track | null; previousTrackPath?: string | null } = $props();

  let avatarRef = $state<HTMLElement>();
  let ctx: gsap.Context | null = null;

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {}, avatarRef);
    return () => {
      ctx?.revert();
      ctx = null;
    };
  });

  // --- TRACK CHANGE ANIMATION ---
  $effect(() => {
    const currentTrackPath = track?.path;
    
    if (!avatarRef || !ctx) return;
    
    // Detectar cambio de canción
    if (currentTrackPath && currentTrackPath !== previousTrackPath && previousTrackPath !== null) {
      console.log("🎵 Animando cambio de avatar");
      
      const tl = gsap.timeline({ 
        defaults: { ease: "power2.inOut" }
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

<div bind:this={avatarRef} style="will-change: transform;">
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
