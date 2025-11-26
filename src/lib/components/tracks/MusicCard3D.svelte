<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";

  interface Props {
    track: Track;
  }

  let { track }: Props = $props();

  let cardRef: HTMLDivElement;
  let wrapperRef: HTMLDivElement;
  let circlesRefs: HTMLDivElement[] = [];
  let glassOverlayRef: HTMLDivElement;
  let trackContentRef: HTMLDivElement;

  // Estado para controlar visibilidad del glass overlay y track content
  let isOverlayVisible = $state(true);

  // Estado para controlar la animación de los círculos
  let isCirclesAnimated = $state(false);

  // Estado para saber si estamos en hover
  let isHovering = $state(false);

  // Función para matar todas las animaciones relacionadas
  const killAllAnimations = () => {
    // Matar animaciones de la card
    gsap.killTweensOf(cardRef);

    // Matar animaciones de círculos
    circlesRefs.forEach(circle => {
      if (circle) gsap.killTweensOf(circle);
    });

    // Matar animaciones de overlay y content
    if (glassOverlayRef) gsap.killTweensOf(glassOverlayRef);
    if (trackContentRef) gsap.killTweensOf(trackContentRef);
  };

  // Funciones de animación del mouse
  const handleMouseEnter = () => {
    if (isHovering) return; // Evitar múltiples llamadas
    isHovering = true;

    // Matar animaciones previas
    killAllAnimations();

    // Card 3D rotation
    gsap.to(cardRef, {
      rotationX: 15,
      rotationY: 15,
      duration: 0.5,
      ease: "power2.out",
      transformPerspective: 1000,
    });

    // Circles depth animation with stagger
    circlesRefs.forEach((circle, index) => {
      if (circle) {
        gsap.to(circle, {
          z: 100 + index * 20,
          duration: 0.5,
          delay: index * 0.1,
          ease: "power2.out",
        });
      }
    });

    // Desvanecer overlay y track content en hover
    if (isOverlayVisible) {
      // Crear timeline para animación secuencial
      const tl = gsap.timeline({
        onComplete: () => {
          if (isHovering) { // Solo si aún estamos en hover
            isOverlayVisible = false;
            // Después del desvanecimiento, animar círculos
            if (!isCirclesAnimated) {
              isCirclesAnimated = true;
              gsap.to(
                [circlesRefs[0], circlesRefs[1], circlesRefs[2], circlesRefs[3]],
                {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.out",
                },
              );
              // Primero, cambiar de right a left para centrar
              gsap.set(circlesRefs[4], { right: "auto", left: "50%" });
              gsap.to(circlesRefs[4], {
                top: "10px",
                width: "100px",
                height: "100px",
                x: "-50%",
                duration: 0.5,
                ease: "power2.out",
              });
            }
          }
        },
      });

      // Primero desvanecer track-content
      tl.to(trackContentRef, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      })
        // Después desvanecer glass-overlay
        .to(
          glassOverlayRef,
          {
            opacity: 0,
            duration: 0.3,
            ease: "power2.out",
          },
          "-=0.1",
        ); // Pequeño overlap para transición suave
    }
  };

  const handleMouseLeave = () => {
    if (!isHovering) return; // Evitar múltiples llamadas
    isHovering = false;

    // Matar animaciones previas
    killAllAnimations();

    // Reset card rotation
    gsap.to(cardRef, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: "power2.out",
    });

    // Reset circles depth
    circlesRefs.forEach((circle, index) => {
      if (circle) {
        const baseZ = [20, 40, 60, 80, 100][index];
        gsap.to(circle, {
          z: baseZ,
          duration: 0.5,
          delay: index * 0.05,
          ease: "power2.out",
        });
      }
    });

    // Restaurar overlay y track content en mouseleave
    if (!isOverlayVisible) {
      isOverlayVisible = true;

      // Crear timeline para animación secuencial inversa
      const tl = gsap.timeline({
        onComplete: () => {
          if (!isHovering) { // Solo si aún no estamos en hover
            // Restaurar círculos
            if (isCirclesAnimated) {
              isCirclesAnimated = false;
              gsap.to(
                [circlesRefs[0], circlesRefs[1], circlesRefs[2], circlesRefs[3]],
                {
                  opacity: 1,
                  duration: 0.3,
                  ease: "power2.out",
                },
              );
              // Cambiar de left a right para restaurar
              gsap.set(circlesRefs[4], { left: "93px" });
              gsap.to(circlesRefs[4], {
                top: "39px",
                width: "28px",
                height: "28px",
                x: "0%",
                duration: 0.5,
                ease: "power2.out",
              });
            }
          }
        },
      });

      // Primero aparecer glass-overlay
      tl.fromTo(
        glassOverlayRef,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.3,
          ease: "power2.out",
        },
      )
        // Después aparecer track-content
        .fromTo(
          trackContentRef,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.3,
            ease: "power2.out",
          },
          "-=0.1", // Pequeño overlap
        );
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!wrapperRef) return;

    const rect = wrapperRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -15;
    const rotateY = ((x - centerX) / centerX) * 15;

    gsap.to(cardRef, {
      rotationX: rotateX,
      rotationY: rotateY,
      duration: 0.3,
      ease: "power2.out",
      transformPerspective: 1000,
    });
  };

  import { createAlbumArtLoader } from "$lib/hooks/useAlbumArt.svelte";

  // Hook para cargar imagen (usa cache global)
  const albumArtState = createAlbumArtLoader(
    track.artist || null,
    track.title || null,
    track.album || null,
  );

  // Default album art if none exists (Musical Note)
  const defaultAlbumArt =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23334155'/%3E%3Cpath fill='%2394a3b8' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

  // Priorizar: 1. Imagen cargada por hook, 2. Imagen del track, 3. Default
  const albumArt = $derived(
    albumArtState.url || track.albumArt || defaultAlbumArt,
  );
  const title = $derived(track.title || "Unknown Title");
  const artist = $derived(track.artist || "Unknown Artist");
  const album = $derived(track.album || "Unknown Album");

  onMount(() => {
    // Setup GSAP hover animations
    wrapperRef?.addEventListener("mouseenter", handleMouseEnter);
    wrapperRef?.addEventListener("mouseleave", handleMouseLeave);
    wrapperRef?.addEventListener("mousemove", handleMouseMove);

    return () => {
      wrapperRef?.removeEventListener("mouseenter", handleMouseEnter);
      wrapperRef?.removeEventListener("mouseleave", handleMouseLeave);
      wrapperRef?.removeEventListener("mousemove", handleMouseMove);
    };
  });
