<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { musicDataStore } from "$lib/stores/musicData.store.svelte";

  interface Props {
    track: Track;
    size?: number; // diámetro en px (opcional, default 160)
  }

  // Svelte 5 runes: props
  let { track, size = 160 }: Props = $props();

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
  let glowRef: HTMLDivElement;

  // Estados locales
  let isHovering = $state(false);
  let isInitialized = $state(false);
  
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

  // ✅ GSAP Context - Un único contexto para todas las animaciones
  let ctx: gsap.Context | null = null;
  
  // ✅ Timeline references para animaciones coordinadas
  let idleTimeline: gsap.core.Timeline | null = null;
  let hoverTimeline: gsap.core.Timeline | null = null;
  let textRotationTimeline: gsap.core.Timeline | null = null;
  let textFloatTimeline: gsap.core.Timeline | null = null;

  // ✅ quickTo para mousemove (más performante)
  let quickToCircleRotX: gsap.QuickToFunc | null = null;
  let quickToCircleRotY: gsap.QuickToFunc | null = null;
  let quickToBgX: gsap.QuickToFunc | null = null;
  let quickToBgY: gsap.QuickToFunc | null = null;
  let quickToGlowX: gsap.QuickToFunc | null = null;
  let quickToGlowY: gsap.QuickToFunc | null = null;

  // ✅ Función centralizada para limpiar todas las animaciones
  function killAllAnimations() {
    // Matar timelines
    idleTimeline?.kill();
    hoverTimeline?.kill();
    textRotationTimeline?.kill();
    textFloatTimeline?.kill();
    
    idleTimeline = null;
    hoverTimeline = null;
    textRotationTimeline = null;
    textFloatTimeline = null;
    
    // Resetear quickTo
    quickToCircleRotX = null;
    quickToCircleRotY = null;
    quickToBgX = null;
    quickToBgY = null;
    quickToGlowX = null;
    quickToGlowY = null;
  }

  // Animación de float vertical para los textos (solo en hover)
  function startTextFloat() {
    if (!titleSvgRef || !artistSvgRef || !ctx) return;
    
    // Matar float anterior si existe
    textFloatTimeline?.kill();
    
    textFloatTimeline = gsap.timeline({ 
      repeat: -1, 
      yoyo: true,
      defaults: { ease: "sine.inOut" }
    });
    
    textFloatTimeline.to(titleSvgRef, { y: -4, duration: 1.8 }, 0);
    textFloatTimeline.to(artistSvgRef, { y: 4, duration: 2 }, 0);
  }

  // Detener float y resetear posición
  function stopTextFloat() {
    if (textFloatTimeline) {
      textFloatTimeline.kill();
      textFloatTimeline = null;
      
      if (titleSvgRef && artistSvgRef) {
        gsap.to([titleSvgRef, artistSvgRef], {
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          overwrite: true
        });
      }
    }
  }

  // Iniciar animación de rotación de texto (solo en hover)
  function startTextRotation() {
    if (!titleSvgRef || !artistSvgRef || !ctx) return;
    
    // Matar rotación anterior si existe
    textRotationTimeline?.kill();
    
    textRotationTimeline = gsap.timeline({
      defaults: { ease: "none", repeat: -1, transformOrigin: "center center" }
    });
    
    textRotationTimeline.to(titleSvgRef, { rotation: 360, duration: 20 }, 0);
    textRotationTimeline.to(artistSvgRef, { rotation: -360, duration: 25 }, 0);
  }

  // Detener animación de rotación de texto
  function stopTextRotation() {
    if (textRotationTimeline) {
      textRotationTimeline.kill();
      textRotationTimeline = null;
      
      if (titleSvgRef && artistSvgRef) {
        gsap.to([titleSvgRef, artistSvgRef], {
          rotation: 0,
          duration: 0.6,
          ease: "power2.out",
          overwrite: true
        });
      }
    }
  }

  // ✅ Inicializar quickTo - DEBE llamarse después de gsap.set
  function initQuickTo() {
    if (!circleRef || !bgImageRef || !isInitialized) return;
    if (quickToCircleRotX) return; // Ya inicializado
    
    const quickConfig = { duration: 0.4, ease: "power2.out" };
    
    quickToCircleRotX = gsap.quickTo(circleRef, "rotationX", quickConfig);
    quickToCircleRotY = gsap.quickTo(circleRef, "rotationY", quickConfig);
    
    quickToBgX = gsap.quickTo(bgImageRef, "x", { duration: 0.5, ease: "power2.out" });
    quickToBgY = gsap.quickTo(bgImageRef, "y", { duration: 0.5, ease: "power2.out" });
    
    if (glowRef) {
      quickToGlowX = gsap.quickTo(glowRef, "x", { duration: 0.3, ease: "power2.out" });
      quickToGlowY = gsap.quickTo(glowRef, "y", { duration: 0.3, ease: "power2.out" });
    }
  }

  // Mouse move tilt (3D effect)
  function handleMouseMove(e: MouseEvent) {
    if (!isHovering || !wrapperRef || !quickToCircleRotX) return;
    
    const rect = wrapperRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotateY = ((x - cx) / cx) * 15;
    const rotateX = ((y - cy) / cy) * -15;
    
    const parallaxX = (x - cx) * 0.08;
    const parallaxY = (y - cy) * 0.08;

    quickToCircleRotX(rotateX);
    quickToCircleRotY?.(rotateY);
    
    if (albumRef) {
      gsap.to(albumRef, {
        x: parallaxX * 1.5,
        y: parallaxY * 1.5,
        duration: 0.4,
        ease: "power2.out",
        overwrite: true
      });
    }
    
    quickToBgX?.(parallaxX * 0.5);
    quickToBgY?.(parallaxY * 0.5);
    
    quickToGlowX?.(parallaxX * 2);
    quickToGlowY?.(parallaxY * 2);
  }

  function handleMouseEnter() {
    if (!ctx || !isInitialized) return;
    isHovering = true;
    
    // Pausar idle animation
    idleTimeline?.pause();
    
    // Matar hover timeline anterior si existe
    hoverTimeline?.kill();
    
    // Crear timeline coordinada para hover
    hoverTimeline = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.out", overwrite: true }
    });
    
    if (circleRef) {
      hoverTimeline.to(circleRef, { scale: 1.05, ease: "back.out(1.7)" }, 0);
    }
    
    if (albumRef) {
      hoverTimeline.to(albumRef, { scale: 1.12, duration: 0.5, ease: "elastic.out(1, 0.5)" }, 0);
    }
    
    if (bgImageRef) {
      hoverTimeline.to(bgImageRef, {
        filter: "blur(6px) saturate(1.4)",
        scale: 1.15,
        duration: 0.5
      }, 0);
    }
    
    if (bgOverlayRef) {
      hoverTimeline.to(bgOverlayRef, { opacity: 0.85 }, 0);
    }
    
    if (glowRef) {
      hoverTimeline.to(glowRef, { opacity: 1, scale: 1.1 }, 0);
    }
    
    if (titleTextRef) {
      hoverTimeline.to(titleTextRef, {
        attr: { fill: "rgba(251, 191, 36, 1)" },
        duration: 0.3
      }, 0.1);
    }
    
    if (artistTextRef) {
      hoverTimeline.to(artistTextRef, {
        attr: { fill: "rgba(56, 189, 248, 1)" },
        duration: 0.3
      }, 0.1);
    }
    
    if (titleSvgRef) {
      hoverTimeline.to(titleSvgRef, {
        scale: 1.08,
        ease: "back.out(1.5)",
        transformOrigin: "center center"
      }, 0);
    }
    
    if (artistSvgRef) {
      hoverTimeline.to(artistSvgRef, {
        scale: 1.1,
        duration: 0.45,
        ease: "back.out(1.5)",
        transformOrigin: "center center"
      }, 0.05);
    }
    
    startTextRotation();
    startTextFloat();
  }

  function handleMouseLeave() {
    if (!ctx || !isInitialized) return;
    isHovering = false;
    
    stopTextRotation();
    stopTextFloat();
    
    hoverTimeline?.kill();
    hoverTimeline = null;
    
    // Timeline de reset coordinada
    const resetTimeline = gsap.timeline({
      defaults: { duration: 0.5, ease: "power3.out", overwrite: true },
      onComplete: () => {
        // Reanudar idle animation después del reset
        idleTimeline?.resume();
      }
    });
    
    if (circleRef) {
      resetTimeline.to(circleRef, { rotationX: 0, rotationY: 0, scale: 1 }, 0);
    }
    
    if (albumRef) {
      resetTimeline.to(albumRef, { x: 0, y: 0, scale: 1, rotationX: 0, rotationY: 0 }, 0);
    }
    
    if (bgImageRef) {
      resetTimeline.to(bgImageRef, {
        x: 0, y: 0,
        filter: "blur(4px) saturate(1.2)",
        scale: 1.1,
        ease: "power2.out"
      }, 0);
    }
    
    if (bgOverlayRef) {
      resetTimeline.to(bgOverlayRef, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
    }
    
    if (glowRef) {
      resetTimeline.to(glowRef, { opacity: 0, scale: 1, x: 0, y: 0, duration: 0.4, ease: "power2.out" }, 0);
    }
    
    if (titleTextRef) {
      resetTimeline.to(titleTextRef, {
        attr: { fill: "rgba(56, 189, 248, 1)" },
        duration: 0.3, ease: "power2.out"
      }, 0);
    }
    
    if (artistTextRef) {
      resetTimeline.to(artistTextRef, {
        attr: { fill: "rgba(226, 232, 240, 0.9)" },
        duration: 0.3, ease: "power2.out"
      }, 0);
    }
    
    if (titleSvgRef && artistSvgRef) {
      resetTimeline.to([titleSvgRef, artistSvgRef], {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
        transformOrigin: "center center"
      }, 0);
    }
  }

  // ✅ will-change dinámico para mejor performance
  $effect(() => {
    if (!circleRef || !isInitialized) return;
    
    circleRef.style.willChange = isHovering ? 'transform, box-shadow' : 'auto';
  });

  onMount(() => {
    // ✅ Crear contexto GSAP único para todo el componente
    ctx = gsap.context(() => {
      // Inicializar TODAS las propiedades antes de crear quickTo
      
      if (circleRef) {
        gsap.set(circleRef, { 
          transformPerspective: 1200, 
          rotationX: 0, 
          rotationY: 0,
          scale: 1
        });
      }
      
      if (albumRef) {
        gsap.set(albumRef, { 
          transformStyle: "preserve-3d", 
          x: 0, 
          y: 0,
          scale: 1,
          rotationX: 0,
          rotationY: 0
        });
      }
      
      if (bgImageRef) {
        gsap.set(bgImageRef, { 
          x: 0, 
          y: 0,
          scale: 1.1,
          filter: "blur(4px) saturate(1.2)"
        });
      }
      
      if (bgOverlayRef) {
        gsap.set(bgOverlayRef, { opacity: 1 });
      }
      
      if (glowRef) {
        gsap.set(glowRef, { 
          opacity: 0, 
          x: 0, 
          y: 0,
          scale: 1
        });
      }
      
      if (titleSvgRef && artistSvgRef) {
        gsap.set([titleSvgRef, artistSvgRef], { 
          rotation: 0, 
          y: 0, 
          scale: 1,
          transformOrigin: "center center" 
        });
      }
      
      // Marcar como inicializado
      isInitialized = true;
      
      // Inicializar quickTo DESPUÉS de gsap.set
      initQuickTo();
      
      // Idle float animation para album bubble
      if (albumRef) {
        idleTimeline = gsap.timeline({ 
          repeat: -1, 
          yoyo: true,
          defaults: { ease: "sine.inOut" }
        });
        idleTimeline.to(albumRef, { y: -4, duration: 2.5 });
      }
    }, wrapperRef);

    // Listeners para interacción
    wrapperRef?.addEventListener("mousemove", handleMouseMove);
    wrapperRef?.addEventListener("mouseenter", handleMouseEnter);
    wrapperRef?.addEventListener("mouseleave", handleMouseLeave);

    // ✅ Cleanup completo
    return () => {
      wrapperRef?.removeEventListener("mousemove", handleMouseMove);
      wrapperRef?.removeEventListener("mouseenter", handleMouseEnter);
      wrapperRef?.removeEventListener("mouseleave", handleMouseLeave);
      
      killAllAnimations();
      ctx?.revert();
      ctx = null;
      isInitialized = false;
    };
  });
</script>

<!-- Root wrapper: usado para perspectiva y accesibilidad -->
<div
  bind:this={wrapperRef}
  class="player-circle-wrapper"
  aria-label={`${title} by ${artist}`}
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
    user-select: none;
    width: 100%;
    max-width: 120px;
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

  /* Responsive adjustments */
  @media (max-width: 900px) {
    .title-text { font-size: 10px; }
    .artist-text { font-size: 7px; }
  }

  @media (max-width: 600px) {
    .title-text { font-size: 9px; }
    .artist-text { font-size: 6px; }
    .glow-effect { inset: -15%; }
  }

  @media (max-width: 400px) {
    .title-text { font-size: 8px; }
    .artist-text { font-size: 5px; }
  }
</style>
