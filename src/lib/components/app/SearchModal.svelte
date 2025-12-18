<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Search, X } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import { useLibrary } from '$lib/hooks/useLibrary.svelte';
  import { usePlayer } from '$lib/hooks/usePlayer.svelte';
  import gsap from 'gsap';
  import { debounce } from '$lib/utils/debounce';
  import type { MusicFile } from '$lib/types';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let searchQuery = $state('');
  let isSearchFocused = $state(false);
  let modalRef = $state<HTMLDivElement>();
  let inputRef = $state<HTMLInputElement>();
  let debouncedQuery = $state('');
  let isSearching = $state(false);
  let modalContainerRef = $state<HTMLDivElement>();

  const library = useLibrary();
  const player = usePlayer();

  // Funciones para manejar clicks en las cards
  async function handleCardClick(track: MusicFile) {
    try {
      // Reproduciendo desde búsqueda
      
      // Quitar foco del input para evitar interferencias
      inputRef?.blur();
      
      // Solo reproducir la canción seleccionada sin cambiar la cola
      await player.play(track);
      
      // Pequeño delay antes de cerrar para asegurar sincronización
      setTimeout(() => onClose(), 100);
    } catch (error) {
      // Error al reproducir track
      console.error('Error reproduciendo desde búsqueda:', error);
      onClose();
    }
  }

  function handleCardRightClick(track: MusicFile) {
    try {
      // Agregando después desde búsqueda
      player.enqueueNext(track);
      onClose();
    } catch (error) {
      // Error al agregar después
    }
  }

  // Debounce la búsqueda para evitar llamadas excesivas
  const debouncedSearch = debounce((query: string) => {
    debouncedQuery = query;
    isSearching = false;
  }, 300);

  // Resultados de búsqueda (solo cuando hay query debounced y modal abierto)
  const searchResults = $derived.by(() => {
    if (!isOpen || !debouncedQuery.trim()) return [];

    const query = debouncedQuery.toLowerCase();

    // Buscar en biblioteca local
    const localTracks = library.searchTracks(query);

    return localTracks.slice(0, 20); // Limitar a 20 resultados para mostrar
  });

  // Todos los resultados de búsqueda (para la cola de reproducción)
  const allSearchResults = $derived.by(() => {
    if (!debouncedQuery.trim()) return [];

    const query = debouncedQuery.toLowerCase();
    return library.searchTracks(query);
  });

  // Efecto para manejar cambios en searchQuery y limpiar cuando se cierra
  $effect(() => {
    if (!isOpen) {
      searchQuery = '';
      debouncedQuery = '';
      isSearching = false;
    } else if (searchQuery) {
      isSearching = true;
      debouncedSearch(searchQuery);
    } else {
      debouncedQuery = '';
      isSearching = false;
    }
  });

  // Animación de entrada/salida elaborada
  $effect(() => {
    if (isOpen && modalRef) {
      // Animación de entrada con stagger
      const tl = gsap.timeline();
      
      // Primero el backdrop
      tl.fromTo(modalRef, 
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      )
      // Luego el modal con scale y fade
      .fromTo(modalRef.querySelector('.modal-content'),
        { 
          scale: 0.8, 
          y: 20, 
          opacity: 0,
          transformOrigin: 'center center'
        },
        { 
          scale: 1, 
          y: 0, 
          opacity: 1, 
          duration: 0.4, 
          ease: 'back.out(1.7)' 
        },
        '-=0.1'
      )
      // Finalmente el input con un pequeño delay
      .fromTo(modalRef.querySelector('input'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
        '-=0.2'
      );

      // Focus en input después de la animación
      setTimeout(() => inputRef?.focus(), 300);
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === modalRef) {
      onClose();
    }
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClose();
    }
  }

  // Sistema de orbes animados (similar al layout principal)
  let orbCtx: gsap.Context | null = null;

  $effect(() => {
    if (isOpen && modalContainerRef) {
      // Crear contexto GSAP para los orbes del modal
      orbCtx = gsap.context(() => {
        const orbs = modalContainerRef?.querySelectorAll('.modal-orb');
        if (!orbs?.length) return;

        const orbData = Array.from(orbs).map(() => ({
          xOff: Math.random() * 100,
          yOff: Math.random() * 100,
          speed: 0.15 + Math.random() * 0.1,
          range: 20 + Math.random() * 15
        }));

        let lastTime = 0;

        // Throttled ticker para animación suave
        gsap.ticker.add((time) => {
          if (time - lastTime < 0.04) return; // ~25fps para orbes
          lastTime = time;

          orbs.forEach((orb, i) => {
            const data = orbData[i];
            const x = Math.sin(time * data.speed + data.xOff) * data.range;
            const y = Math.cos(time * data.speed + data.yOff) * data.range;
            gsap.set(orb, { x, y });
          });
        });
      }, modalContainerRef);

      return () => {
        orbCtx?.revert();
        orbCtx = null;
      };
    }
  });

  // Animaciones para caracteres flotantes
  let charCtx: gsap.Context | null = null;
  let previousQuery = '';

  $effect(() => {
    if (isOpen && modalRef) {
      charCtx = gsap.context(() => {
        // Cuando cambia el query, animar entrada de nuevos caracteres
        if (searchQuery !== previousQuery) {
          const chars = modalRef?.querySelectorAll('.char');
          if (chars) {
            gsap.fromTo(chars,
              { opacity: 0, y: 8, scale: 0.95 },
              {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.4,
                ease: 'power2.out',
                stagger: 0.02
              }
            );
          }
          previousQuery = searchQuery;
        }
      }, modalRef);

      return () => {
        charCtx?.revert();
        charCtx = null;
      };
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    bind:this={modalRef}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
    transition:fade={{ duration: 200 }}
  >
    <!-- Modal Card -->
    <div class="modal-content w-[90vw] max-h-[85vh] bg-linear-to-br from-slate-900/40 to-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden relative">
      <!-- Background orbs -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none" bind:this={modalContainerRef}>
        <div class="modal-orb modal-orb-1"></div>
        <div class="modal-orb modal-orb-2"></div>
        <div class="modal-orb modal-orb-3"></div>
        <div class="modal-orb modal-orb-amber-1"></div>
        <div class="modal-orb modal-orb-amber-2"></div>
      </div>
      <!-- Header con búsqueda -->
      <div class="p-8">
        <div class="search-wrapper flex justify-center">
          <div
            class="search-shell relative flex items-center cursor-text overflow-hidden"
            onclick={() => inputRef?.focus()}
          >
            

            <!-- Floating text layer -->
            <div class="floating-text flex-1 flex items-center gap-1 overflow-hidden">
              {#if searchQuery.length === 0}
                <span class="placeholder text-lg font-light text-slate-400/80 letter-spacing-0.1em">
                  Buscar música
                </span>
              {:else}
                {#each searchQuery.split('') as char, i}
                  <span class="char text-lg font-normal text-slate-100" style="--i: {i}">
                    {char}
                  </span>
                {/each}
              {/if}

              {#if isSearchFocused}
                <span class="caret w-0.5 h-5 bg-cyan-400 ml-1 animate-blink"></span>
              {/if}
            </div>

            {#if searchQuery}
              <button
                onclick={() => searchQuery = ''}
                class="clear p-3 text-slate-300 hover:text-white transition-opacity flex-shrink-0"
              >
                <X class="w-5 h-5" />
              </button>
            {/if}

            <!-- Invisible input -->
            <input
              bind:this={inputRef}
              type="text"
              bind:value={searchQuery}
              onfocus={() => isSearchFocused = true}
              onblur={() => isSearchFocused = false}
              class="absolute inset-0 opacity-0 pointer-events-none caret-transparent text-transparent"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
        </div>
      </div>

      <!-- Resultados -->
      <div class="results-container {searchResults.length > 0 ? 'expanded' : 'collapsed'}">
        {#if isSearching}
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p class="text-slate-400 mt-4">Buscando...</p>
          </div>
        {:else if searchResults.length === 0 && searchQuery.trim()}
          <div class="text-center py-12">
            <p class="text-slate-400">No se encontraron resultados para "{searchQuery}"</p>
          </div>
        {:else if searchResults.length > 0}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {#each searchResults as track}
              <button
                type="button"
                class="search-card group bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors cursor-pointer text-left w-full"
                onclick={() => handleCardClick(track)}
                oncontextmenu={(e) => { e.preventDefault(); handleCardRightClick(track); }}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(track);
                  }
                }}
              >
                <div class="flex items-center space-x-4">
                  <!-- Album art -->
                  <div class="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg overflow-hidden flex-shrink-0">
                    {#if track.albumArt}
                      <img 
                        src={track.albumArt} 
                        alt="Album art" 
                        class="w-full h-full object-cover"
                        onerror={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          ((e.target as HTMLElement).nextElementSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <!-- Fallback icon -->
                      <div class="w-full h-full items-center justify-center hidden">
                        <Search class="w-8 h-8 text-cyan-400/60" />
                      </div>
                    {:else}
                      <div class="w-full h-full flex items-center justify-center">
                        <Search class="w-8 h-8 text-cyan-400/60" />
                      </div>
                    {/if}
                  </div>
                  
                  <!-- Track info -->
                  <div class="flex-1 min-w-0">
                    <p class="text-base font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                      {track.title || track.path.split('/').pop()?.split('.')[0] || 'Sin título'}
                    </p>
                    <p class="text-sm text-slate-400 truncate">
                      {track.artist || 'Artista desconocido'}
                    </p>
                    {#if track.album}
                      <p class="text-sm text-slate-500 truncate">
                        {track.album}
                      </p>
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="text-center py-12">
            <Search class="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p class="text-slate-400">Empieza a escribir para buscar...</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Orbes animados del modal */
  .modal-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.3;
    will-change: transform;
    pointer-events: none;
  }

  .modal-orb-1 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%);
    top: -10%;
    left: -5%;
  }

  .modal-orb-2 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
    bottom: -5%;
    right: -3%;
  }

  .modal-orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, transparent 70%);
    top: 30%;
    left: 70%;
  }

  .modal-orb-amber-1 {
    width: 280px;
    height: 280px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, transparent 70%);
    top: 15%;
    right: 10%;
  }

  .modal-orb-amber-2 {
    width: 220px;
    height: 220px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%);
    top: 40%;
    left: 25%;
  }

  /* Ocultar scrollbar */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Efectos shiny en las cards */
  .search-card {
    position: relative;
    overflow: hidden;
  }

  .search-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s ease;
    pointer-events: none;
  }

  .search-card:hover::before {
    left: 100%;
  }

  .search-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.05) 0%,
      transparent 50%,
      rgba(99, 102, 241, 0.05) 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .search-card:hover::after {
    opacity: 1;
  }

  /* Floating text styles */
  .search-wrapper {
    display: flex;
    justify-content: center;
  }

  .search-shell {
    width: 100%;
    max-width: 640px;
    min-width: 420px;
    height: 42px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    gap: 14px;
    border-radius: 0;
    background: transparent;
    position: relative;
  }

  .search-shell::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 6px;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(110,231,255,0.5),
      transparent
    );
    transition: background 0.3s ease;
  }

  .search-shell::before {
    content: "";
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: 6px;
    height: 1px;
    background: rgba(110,231,255,0.35);
    filter: blur(6px);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .search-shell:focus-within::after {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(110,231,255,0.9),
      transparent
    );
  }

  .search-shell:focus-within::before {
    opacity: 1;
  }

  /* Reset input styles to prevent native borders */
  .search-shell input {
    border: none !important;
    outline: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .floating-text {
    min-height: 1em;
    align-items: center;
    transform: translateY(-6px);
  }

  .placeholder {
    opacity: 0.4;
    letter-spacing: 0.1em;
    user-select: none;
  }

  .char {
    display: inline-block;
    animation: floatIn 0.35s ease forwards, drift 4s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.02s), 0s;
    will-change: transform, opacity;
  }

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes drift {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-2px) scale(1); }
  }

  .caret {
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  .clear {
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .clear:hover {
    opacity: 1;
  }

  /* Results container animation */
  .results-container {
    padding: 2rem;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    transition: max-height 0.3s ease-out;
  }

  .results-container::-webkit-scrollbar {
    display: none;
  }

  .collapsed {
    max-height: 300px;
  }

  .expanded {
    max-height: 65vh;
  }
</style>