</script>

<div bind:this={wrapperRef} class="music-card-wrapper">
  <div bind:this={cardRef} class="music-card">
    <!-- Layered Album Art Circles -->
    <div class="logo-circles">
      <div bind:this={circlesRefs[0]} class="circle circle-1"></div>
      <div bind:this={circlesRefs[1]} class="circle circle-2"></div>
      <div bind:this={circlesRefs[2]} class="circle circle-3"></div>
      <div bind:this={circlesRefs[3]} class="circle circle-4"></div>
      <div bind:this={circlesRefs[4]} class="circle circle-5">
        <div class="album-art-container">
          <img src={albumArt} alt={`${title} album art`} class="album-art" />
        </div>
      </div>
    </div>

    <!-- Glass overlay -->
    <div bind:this={glassOverlayRef} class="glass-overlay"></div>

    <!-- Track Information -->
    <div bind:this={trackContentRef} class="track-content">
      <span class="track-title">{title}</span>
      <span class="track-artist">{artist}</span>
      {#if album !== "Unknown Album"}
        <span class="track-album">{album}</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .music-card-wrapper {
    width: 160px;
    height: 176px;
    perspective: 1000px;
    cursor: pointer;
  }

  .music-card {
    width: 100%;
    height: 100%;
    border-radius: 50px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transform-style: preserve-3d;
    transition: box-shadow 0.5s ease-in-out;
    box-shadow:
      rgba(0, 0, 0, 0) 40px 50px 25px -40px,
      rgba(0, 0, 0, 0.2) 0px 25px 25px -5px;
    position: relative;
    overflow: hidden;
  }

  .music-card-wrapper:hover .music-card {
    box-shadow:
      rgba(102, 126, 234, 0.4) 30px 50px 25px -40px,
      rgba(0, 0, 0, 0.3) 0px 25px 30px 0px;
  }

  .glass-overlay {
    transform-style: preserve-3d;
    position: absolute;
    inset: 8px;
    border-radius: 55px;
    border-top-right-radius: 100%;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 100%
    );
    backdrop-filter: blur(10px);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.5s ease-in-out;
    pointer-events: auto;
  }

  .track-content {
    padding: 56px 16px 0px 16px;
    transform: translate3d(0, 0, 26px);
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
    z-index: 10;
  }

  .track-title {
    display: block;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
    line-height: 1.2;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .track-artist {
    display: block;
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-album {
    display: block;
    color: rgba(255, 255, 255, 0.7);
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .logo-circles {
    position: relative;
    transform-style: preserve-3d;
    pointer-events: none;
  }

  .circle {
    display: block;
    position: absolute;
    aspect-ratio: 1;
    border-radius: 50%;
    top: 0;
    right: 0;
    box-shadow: rgba(0, 0, 0, 0.2) -10px 10px 20px 0px;
    backdrop-filter: blur(5px);
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.5s ease-in-out;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .circle-1 {
    width: 96px;
    transform: translate3d(0, 0, 20px);
    top: 5px;
    left: 59px;
    background: rgba(255, 255, 255, 0.1);
  }

  .circle-2 {
    width: 76px;
    transform: translate3d(0, 0, 40px);
    top: 15px;
    left: 69px;
    backdrop-filter: blur(3px);
    background: rgba(255, 255, 255, 0.12);
  }

  .circle-3 {
    width: 56px;
    transform: translate3d(0, 0, 60px);
    top: 25px;
    left: 79px;
    background: rgba(255, 255, 255, 0.15);
  }

  .circle-4 {
    width: 40px;
    transform: translate3d(0, 0, 80px);
    top: 33px;
    left: 87px;
    background: rgba(255, 255, 255, 0.18);
  }

  .circle-5 {
    width: 28px;
    transform: translate3d(0, 0, 100px);
    top: 39px;
    left: 93px;
    display: grid;
    place-content: center;
    background: rgba(255, 255, 255, 0.25);
    padding: 2px;
  }

  .album-art-container {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    box-shadow:
      0 4px 15px rgba(0, 0, 0, 0.3),
      inset 0 0 10px rgba(255, 255, 255, 0.1);
  }

  .album-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Responsive styles for mobile */
  @media (max-width: 600px) {
    .music-card-wrapper {
      width: 240px;
      height: 260px;
    }

    .music-card {
      border-radius: 30px;
    }

    .glass-overlay {
      inset: 5px;
      border-radius: 35px;
    }

    .track-content {
      padding: 80px 20px 0px 20px;
    }

    .track-title {
      font-size: 16px;
    }

    .track-artist {
      font-size: 12px;
    }

    .track-album {
      font-size: 10px;
    }

    .circle {
      box-shadow: rgba(0, 0, 0, 0.15) -5px 5px 15px 0px;
    }

    .circle-1 {
      width: 120px;
      top: 6px;
      right: 6px;
    }

    .circle-2 {
      width: 100px;
      top: 16px;
      right: 16px;
    }

    .circle-3 {
      width: 80px;
      top: 26px;
      right: 26px;
    }

    .circle-4 {
      width: 60px;
      top: 36px;
      right: 36px;
    }

    .circle-5 {
      width: 40px;
      top: 46px;
      right: 46px;
    }
  }
</style>
