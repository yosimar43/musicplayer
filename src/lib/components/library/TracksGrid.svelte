<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { MusicCard3D } from "$lib/components/tracks";
  import LetterSeparator from "./LetterSeparator.svelte";
  import type { MusicFile } from "$lib/types";

  interface Props {
    tracks: MusicFile[];
    isLoadingMore?: boolean;
    hasMore?: boolean;
    getTrackLetter: (track: MusicFile, index: number) => string | null;
  }

  let { 
    tracks, 
    isLoadingMore = false, 
    hasMore = false,
    getTrackLetter 
  }: Props = $props();

  let gridRef = $state<HTMLDivElement>();
  let hasAnimated = $state(false);
  let previousTrackCount = $state(0);

  // ✅ Animación de entrada escalonada cuando cambian los tracks
  $effect(() => {
    if (!gridRef || tracks.length === 0) return;
    
    const cards = gridRef.querySelectorAll('.card-wrapper');
    if (!cards.length) return;

    // Determinar qué cards animar (nuevas vs existentes)
    const newCards = Array.from(cards).slice(previousTrackCount);
    const isInitialLoad = !hasAnimated && previousTrackCount === 0;
    
    if (isInitialLoad) {
      // Primera carga: animar todas con stagger
      gsap.set(cards, { opacity: 0, y: 30, scale: 0.9 });
      
      gsap.to(cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: {
          each: 0.03,
          from: "start",
          grid: "auto",
          ease: "power2.out"
        },
        ease: "back.out(1.2)",
        clearProps: "transform,opacity"
      });
      
      hasAnimated = true;
    } else if (newCards.length > 0) {
      // Carga incremental: animar solo las nuevas cards
      gsap.set(newCards, { opacity: 0, y: 20, scale: 0.95 });
      
      gsap.to(newCards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.3,
        stagger: 0.02,
        ease: "power2.out",
        clearProps: "transform,opacity"
      });
    }
    
    previousTrackCount = tracks.length;
  });

  // Cleanup al desmontar
  onMount(() => {
    return () => {
      if (gridRef) {
        gsap.killTweensOf(gridRef.querySelectorAll('.card-wrapper'));
      }
    };
  });
</script>

<div bind:this={gridRef} class="cards-grid">
  {#each tracks as track, index (track.path)}
    {@const letter = getTrackLetter(track, index)}
    {#if letter}
      <LetterSeparator {letter} />
    {/if}
    <div class="card-wrapper" data-letter={letter || undefined}>
      <MusicCard3D {track} />
    </div>
  {/each}
  
  <!-- Indicador de carga -->
  {#if isLoadingMore}
    <div class="loading-more">
      <div class="loading-spinner"></div>
    </div>
  {/if}
  
  <!-- Espaciador final -->
  {#if hasMore}
    <div class="scroll-trigger"></div>
  {/if}
</div>

<style>
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 180px));
    gap: 20px;
    padding: 20px;
    padding-right: 50px;
    width: 100%;
    justify-content: center;
  }

  .card-wrapper {
    /* Necesario para animaciones GSAP - no usar display: contents */
    will-change: transform, opacity;
  }

  .loading-more {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(56, 189, 248, 0.2);
    border-top-color: rgba(56, 189, 248, 0.8);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .scroll-trigger {
    grid-column: 1 / -1;
    height: 1px;
  }

  @media (max-width: 900px) {
    .cards-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 160px));
      gap: 16px;
      padding: 16px;
      padding-right: 45px;
    }
  }

  @media (max-width: 640px) {
    .cards-grid {
      grid-template-columns: repeat(auto-fill, minmax(100px, 140px));
      gap: 14px;
      padding: 12px;
      padding-right: 40px;
    }
  }

  @media (max-width: 400px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 10px;
      padding-right: 35px;
    }
  }
</style>
