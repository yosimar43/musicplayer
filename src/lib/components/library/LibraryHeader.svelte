<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Play, Shuffle } from 'lucide-svelte';
  import { usePlayer } from '@/lib/hooks/usePlayer.svelte';
  import type { Track } from '@/lib/stores/library.store.svelte';

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
  let playHoverTimeline: gsap.core.Timeline | null = null;
  let shuffleHoverTimeline: gsap.core.Timeline | null = null;

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

      // Entrada de botones con stagger
      if (playButtonRef && shuffleButtonRef) {
        gsap.from([playButtonRef, shuffleButtonRef], {
          opacity: 0,
          scale: 0.8,
          y: 10,
          duration: 0.5,
          ease: "back.out(1.5)",
          delay: 0.2,
          stagger: 0.1
        });
      }
    });

    return () => {
      ctx?.revert();
      playHoverTimeline?.kill();
      shuffleHoverTimeline?.kill();
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

  // Event handlers con animaciones tipo MusicCard3D
  function handlePlayEnter() {
    if (!playButtonRef) return;
    playIsHovering = true;
    
    playHoverTimeline?.kill();
    playHoverTimeline = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.out", overwrite: true }
    });
    
    playHoverTimeline.to(playButtonRef, { scale: 1.1, ease: "back.out(1.7)" }, 0);
  }

  function handlePlayLeave() {
    if (!playButtonRef) return;
    playIsHovering = false;
    
    playHoverTimeline?.kill();
    playHoverTimeline = gsap.timeline({
      defaults: { duration: 0.5, ease: "power3.out", overwrite: true }
    });
    
    playHoverTimeline.to(playButtonRef, { scale: 1 }, 0);
  }

  function handleShuffleEnter() {
    if (!shuffleButtonRef) return;
    shuffleIsHovering = true;
    
    shuffleHoverTimeline?.kill();
    shuffleHoverTimeline = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.out", overwrite: true }
    });
    
    shuffleHoverTimeline.to(shuffleButtonRef, { scale: 1.1, ease: "back.out(1.7)" }, 0);
  }

  function handleShuffleLeave() {
    if (!shuffleButtonRef) return;
    shuffleIsHovering = false;
    
    shuffleHoverTimeline?.kill();
    shuffleHoverTimeline = gsap.timeline({
      defaults: { duration: 0.5, ease: "power3.out", overwrite: true }
    });
    
    shuffleHoverTimeline.to(shuffleButtonRef, { scale: 1 }, 0);
  }

  function handlePlayClick() {
    if (count === 0 || tracks.length === 0) return;
    
    // Si ya hay una canción reproduciendo en esta biblioteca, toggle play/pause
    if (player.current && tracks.includes(player.current)) {
      player.togglePlay();
    } else {
      // Si no, reproducir la primera canción de la biblioteca
      const firstTrack = tracks[0];
      if (firstTrack) {
        player.play(firstTrack);
      }
    }
  }

  function handleShuffleClick() {
    if (count === 0 || tracks.length === 0) return;
    
    player.toggleShuffle();
    
    // Si shuffle se acaba de activar y no hay nada tocando, reproducir desde el inicio
    if (player.isShuffle && !player.isPlaying && tracks.length > 0) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      player.play(tracks[randomIndex]);
    }
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
      <h2 bind:this={titleRef} class="tracks-title">{title}</h2>
      <div class="title-accent"></div>
    </div>
  </div>
  
  <div class="header-right">
    <div class="header-controls">
      <!-- Botón Play -->
      <div
        bind:this={playButtonRef}
        class="glass-button play-button"
        class:playing={player.isPlaying}
        onmouseenter={handlePlayEnter}
        onmouseleave={handlePlayLeave}
        onclick={handlePlayClick}
        onkeydown={handlePlayKeydown}
        role="button"
        tabindex="0"
        title="Reproducir biblioteca"
      >
        <div class="button-bg-blur"></div>
        <div class="button-overlay"></div>
        <Play size={20} class="button-icon" />
      </div>

      <!-- Botón Shuffle -->
      <div
        bind:this={shuffleButtonRef}
        class="glass-button shuffle-button"
        class:active={player.isShuffle}
        onmouseenter={handleShuffleEnter}
        onmouseleave={handleShuffleLeave}
        onclick={handleShuffleClick}
        onkeydown={handleShuffleKeydown}
        role="button"
        tabindex="0"
        title="Modo aleatorio"
      >
        <div class="button-bg-blur"></div>
        <div class="button-overlay"></div>
        <Shuffle size={20} class="button-icon" />
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

  .tracks-title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(56, 189, 248, 0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
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

  /* Glass Button Base */
  .glass-button {
    position: relative;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    user-select: none;
    
    /* Perspectiva para efecto 3D */
    perspective: 1000px;
    transform-style: preserve-3d;
    
    /* Transiciones suaves */
    transition: opacity 0.3s ease;
    will-change: transform;
    
    /* Accesibilidad */
    outline: none;
  }

  .glass-button:focus-visible {
    outline: 2px solid rgba(56, 189, 248, 0.5);
    outline-offset: 2px;
  }

  /* Fondo con blur (como disco de vidrio) */
  .button-bg-blur {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(56, 189, 248, 0.15);
    filter: blur(2px);
    z-index: 0;
  }

  /* Overlay con gradiente */
  .button-overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.04) 100%);
    border: 1.5px solid rgba(56, 189, 248, 0.3);
    box-shadow: 
      0 8px 24px rgba(56, 189, 248, 0.15),
      inset 0 1px 2px rgba(255, 255, 255, 0.2);
    z-index: 1;
    transition: all 0.3s ease;
  }

  /* Ícono */
  :global(.button-icon) {
    position: relative;
    z-index: 2;
    color: rgba(56, 189, 248, 1);
    transition: color 0.3s ease;
    will-change: transform;
    backface-visibility: hidden;
    stroke-width: 2;
  }

  /* Estados Play Button */
  .play-button:hover .button-bg-blur {
    background: rgba(56, 189, 248, 0.25);
  }

  .play-button:hover .button-overlay {
    border-color: rgba(56, 189, 248, 0.5);
    background: linear-gradient(180deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.08) 100%);
    box-shadow: 
      0 12px 32px rgba(56, 189, 248, 0.25),
      inset 0 1px 2px rgba(255, 255, 255, 0.25);
  }

  .play-button:hover :global(.button-icon) {
    color: rgba(56, 189, 248, 1);
  }

  .play-button.playing .button-bg-blur {
    background: rgba(34, 197, 94, 0.2);
  }

  .play-button.playing .button-overlay {
    border-color: rgba(34, 197, 94, 0.5);
    background: linear-gradient(180deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%);
  }

  .play-button.playing :global(.button-icon) {
    color: rgba(34, 197, 94, 1);
  }

  /* Estados Shuffle Button */
  .shuffle-button:hover .button-bg-blur {
    background: rgba(168, 85, 247, 0.25);
  }

  .shuffle-button:hover .button-overlay {
    border-color: rgba(168, 85, 247, 0.5);
    background: linear-gradient(180deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.08) 100%);
    box-shadow: 
      0 12px 32px rgba(168, 85, 247, 0.25),
      inset 0 1px 2px rgba(255, 255, 255, 0.25);
  }

  .shuffle-button:hover :global(.button-icon) {
    color: rgba(168, 85, 247, 1);
  }

  .shuffle-button.active .button-bg-blur {
    background: rgba(168, 85, 247, 0.25);
  }

  .shuffle-button.active .button-overlay {
    border-color: rgba(168, 85, 247, 0.6);
    background: linear-gradient(180deg, rgba(168, 85, 247, 0.22) 0%, rgba(168, 85, 247, 0.08) 100%);
  }

  .shuffle-button.active :global(.button-icon) {
    color: rgba(168, 85, 247, 1);
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

    .tracks-title {
      font-size: 1.25rem;
    }

    .tracks-count {
      width: auto;
    }
  }
</style>
