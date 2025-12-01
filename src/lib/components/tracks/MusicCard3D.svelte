<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { createAlbumArtLoader } from "$lib/hooks/useAlbumArt.svelte";
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

  // Estados locales
  let isHovering = $state(false);
  
  // ID único para el path SVG (evita conflictos entre múltiples instancias)
  const uniqueId = $state(Math.random().toString(36).substring(2, 9));
  const pathId = $derived(`textPath-${uniqueId}`);

  // Album art loader + fallback
  const albumArtState = createAlbumArtLoader(
    track.artist || null,
    track.title || null,
    track.album || null
  );

  const defaultAlbumArt =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23334155'/%3E%3Cpath fill='%2394a3b8' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

  const albumArt = $derived(track.albumArt || albumArtState.url || defaultAlbumArt);
  const title = $derived(track.title || "Unknown Title");
  const artist = $derived(track.artist || "Unknown Artist");
  const album = $derived(track.album || "Unknown Album");

  // Estados derivados desde usePlayer (no leer stores directos)
  const isCurrentTrack = $derived(player.current?.path === track.path);
  const isPlaying = $derived(isCurrentTrack && player.isPlaying);

  // ---- Animaciones / interactions ----
  // Timeline / tween references for cleanup
  let tiltTween = $state<gsap.core.Tween | null>(null);
  let floatTween = $state<gsap.core.Tween | null>(null);
  let textRotateTween = $state<gsap.core.Tween | null>(null);

  // Función para limpiar animaciones
  const killAll = () => {
    tiltTween?.kill();
    floatTween?.kill();
    textRotateTween?.kill();
    if (circleRef) gsap.killTweensOf(circleRef);
    if (albumRef) gsap.killTweensOf(albumRef);
  };

  // Mouse move tilt (suave)
  const handleMouseMove = (e: MouseEvent) => {
    if (!wrapperRef || !circleRef) return;
    const rect = wrapperRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const rotateY = ((x - cx) / cx) * 12; // +-12deg
    const rotateX = ((y - cy) / cy) * -12; // +-12deg

    // Tween instead of set for smoothing
    tiltTween = gsap.to(circleRef, {
      rotationX: rotateX,
      rotationY: rotateY,
      duration: 0.35,
      ease: "power2.out",
      transformPerspective: 1200,
    });

    // small parallax for album image
    floatTween = gsap.to(albumRef, {
      x: (x - cx) * 0.06,
      y: (y - cy) * 0.06,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const handleMouseEnter = () => {
    isHovering = true;
    // scale up slightly and increase glow
    gsap.to(circleRef, {
      scale: 1.03,
      duration: 0.28,
      ease: "power2.out",
    });
    gsap.to(albumRef, { scale: 1.08, duration: 0.28, ease: "power2.out" });
  };

  const handleMouseLeave = () => {
    isHovering = false;
    killAll();
    // reset transforms
    gsap.to(circleRef, { rotationX: 0, rotationY: 0, scale: 1, duration: 0.45, ease: "power2.out" });
    gsap.to(albumRef, { x: 0, y: 0, scale: 1, duration: 0.45, ease: "power2.out" });
  };

  // Click / play handler
  const handleClick = async () => {
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

  onMount(() => {
    // Inicializar player si no
    if (!player.isInitialized) player.initialize();

    // small idle float for album bubble
    if (albumRef) {
      gsap.set(albumRef, { transformStyle: "preserve-3d" });
      gsap.to(albumRef, {
        y: -6,
        duration: 3.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    }

    // listeners for tilt
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
  <!-- Circular glass base -->
  <div bind:this={circleRef} class="glass-circle">
    <!-- SVG text externo: Título (rotación normal) -->
    <svg class="svg-text rotating-text" class:text-hover={isHovering} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={`${pathId}-title`}
              d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" />
      </defs>
      <text class="circum-text title-text">
        <textPath href={`#${pathId}-title`} startOffset="0%">
          {title} • {title} • {title} • {title}
        </textPath>
      </text>
    </svg>
    
    <!-- SVG text interno: Artista + Álbum (rotación inversa) -->
    <svg class="svg-text rotating-text-reverse" class:text-hover={isHovering} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={`${pathId}-artist`}
              d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0" />
      </defs>
      <text class="circum-text artist-text">
        <textPath href={`#${pathId}-artist`} startOffset="0%">
          {artist} {album !== "Unknown Album" ? `• ${album}` : ""} • {artist} {album !== "Unknown Album" ? `• ${album}` : ""}
        </textPath>
      </text>
    </svg>

    <!-- Album bubble floating above the circle -->
    <div bind:this={albumRef} class="album-bubble">
      <img src={albumArt} alt={`${title} album art`} class="album-img" />
      <!-- small playing indicator ring -->
      {#if isPlaying}
        <div class="play-ring" aria-hidden="true"></div>
      {/if}
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

  /* Glass circular base */
  .glass-circle {
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: visible;
    transform-style: preserve-3d;
    /* GPU acceleration */
    will-change: transform;
    backface-visibility: hidden;
    /* glass gradient simplificado */
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.02));
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.22);
    display: grid;
    place-items: center;
  }

  /* SVG text that follows circumference */
  .svg-text {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    /* GPU acceleration */
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  /* CSS animation para rotación - optimizada con GPU */
  .rotating-text {
    animation: rotateText 25s linear infinite;
  }

  .rotating-text-reverse {
    animation: rotateTextReverse 30s linear infinite;
  }

  @keyframes rotateText {
    from { transform: rotate(0deg) translateZ(0); }
    to { transform: rotate(360deg) translateZ(0); }
  }

  @keyframes rotateTextReverse {
    from { transform: rotate(360deg) translateZ(0); }
    to { transform: rotate(0deg) translateZ(0); }
  }

  .circum-text {
    font-family: "Quicksand", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    font-weight: 700;
    text-transform: uppercase;
    paint-order: stroke fill;
  }

  /* Título externo - cyan con sombra simple */
  .title-text {
    font-size: 11px;
    fill: rgba(56, 189, 248, 1);
    letter-spacing: 0.08em;
    stroke: rgba(0, 0, 0, 0.5);
    stroke-width: 0.4px;
  }

  /* Artista interno - blanco/gris claro */
  .artist-text {
    font-size: 8px;
    font-weight: 600;
    fill: rgba(226, 232, 240, 0.9);
    letter-spacing: 0.06em;
    stroke: rgba(0, 0, 0, 0.4);
    stroke-width: 0.3px;
  }

  /* Hover: cambios simples sin filter pesados */
  .text-hover .title-text {
    fill: rgba(251, 191, 36, 1);
    stroke: rgba(0, 0, 0, 0.6);
  }

  .text-hover .artist-text {
    fill: rgba(56, 189, 248, 1);
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
    background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
    overflow: hidden;
  }

  .album-img {
    width: 92%;
    height: 92%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }

  /* subtle ring when playing */
  .play-ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    box-shadow: 0 0 18px rgba(56,189,248,0.65);
    border: 1px solid rgba(56,189,248,0.25);
    pointer-events: none;
    z-index: 5;
    animation: ringPulse 1.8s infinite ease-in-out;
  }

  @keyframes ringPulse {
    0% { transform: scale(0.95); opacity: 0.9; }
    50% { transform: scale(1.12); opacity: 0.28; }
    100% { transform: scale(0.95); opacity: 0.9; }
  }

  /* Center highlight (very subtle) */
  .center-highlight {
    position: absolute;
    width: 48%;
    height: 48%;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
    z-index: 1;
    pointer-events: none;
    transform: translateZ(2px);
  }

  /* Accessibility focus ring */
  .player-circle-wrapper:focus-visible .glass-circle {
    box-shadow: 0 0 0 4px rgba(56,189,248,0.12), 0 12px 28px rgba(0,0,0,0.32);
    outline: none;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .circum-text { font-size: 6px; }
    .play-ring { inset: -4px; }
  }
</style>
