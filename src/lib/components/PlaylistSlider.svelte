<script lang="ts">
  import { onMount } from 'svelte';
  import { animate, stagger } from 'animejs';
  import { ChevronLeft, ChevronRight, Play } from 'lucide-svelte';
  
  interface Playlist {
    id: string;
    name: string;
    description: string | null;
    owner: string;
    tracks_total: number;
    images: string[];
  }
  
  interface Props {
    playlists: Playlist[];
  }
  
  let { playlists }: Props = $props();
  
  let sliderRef: HTMLDivElement;
  let scrollPosition = $state(0);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(true);
  
  onMount(() => {
    // Animación de entrada para el slider
    animate(sliderRef, {
      opacity: [0, 1],
      translateY: [40, 0],
      duration: 1000,
      delay: 600,
      ease: 'out(2)'
    });
    
    // Animación stagger para las cards
    animate('.playlist-card', {
      opacity: [0, 1],
      translateX: [60, 0],
      scale: [0.8, 1],
      duration: 800,
      delay: stagger(80, {start: 800}),
      ease: 'outElastic(1, 0.7)'
    });
    
    updateScrollButtons();
  });
  
  function scroll(direction: 'left' | 'right') {
    if (!sliderRef) return;
    
    const scrollAmount = 400;
    const newPosition = direction === 'left' 
      ? scrollPosition - scrollAmount 
      : scrollPosition + scrollAmount;
    
    animate(sliderRef, {
      scrollLeft: newPosition,
      duration: 600,
      ease: 'out(2)',
      complete: () => {
        scrollPosition = sliderRef.scrollLeft;
        updateScrollButtons();
      }
    });
  }
  
  function updateScrollButtons() {
    if (!sliderRef) return;
    canScrollLeft = sliderRef.scrollLeft > 0;
    canScrollRight = sliderRef.scrollLeft < (sliderRef.scrollWidth - sliderRef.clientWidth - 10);
  }
</script>

<div class="relative" bind:this={sliderRef}>
  <!-- Navigation Buttons -->
  {#if canScrollLeft}
    <button
      onclick={() => scroll('left')}
      class="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-cyan-500/20 backdrop-blur-xl border border-cyan-400/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-xl hover:scale-110"
      style="will-change: transform;"
    >
      <ChevronLeft size={24} />
    </button>
  {/if}
  
  {#if canScrollRight}
    <button
      onclick={() => scroll('right')}
      class="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-cyan-500/20 backdrop-blur-xl border border-cyan-400/30 flex items-center justify-center text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-xl hover:scale-110"
      style="will-change: transform;"
    >
      <ChevronRight size={24} />
    </button>
  {/if}
  
  <!-- Slider Container -->
  <div
    class="flex gap-6 overflow-x-auto overflow-y-hidden scroll-smooth px-2 py-4 scrollbar-hide"
    onscroll={updateScrollButtons}
  >
    {#each playlists as playlist, i (playlist.id)}
      <div class="playlist-card group shrink-0 w-64">
        <div class="relative overflow-hidden rounded-2xl bg-linear-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-400/20 shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/30 transition-all duration-500 cursor-pointer">
          <!-- Image -->
          <div class="relative aspect-square overflow-hidden">
            {#if playlist.images && playlist.images.length > 0}
              <img
                src={playlist.images[0]}
                alt={playlist.name}
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            {:else}
              <div class="w-full h-full bg-linear-to-br from-cyan-600/30 to-blue-600/30 flex items-center justify-center">
                <Play class="text-cyan-300" size={64} />
              </div>
            {/if}
            
            <!-- Overlay on hover -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div class="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                <Play class="text-white ml-1" size={24} fill="white" />
              </div>
            </div>
          </div>
          
          <!-- Info -->
          <div class="p-4 backdrop-blur-sm bg-black/20">
            <h3 class="text-white font-bold text-lg mb-1 truncate group-hover:text-cyan-300 transition-colors">
              {playlist.name}
            </h3>
            <p class="text-cyan-200/60 text-sm mb-2 truncate">
              {playlist.owner}
            </p>
            <p class="text-cyan-300/80 text-xs font-medium">
              {playlist.tracks_total} canciones
            </p>
          </div>
          
          <!-- Glow effect -->
          <div class="absolute inset-0 bg-linear-to-br from-cyan-400/0 via-cyan-400/20 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"></div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .playlist-card {
    will-change: transform, opacity;
    backface-visibility: hidden;
  }
</style>
