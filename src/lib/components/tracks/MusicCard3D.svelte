<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { musicDataStore } from "$lib/stores/musicData.store.svelte";
  import { usePlayer } from "$lib/hooks/usePlayer.svelte";

  interface Props {
    track: Track;
    onPlay?: (track: Track) => void;
    addToQueue?: boolean;
    size?: number; // diámetro en px (opcional, default 160)
  }

  // Svelte 5 runes: props
  let { track, onPlay, addToQueue = true, size = 160 }: Props = $props();

  // Hook de reproducción (obligatorio)
  const player = usePlayer();

  // Refs DOM
  let wrapperRef: HTMLDivElement;
  let circleRef: HTMLDivElement;
  let albumRef: HTMLDivElement;
  let bgImageRef: HTMLImageElement;
  let bgOverlayRef: HTMLDivElement;
  let titleSvgRef: SVGSVGElement;
  let artistSvgRef: SVGSVGElement;
  let titleTextRef: SVGTextElement;
  let artistTextRef: SVGTextElement;
  let playRingRef: HTMLDivElement;
  let glowRef: HTMLDivElement;

  // Estados locales
  let isHovering = $state(false);
  
  // ID único para el path SVG (evita conflictos entre múltiples instancias)
  const uniqueId = $state(Math.random().toString(36).substring(2, 9));
  const pathId = $derived(`textPath-${uniqueId}`);

  // ✅ Album art loader reactivo con $effect (en lugar de createAlbumArtLoader)
  let albumArtUrl = $state<string | null>(null);
  let isAlbumArtLoading = $state(false);

  $effect(() => {
    const currentTrack = track;
    if (!currentTrack) {
      albumArtUrl = null;
      return;
    }

    // Si ya tiene albumArt, usarlo
    if (currentTrack.albumArt) {
      albumArtUrl = currentTrack.albumArt;
      return;
    }

    const artist = currentTrack.artist ?? null;
    const title = currentTrack.title ?? null;
    const album = currentTrack.album ?? null;

    if (!artist || !title) {
      return;
    }

    isAlbumArtLoading = true;
    const trackPath = currentTrack.path;

    // Cargar de forma asíncrona
    loadAlbumArtAsync(artist, title, album, trackPath);
  });

  async function loadAlbumArtAsync(
    artist: string, 
    title: string, 
    album: string | null,
    originalTrackPath: string
  ) {
    try {
      const checkSameTrack = () => track?.path === originalTrackPath;

      const trackData = await musicDataStore.getTrack(artist, title);
      if (!checkSameTrack()) return;
      
      if (trackData?.image) {
        albumArtUrl = trackData.image;
        isAlbumArtLoading = false;
        return;
      }

      if (album) {
        const albumData = await musicDataStore.getAlbum(artist, album);
        if (!checkSameTrack()) return;
        
        if (albumData?.image) {
          albumArtUrl = albumData.image;
          isAlbumArtLoading = false;
          return;
        }
      }

      const artistData = await musicDataStore.getArtist(artist);
      if (!checkSameTrack()) return;
      
      if (artistData?.image) {
        albumArtUrl = artistData.image;
      }
      
      isAlbumArtLoading = false;
    } catch {
      if (track?.path === originalTrackPath) {
        isAlbumArtLoading = false;
      }
    }
  }

  const defaultAlbumArt =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23334155'/%3E%3Cpath fill='%2394a3b8' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

  const albumArt = $derived(track.albumArt || albumArtUrl || defaultAlbumArt);
  const title = $derived(track.title || "Unknown Title");
  const artist = $derived(track.artist || "Unknown Artist");
  const album = $derived(track.album || "Unknown Album");

  // Estados derivados desde usePlayer (no leer stores directos)
  const isCurrentTrack = $derived(player.current?.path === track.path);
  const isPlaying = $derived(isCurrentTrack && player.isPlaying);

  // ---- GSAP Animations ----
  // Timeline references for coordinated animations
  let masterTimeline = $state<gsap.core.Timeline | null>(null);
  let hoverTimeline = $state<gsap.core.Timeline | null>(null);
  let textRotationTimeline = $state<gsap.core.Timeline | null>(null);
  let textFloatTimeline = $state<gsap.core.Timeline | null>(null);
  let idleTimeline = $state<gsap.core.Timeline | null>(null);
  let playingTimeline = $state<gsap.core.Timeline | null>(null);

  // ✅ OPTIMIZACIÓN: quickTo para animaciones de mousemove (más performante)
  let quickToCircleRotX: gsap.QuickToFunc | null = null;
  let quickToCircleRotY: gsap.QuickToFunc | null = null;
  let quickToAlbumX: gsap.QuickToFunc | null = null;
  let quickToAlbumY: gsap.QuickToFunc | null = null;
  let quickToBgX: gsap.QuickToFunc | null = null;
  let quickToBgY: gsap.QuickToFunc | null = null;
  let quickToGlowX: gsap.QuickToFunc | null = null;
  let quickToGlowY: gsap.QuickToFunc | null = null;

  // ✅ NUEVO: Limpiar animaciones cuando cambia el track prop
  $effect(() => {
    // Dependencia: track.path
    const trackPath = track.path;
    
    // Cleanup cuando cambia el track
    return () => {
      killAll();
    };
  });

  // Función para limpiar todas las animaciones
  const killAll = () => {
    masterTimeline?.kill();
    hoverTimeline?.kill();
    textRotationTimeline?.kill();
    textFloatTimeline?.kill();
    idleTimeline?.kill();
    playingTimeline?.kill();
    if (circleRef) gsap.killTweensOf(circleRef);
    if (albumRef) gsap.killTweensOf(albumRef);
    if (titleSvgRef) gsap.killTweensOf(titleSvgRef);
    if (artistSvgRef) gsap.killTweensOf(artistSvgRef);
    if (bgImageRef) gsap.killTweensOf(bgImageRef);
    if (bgOverlayRef) gsap.killTweensOf(bgOverlayRef);
    if (glowRef) gsap.killTweensOf(glowRef);
    // Resetear quickTo functions
    quickToCircleRotX = null;
    quickToCircleRotY = null;
    quickToAlbumX = null;
    quickToAlbumY = null;
    quickToBgX = null;
    quickToBgY = null;
    quickToGlowX = null;
    quickToGlowY = null;
  };

  // Animación de float vertical para los textos (solo en hover)
  const startTextFloat = () => {
    if (!titleSvgRef || !artistSvgRef) return;
    
    textFloatTimeline = gsap.timeline({ 
      repeat: -1, 
      yoyo: true,
      defaults: { ease: "sine.inOut" }
    });
    
    // El título flota hacia arriba
    textFloatTimeline.to(titleSvgRef, { y: -4, duration: 1.8 }, 0);
    
    // El artista flota hacia abajo (movimiento opuesto)
    textFloatTimeline.to(artistSvgRef, { y: 4, duration: 2 }, 0);
  };

  // Detener float y resetear posición
  const stopTextFloat = () => {
    if (textFloatTimeline) {
      textFloatTimeline.kill();
      textFloatTimeline = null;
      
      // Reset suave a posición original con overwrite para evitar conflictos
      gsap.to([titleSvgRef, artistSvgRef], {
        y: 0,
        duration: 0.4,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
  };

  // Iniciar animación de rotación de texto (solo en hover)
  const startTextRotation = () => {
    if (!titleSvgRef || !artistSvgRef) return;
    
    textRotationTimeline = gsap.timeline({
      defaults: { ease: "none", repeat: -1, transformOrigin: "center center" }
    });
    
    // Título rota en sentido horario
    textRotationTimeline.to(titleSvgRef, { rotation: 360, duration: 20 }, 0);
    
    // Artista rota en sentido antihorario
    textRotationTimeline.to(artistSvgRef, { rotation: -360, duration: 25 }, 0);
  };

  // Detener animación de rotación de texto
  const stopTextRotation = () => {
    if (textRotationTimeline) {
      textRotationTimeline.kill();
      textRotationTimeline = null;
      
      // Animate back to 0 smoothly con overwrite para evitar conflictos
      gsap.to([titleSvgRef, artistSvgRef], {
        rotation: 0,
        duration: 0.6,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
  };

  // ✅ OPTIMIZACIÓN: Inicializar quickTo setters (más performante que gsap.to repetitivo)
  const initQuickTo = () => {
    if (!circleRef || !albumRef || !bgImageRef) return;
    
    const quickConfig = { duration: 0.4, ease: "power2.out" };
    
    // Circle rotation
    quickToCircleRotX = gsap.quickTo(circleRef, "rotationX", quickConfig);
    quickToCircleRotY = gsap.quickTo(circleRef, "rotationY", quickConfig);
    
    // Album parallax
    quickToAlbumX = gsap.quickTo(albumRef, "x", quickConfig);
    quickToAlbumY = gsap.quickTo(albumRef, "y", quickConfig);
    
    // Background parallax
    quickToBgX = gsap.quickTo(bgImageRef, "x", { duration: 0.5, ease: "power2.out" });
    quickToBgY = gsap.quickTo(bgImageRef, "y", { duration: 0.5, ease: "power2.out" });
    
    // Glow parallax
    if (glowRef) {
      quickToGlowX = gsap.quickTo(glowRef, "x", { duration: 0.3, ease: "power2.out" });
      quickToGlowY = gsap.quickTo(glowRef, "y", { duration: 0.3, ease: "power2.out" });
    }
  };

  // Mouse move tilt (3D effect) - Usando quickTo para máxima performance
  const handleMouseMove = (e: MouseEvent) => {
    if (!isHovering || !wrapperRef) return;
    
    const rect = wrapperRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotateY = ((x - cx) / cx) * 15;
    const rotateX = ((y - cy) / cy) * -15;
    
    const parallaxX = (x - cx) * 0.08;
    const parallaxY = (y - cy) * 0.08;

    // Usar quickTo para animaciones ultra-performantes
    quickToCircleRotX?.(rotateX);
    quickToCircleRotY?.(rotateY);
    
    quickToAlbumX?.(parallaxX * 1.5);
    quickToAlbumY?.(parallaxY * 1.5);
    
    quickToBgX?.(parallaxX * 0.5);
    quickToBgY?.(parallaxY * 0.5);
    
    quickToGlowX?.(parallaxX * 2);
    quickToGlowY?.(parallaxY * 2);
  };

  const handleMouseEnter = () => {
    isHovering = true;
    
    // Inicializar quickTo si no existen
    if (!quickToCircleRotX) initQuickTo();
    
    // Crear timeline coordinada para hover con defaults
    hoverTimeline = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.out", overwrite: "auto" }
    });
    
    // 1. Scale up del círculo con glow
    hoverTimeline.to(circleRef, { scale: 1.05, ease: "back.out(1.7)" }, 0);
    
    // 2. Album bubble pop effect
    hoverTimeline.to(albumRef, { scale: 1.12, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 0);
    
    // 3. Background blur y saturación aumentan
    hoverTimeline.to(bgImageRef, {
      filter: "blur(6px) saturate(1.4)",
      scale: 1.15,
      duration: 0.5
    }, 0);
    
    // 4. Overlay más oscuro para contraste
    hoverTimeline.to(bgOverlayRef, { opacity: 0.85 }, 0);
    
    // 5. Glow exterior aparece
    if (glowRef) {
      hoverTimeline.to(glowRef, { opacity: 1, scale: 1.1 }, 0);
    }
    
    // 6. Cambio de color en textos (GSAP para SVG)
    hoverTimeline.to(titleTextRef, {
      attr: { fill: "rgba(251, 191, 36, 1)" },
      duration: 0.3
    }, 0.1);
    
    hoverTimeline.to(artistTextRef, {
      attr: { fill: "rgba(56, 189, 248, 1)" },
      duration: 0.3
    }, 0.1);
    
    // 7. Scale up de los SVGs de texto
    hoverTimeline.to(titleSvgRef, {
      scale: 1.08,
      ease: "back.out(1.5)",
      transformOrigin: "center center"
    }, 0);
    
    hoverTimeline.to(artistSvgRef, {
      scale: 1.1,
      duration: 0.45,
      ease: "back.out(1.5)",
      transformOrigin: "center center"
    }, 0.05);
    
    // 8. Iniciar rotación y float de texto (ambos solo en hover)
    startTextRotation();
    startTextFloat();
  };

  const handleMouseLeave = () => {
    isHovering = false;
    
    // Detener rotación y float de texto
    stopTextRotation();
    stopTextFloat();
    
    // Kill hover timeline
    hoverTimeline?.kill();
    hoverTimeline = null;
    
    // Timeline de reset coordinada con defaults
    const resetTimeline = gsap.timeline({
      defaults: { duration: 0.5, ease: "power3.out", overwrite: "auto" }
    });
    
    // Reset del círculo
    resetTimeline.to(circleRef, { rotationX: 0, rotationY: 0, scale: 1 }, 0);
    
    // Reset album bubble
    resetTimeline.to(albumRef, { x: 0, y: 0, scale: 1, rotationX: 0, rotationY: 0 }, 0);
    
    // Reset background
    resetTimeline.to(bgImageRef, {
      x: 0, y: 0,
      filter: "blur(4px) saturate(1.2)",
      scale: 1.1,
      ease: "power2.out"
    }, 0);
    
    // Reset overlay
    resetTimeline.to(bgOverlayRef, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
    
    // Fade out glow
    if (glowRef) {
      resetTimeline.to(glowRef, { opacity: 0, scale: 1, x: 0, y: 0, duration: 0.4, ease: "power2.out" }, 0);
    }
    
    // Reset colores de texto
    resetTimeline.to(titleTextRef, {
      attr: { fill: "rgba(56, 189, 248, 1)" },
      duration: 0.3, ease: "power2.out"
    }, 0);
    
    resetTimeline.to(artistTextRef, {
      attr: { fill: "rgba(226, 232, 240, 0.9)" },
      duration: 0.3, ease: "power2.out"
    }, 0);
    
    // Reset scale de los SVGs de texto
    resetTimeline.to([titleSvgRef, artistSvgRef], {
      scale: 1,
      duration: 0.4,
      ease: "power2.out",
      transformOrigin: "center center"
    }, 0);
  };

  // Click con animación de feedback
  const handleClick = async () => {
    const targetScale = isHovering ? 1.05 : 1;
    const targetAlbumScale = isHovering ? 1.12 : 1;
    
    // Click feedback animation con overwrite para evitar conflictos
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(circleRef, { scale: 0.95, duration: 0.1, ease: "power2.in" })
      .to(circleRef, { scale: targetScale, duration: 0.3, ease: "elastic.out(1, 0.5)" });
    
    // Pulse en album
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(albumRef, { scale: 0.9, duration: 0.1, ease: "power2.in" })
      .to(albumRef, { scale: targetAlbumScale, duration: 0.4, ease: "elastic.out(1, 0.5)" });
    
    try {
      if (onPlay) {
        onPlay(track);
        return;
      }
      await player.play(track, addToQueue);
    } catch (err) {
      console.error("Error playing track", err);
    }
  };

  // Efecto para animación de playing
  $effect(() => {
    if (!playRingRef) return;
    
    if (isPlaying) {
      // Iniciar animación de pulse cuando está reproduciendo (con yoyo para eficiencia)
      playingTimeline = gsap.timeline({ 
        repeat: -1, 
        yoyo: true,
        defaults: { duration: 0.9, ease: "sine.inOut" }
      });
      
      playingTimeline.fromTo(playRingRef, 
        { scale: 0.95, opacity: 0.9 },
        { scale: 1.15, opacity: 0.2 }
      );
      
      // Glow sutil constante cuando está playing
      gsap.to(circleRef, {
        boxShadow: "0 0 30px rgba(56, 189, 248, 0.4), 0 8px 24px rgba(0,0,0,0.22)",
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto"
      });
    } else {
      playingTimeline?.kill();
      playingTimeline = null;
      gsap.to(circleRef, {
        boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
  });

  // ✅ NUEVO: Optimizar will-change dinámicamente para mejor performance
  $effect(() => {
    if (!circleRef) return;
    
    if (isHovering || isPlaying) {
      circleRef.style.willChange = 'transform, box-shadow';
    } else {
      circleRef.style.willChange = 'auto';
    }
  });

  onMount(() => {
    // Inicializar player si no
    if (!player.isInitialized) player.initialize();

    // Set initial states con transformPerspective para 3D
    gsap.set(circleRef, { transformPerspective: 1200 });
    gsap.set([titleSvgRef, artistSvgRef], { rotation: 0, y: 0, transformOrigin: "center center" });
    gsap.set(bgOverlayRef, { opacity: 1 });
    if (glowRef) gsap.set(glowRef, { opacity: 0, x: 0, y: 0 });
    
    // Idle float animation para album bubble (sutil)
    if (albumRef) {
      gsap.set(albumRef, { transformStyle: "preserve-3d" });
      idleTimeline = gsap.timeline({ 
        repeat: -1, 
        yoyo: true,
        defaults: { ease: "sine.inOut" }
      });
      idleTimeline.to(albumRef, { y: -4, duration: 2.5 });
    }
    
    // Inicializar quickTo para mousemove
    initQuickTo();

    // Listeners para interacción
    wrapperRef?.addEventListener("mousemove", handleMouseMove);
    wrapperRef?.addEventListener("mouseenter", handleMouseEnter);
    wrapperRef?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      wrapperRef?.removeEventListener("mousemove", handleMouseMove);
      wrapperRef?.removeEventListener("mouseenter", handleMouseEnter);
      wrapperRef?.removeEventListener("mouseleave", handleMouseLeave);
      killAll();
    };
  });
</script>

<!-- Root wrapper: usado para perspectiva y accesibilidad -->
<div
  bind:this={wrapperRef}
  class="player-circle-wrapper"
  role="button"
  tabindex="0"
  aria-label={`Play ${title} by ${artist}`}
  onclick={handleClick}
  onkeydown={(e: KeyboardEvent) => (e.key === "Enter" || e.key === " ") && handleClick()}
>
  <!-- Glow effect (behind everything) -->
  <div bind:this={glowRef} class="glow-effect" aria-hidden="true"></div>
  
  <!-- SVG text externo: Título (FUERA del glass-circle para permitir overflow) -->
  <svg bind:this={titleSvgRef} class="svg-text svg-text-outer" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <path id={`${pathId}-title`}
            d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
    </defs>
    <text bind:this={titleTextRef} class="circum-text title-text" fill="rgba(56, 189, 248, 1)">
      <textPath href={`#${pathId}-title`} startOffset="0%">
        {title} • {title} • {title} • {title}
      </textPath>
    </text>
  </svg>
  
  <!-- SVG text interno: Artista + Álbum (FUERA del glass-circle para permitir overflow) -->
  <svg bind:this={artistSvgRef} class="svg-text svg-text-outer" viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <path id={`${pathId}-artist`}
            d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
    </defs>
    <text bind:this={artistTextRef} class="circum-text artist-text" fill="rgba(226, 232, 240, 0.9)">
      <textPath href={`#${pathId}-artist`} startOffset="0%">
        {artist} {album !== "Unknown Album" ? `• ${album}` : ""} • {artist} {album !== "Unknown Album" ? `• ${album}` : ""}
      </textPath>
    </text>
  </svg>
  
  <!-- Circular glass base -->
  <div bind:this={circleRef} class="glass-circle">
    <!-- Background image with blur (behind everything) -->
    <div class="bg-image-container">
      <img bind:this={bgImageRef} src={albumArt} alt="" class="bg-image" aria-hidden="true" />
      <div bind:this={bgOverlayRef} class="bg-overlay"></div>
    </div>

    <!-- Album bubble floating above the circle -->
    <div bind:this={albumRef} class="album-bubble">
      <img src={albumArt} alt={`${title} album art`} class="album-img" />
      <!-- small playing indicator ring (ahora siempre renderizado, GSAP controla visibilidad) -->
      <div bind:this={playRingRef} class="play-ring" class:visible={isPlaying} aria-hidden="true"></div>
    </div>

    <!-- Center subtle gloss highlight -->
    <div class="center-highlight" aria-hidden="true"></div>
  </div>
</div>

<style>
  /* Font: Quicksand expected to be loaded globally (font-family set to quicksand). */
  :global(.font-sans) {
    font-family: "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  }

  .player-circle-wrapper {
    position: relative;
    display: inline-grid;
    place-items: center;
    perspective: 1200px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    width: 100%;
    max-width: 140px;
    aspect-ratio: 1;
  }

  /* Glow effect behind the card */
  .glow-effect {
    position: absolute;
    inset: -20%;
    border-radius: 50%;
    background: radial-gradient(
      circle at center,
      rgba(56, 189, 248, 0.3) 0%,
      rgba(56, 189, 248, 0.15) 30%,
      transparent 70%
    );
    opacity: 0;
    z-index: -1;
    pointer-events: none;
    will-change: transform, opacity;
    filter: blur(20px);
  }

  /* Glass circular base */
  .glass-circle {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    transform-style: preserve-3d;
    /* will-change se aplica dinámicamente via JS para mejor performance */
    backface-visibility: hidden;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 24px rgba(0,0,0,0.22);
    display: grid;
    place-items: center;
    transition: border-color 0.3s ease;
    z-index: 1;
  }

  .glass-circle:hover {
    border-color: rgba(56, 189, 248, 0.3);
  }

  /* Background image with blur effect */
  .bg-image-container {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    overflow: hidden;
    z-index: 0;
  }

  .bg-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: blur(4px) saturate(1.2);
    transform: scale(1.1);
    will-change: transform, filter;
  }

  /* Overlay gradient for depth and text readability */
  .bg-overlay {
    position: absolute;
    inset: 0;
    background: 
      radial-gradient(circle at center, 
        rgba(15, 23, 42, 0.3) 0%, 
        rgba(15, 23, 42, 0.5) 50%,
        rgba(15, 23, 42, 0.7) 100%
      );
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.4);
    will-change: opacity;
  }

  /* SVG text that follows circumference */
  .svg-text {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 2;
    will-change: transform;
    backface-visibility: hidden;
  }

  /* SVGs externos al glass-circle - necesitan estar sobre el círculo */
  .svg-text-outer {
    z-index: 10;
  }

  .circum-text {
    font-family: "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    font-weight: 700;
    text-transform: uppercase;
    paint-order: stroke fill;
    transition: fill 0.3s ease;
  }

  /* Título externo - cyan con sombra simple */
  .title-text {
    font-size: 11px;
    letter-spacing: 0.08em;
    stroke: rgba(0, 0, 0, 0.5);
    stroke-width: 0.4px;
  }

  /* Artista interno - blanco/gris claro */
  .artist-text {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.06em;
    stroke: rgba(0, 0, 0, 0.4);
    stroke-width: 0.3px;
  }

  /* Album bubble (floating sticker) */
  .album-bubble {
    position: relative;
    z-index: 10;
    width: 54%;
    height: 54%;
    border-radius: 50%;
    display: grid;
    place-items: center;
    transform-style: preserve-3d;
    will-change: transform;
    backface-visibility: hidden;
    background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.18);
    box-shadow: 
      0 8px 20px rgba(0,0,0,0.25),
      0 2px 8px rgba(0,0,0,0.15),
      inset 0 1px 0 rgba(255,255,255,0.1);
    overflow: hidden;
    transition: border-color 0.3s ease;
  }

  .album-bubble:hover {
    border-color: rgba(56, 189, 248, 0.25);
  }

  .album-img {
    width: 92%;
    height: 92%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }

  /* Ring when playing - siempre renderizado, visibility controlada por clase */
  .play-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    box-shadow: 0 0 18px rgba(56,189,248,0.65);
    border: 1px solid rgba(56,189,248,0.25);
    pointer-events: none;
    z-index: 5;
    opacity: 0;
    transform: scale(0.9);
    will-change: transform, opacity;
  }

  .play-ring.visible {
    opacity: 0.9;
    transform: scale(0.95);
  }

  /* Center highlight (very subtle) */
  .center-highlight {
    position: absolute;
    width: 48%;
    height: 48%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0.01));
    z-index: 1;
    pointer-events: none;
    transform: translateZ(2px);
  }

  /* Accessibility focus ring */
  .player-circle-wrapper:focus-visible .glass-circle {
    box-shadow: 0 0 0 4px rgba(56,189,248,0.2), 0 0 30px rgba(56,189,248,0.15), 0 12px 28px rgba(0,0,0,0.32);
    outline: none;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .title-text { font-size: 9px; }
    .artist-text { font-size: 7px; }
    .play-ring { inset: -4px; }
    .glow-effect { inset: -15%; }
  }
</style>
