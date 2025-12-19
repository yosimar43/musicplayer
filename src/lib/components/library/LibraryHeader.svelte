<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Play, Pause, Shuffle } from 'lucide-svelte';
  import { usePlayer } from '@/lib/hooks/usePlayer.svelte';
  import type { Track } from '@/lib/stores/library.store.svelte';
  import ShinyText from '@/lib/components/ui/ShinyText.svelte';

  interface Props {
    title?: string;
    count: number;
    tracks: Track[];
  }

  let { title = "Tu Biblioteca", count, tracks }: Props = $props();
  
  let displayCount = $state(0);
  let countRef = $state<HTMLElement>();
  let titleRef = $state<HTMLElement>();
  let playButtonRef = $state<HTMLDivElement>();
  let shuffleButtonRef = $state<HTMLDivElement>();
  
  const player = usePlayer();
  
  // GSAP context para limpiar animaciones
  let ctx: gsap.Context | null = null;

  // Estados del botón
  let playIsHovering = $state(false);
  let shuffleIsHovering = $state(false);

  // Animar entrada del título y botones
  onMount(() => {
    ctx = gsap.context(() => {
      if (titleRef) {
        gsap.from(titleRef, {
          opacity: 0,
          y: 10,
          duration: 0.6,
          ease: "power2.out",
          delay: 0.1
        });
      }

      // Entrada de botones cayendo del cielo como pelota
      if (playButtonRef && shuffleButtonRef) {
        const buttons = [playButtonRef, shuffleButtonRef];
        
        buttons.forEach((button, index) => {
          const tl = gsap.timeline({ delay: 0.2 + (index * 0.12) });
          
          // Caída rápida
          tl.fromTo(button,
            {
              opacity: 0,
              y: -120,
              scale: 0.7
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.45,
              ease: "power3.in"
            }
          )
          // Rebote inmediato
          .to(button, {
            y: -12,
            duration: 0.12,
            ease: "power2.out"
          })
          // Caída final
          .to(button, {
            y: 0,
            duration: 0.12,
            ease: "power2.in"
          });
        });
      }
    });

    return () => {
      ctx?.revert();
    };
  });

  // Animar el contador cuando cambie count
  $effect(() => {
    if (!countRef) return;

    const duration = Math.min(Math.max(count / 500, 0.5), 2);
    
    gsap.to(
      { value: 0 },
      {
        value: count,
        duration,
        ease: "power2.out",
        onUpdate: function() {
          displayCount = Math.round(this.targets()[0].value);
        }
      }
    );
  });

  // Event handlers - animaciones manejadas por CSS
  function handlePlayEnter() {
    playIsHovering = true;
  }

  function handlePlayLeave() {
    playIsHovering = false;
  }

  function handleShuffleEnter() {
    shuffleIsHovering = true;
  }

  function handleShuffleLeave() {
    shuffleIsHovering = false;
  }

  function handlePlayClick() {
    if (count === 0 || tracks.length === 0) return;
    
    // Ordenar tracks alfabéticamente para reproducción consistente
    const sortedTracks = [...tracks].sort((a, b) => {
      const titleA = (a.title || a.path).toLowerCase();
      const titleB = (b.title || b.path).toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    // Si ya hay una canción reproduciendo en esta biblioteca, toggle play/pause
    if (player.current && sortedTracks.some(t => t.path === player.current?.path)) {
      player.togglePlay();
    } else {
      // Reproducir toda la biblioteca desde el inicio
      player.playQueue(sortedTracks, 0);
    }
  }

  function handleShuffleClick() {
    if (count === 0 || tracks.length === 0) return;
    
    const willEnableShuffle = !player.isShuffle;
    
    // Si no hay nada reproduciéndose, cargar la cola primero
    if (!player.isPlaying && tracks.length > 0) {
      if (willEnableShuffle) {
        // Will enable shuffle, shuffle tracks and play first (random)
        const shuffled = shuffleArray(tracks);
        player.playQueue(shuffled, 0, false);
      } else {
        // Will disable shuffle, sort tracks and play first
        const sortedTracks = [...tracks].sort((a, b) => {
          const titleA = (a.title || a.path).toLowerCase();
          const titleB = (b.title || b.path).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        player.playQueue(sortedTracks, 0, false);
      }
    }
    
    // Luego activar/desactivar shuffle
    player.toggleShuffle();
  }

  // Función para mezclar array
  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Keyboard handlers para accesibilidad
  function handlePlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePlayClick();
    }
  }

  function handleShuffleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleShuffleClick();
    }
  }
</script>

<header class="tracks-header">
  <div class="header-left">
    <div class="header-content">
      <div bind:this={titleRef} class="tracks-title-wrapper">
        <ShinyText text={title} truncate={true} />
      </div>
      <div class="title-accent"></div>
    </div>
  </div>
  
  <div class="header-right">
    <div class="header-controls">
      <!-- Botón Play/Pause -->
      <div
        bind:this={playButtonRef}
        class="nav-button"
        class:active={player.isPlaying}
        onmouseenter={handlePlayEnter}
        onmouseleave={handlePlayLeave}
        onclick={handlePlayClick}
        onkeydown={handlePlayKeydown}
        role="button"
        tabindex="0"
        title={player.isPlaying ? "Pausar" : "Reproducir biblioteca"}
      >
        <!-- Active/Hover Background -->
        <div class="button-bg"></div>

        <div class="button-content">
          {#if player.isPlaying}
            <Pause size={20} class="button-icon" />
          {:else}
            <Play size={20} class="button-icon" />
          {/if}
        </div>

        <!-- Active Indicator (Dot) -->
        <div class="active-dot"></div>
      </div>

      <!-- Botón Shuffle -->
      <div
        bind:this={shuffleButtonRef}
        class="nav-button"
        class:active={player.isShuffle}
        onmouseenter={handleShuffleEnter}
        onmouseleave={handleShuffleLeave}
        onclick={handleShuffleClick}
        onkeydown={handleShuffleKeydown}
        role="button"
        tabindex="0"
        title="Modo aleatorio"
      >
        <!-- Active/Hover Background -->
        <div class="button-bg"></div>

        <div class="button-content">
          <Shuffle size={20} class="button-icon" />
        </div>

        <!-- Active Indicator (Dot) -->
        <div class="active-dot"></div>
      </div>
    </div>

    <span bind:this={countRef} class="tracks-count">{displayCount.toLocaleString()}</span>
  </div>
</header>

<style>
  .tracks-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 0 20px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 1200px;
  }

  .header-left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .header-content {
    position: relative;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .title-accent {
    position: absolute;
    bottom: -4px;
    left: 0;
    height: 2px;
    width: 60px;
    background: linear-gradient(90deg, rgba(56, 189, 248, 0.6), transparent);
    border-radius: 1px;
  }

  /* Header Controls - Botones */
  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .tracks-count {
    color: rgba(56, 189, 248, 0.8);
    font-size: 0.9rem;
    font-weight: 500;
    background: rgba(56, 189, 248, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(56, 189, 248, 0.2);
    transition: all 0.3s ease;
    min-width: 60px;
    text-align: center;
    white-space: nowrap;
  }

  /* Nav Button Style - Circular con anillo animado */
  .nav-button {
    position: relative;
    width: 44px;
    height: 44px;
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

  .nav-button:focus-visible {
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

  .nav-button:hover .button-bg {
    opacity: 1;
    animation-play-state: running;
  }

  .nav-button.active .button-bg {
    opacity: 1;
  }

  /* Button Content */
  .button-content {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  /* Icon Styling - Mayor brillo base */
  :global(.button-icon) {
    color: rgba(255, 255, 255, 0.95);
    transition: all 0.3s ease;
    filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.4));
  }

  .nav-button:hover :global(.button-icon) {
    color: rgba(103, 232, 249, 1);
    filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.8));
    transform: scale(1.1);
  }

  .nav-button.active :global(.button-icon) {
    color: rgba(103, 232, 249, 1);
    filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.8));
  }

  /* Active Indicator (Dot) */
  .active-dot {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background: rgba(103, 232, 249, 1);
    border-radius: 50%;
    opacity: 0;
    scale: 0;
    transition: all 0.3s ease;
    box-shadow: 0 0 8px rgba(103, 232, 249, 0.8);
  }

  .nav-button.active .active-dot {
    opacity: 1;
    scale: 1;
  }

  .nav-button:hover .active-dot {
    opacity: 0.5;
    scale: 0.75;
  }

  @media (max-width: 640px) {
    .tracks-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .header-left,
    .header-right {
      width: 100%;
      justify-content: space-between;
    }

    .header-right {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tracks-count {
      width: auto;
    }
  }
</style>
