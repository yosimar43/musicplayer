<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { createAlbumArtLoader } from "$lib/hooks/useAlbumArt.svelte";
  import { usePlayer } from "$lib/hooks/usePlayer.svelte";

  interface Props {
    track: Track;
    /** Callback opcional cuando se hace click en la card */
    onPlay?: (track: Track) => void;
    /** Si se debe agregar a la cola al reproducir */
    addToQueue?: boolean;
  }

  let { track, onPlay, addToQueue = true }: Props = $props();

  // 🎵 Hook para reproducción (usa la nueva arquitectura)
  const player = usePlayer();

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
              // Centrar el círculo del album art
              gsap.to(circlesRefs[4], {
                top: "15px",
                right: "50%",
                width: "70px",
                height: "70px",
                x: "50%",
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
              // Restaurar posición original
              gsap.to(circlesRefs[4], {
                top: "29px",
                right: "29px",
                width: "22px",
                height: "22px",
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

  /**
   * 🎵 Handler para reproducir el track
   * Usa el hook usePlayer para orquestar la reproducción
   */
  const handlePlayTrack = async () => {
    try {
      // Si hay callback externo, usarlo
      if (onPlay) {
        onPlay(track);
        return;
      }

      // Usar el hook usePlayer para reproducir
      await player.play(track, addToQueue);
    } catch (error) {
      console.error('❌ Error reproduciendo track:', error);
    }
  };

  // Hook para cargar imagen (usa cache global via musicDataStore)
  const albumArtState = createAlbumArtLoader(
    track.artist || null,
    track.title || null,
    track.album || null,
  );

  // Default album art if none exists (Musical Note)
  const defaultAlbumArt =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23334155'/%3E%3Cpath fill='%2394a3b8' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

  // Priorizar: 1. Imagen del track (desde archivo), 2. Imagen de Last.fm, 3. Default
  const albumArt = $derived(
    track.albumArt || albumArtState.url || defaultAlbumArt,
  );
  const title = $derived(track.title || "Unknown Title");
  const artist = $derived(track.artist || "Unknown Artist");
  const album = $derived(track.album || "Unknown Album");

  // 🎵 Estado derivado: ¿Es este track el que se está reproduciendo?
  const isCurrentTrack = $derived(
    player.current?.path === track.path
  );

  // 🎵 Estado derivado: ¿Está reproduciéndose este track?
  const isPlaying = $derived(isCurrentTrack && player.isPlaying);

  onMount(() => {
    // Inicializar player si no está inicializado
    if (!player.isInitialized) {
      player.initialize();
    }

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

<div bind:this={wrapperRef} class="music-card-wrapper" role="button" tabindex="0" onclick={handlePlayTrack} onkeydown={(e) => e.key === 'Enter' && handlePlayTrack()}>
  <div bind:this={cardRef} class="music-card" class:is-playing={isPlaying} class:is-current={isCurrentTrack}>
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
  width: 180px;
  height: 100px;
  perspective: 1100px;
  cursor: pointer;
}

/* CARD BASE */
.music-card {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform-style: preserve-3d;
  transition: box-shadow 0.35s ease;
  position: relative;
  overflow: hidden;

  /* Sombras más limpias y modernas */
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.25),
    inset 0 0 0 rgba(255, 255, 255, 0);
}

.music-card-wrapper:hover .music-card {
  box-shadow:
    0 12px 26px rgba(0, 0, 0, 0.30),
    0 0 14px rgba(102, 126, 234, 0.4);
}

/* ESTADO: Seleccionado */
.music-card.is-current {
  border: 2px solid rgba(56, 189, 248, 0.6);
  box-shadow:
    0 0 25px rgba(56, 189, 248, 0.55),
    0 12px 22px rgba(0, 0, 0, 0.3);
}

/* ESTADO: Reproduciendo */
.music-card.is-playing {
  animation: pulse-glow 1.7s ease-in-out infinite;
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
  }
  50% {
    box-shadow: 0 0 35px rgba(56, 189, 248, 0.8);
  }
  100% {
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
  }
}

/* GLASS OVERLAY mejorado */
.glass-overlay {
  position: absolute;
  inset: 6px;
  border-radius: 18px;
  border-top-right-radius: 50%;

  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(15px);

  border-left: 1px solid rgba(255, 255, 255, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);

  transition: opacity 0.4s ease;
  transform-style: preserve-3d;
}

/* TRACK CONTENT */
.track-content {
  padding: 12px;
  transform: translate3d(0, 0, 40px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  position: relative;
  z-index: 10;
  max-width: 120px;
}

.track-title {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.track-artist {
  color: rgba(255, 255, 255, 0.85);
  font-size: 9px;
  font-weight: 400;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album {
  color: rgba(255, 255, 255, 0.7);
  font-size: 8px;
  font-weight: 300;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* CÍRCULOS – mismos tamaños, estilo más pro, sombras suaves */
.logo-circles {
  position: absolute;
  right: 0;
  top: 0;
  transform-style: preserve-3d;
  pointer-events: none;
}

.circle {
  position: absolute;
  aspect-ratio: 1;
  border-radius: 50%;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
  box-shadow:
    0 3px 9px rgba(0, 0, 0, 0.25),
    inset 0 0 6px rgba(255, 255, 255, 0.08);

  transition: all 0.45s ease;
}

/* Se mantienen tus tamaños EXACTOS */
.circle-1 { width: 70px; top: 5px; right: 5px; transform: translateZ(20px); }
.circle-2 { width: 56px; top: 12px; right: 12px; transform: translateZ(40px); }
.circle-3 { width: 42px; top: 19px; right: 19px; transform: translateZ(60px); }
.circle-4 { width: 30px; top: 25px; right: 25px; transform: translateZ(80px); }
.circle-5 {
  width: 22px;
  top: 29px;
  right: 29px;
  transform: translateZ(100px);
  display: grid;
  place-content: center;
  padding: 2px;
  background: rgba(255, 255, 255, 0.25);
}

.album-art-container {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  box-shadow:
    0 2px 9px rgba(0,0,0,0.3),
    inset 0 0 4px rgba(255, 255, 255, 0.12);
}

.album-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

  /* Responsive styles for mobile */
  @media (max-width: 600px) {
    .music-card-wrapper {
      width: 200px;
      height: 110px;
    }

    .music-card {
      border-radius: 18px;
    }

    .glass-overlay {
      inset: 5px;
      border-radius: 16px;
    }

    .track-content {
      padding: 14px;
      max-width: 120px;
    }

    .track-title {
      font-size: 12px;
    }

    .track-artist {
      font-size: 10px;
    }

    .track-album {
      font-size: 9px;
    }

    .circle {
      box-shadow: rgba(0, 0, 0, 0.15) -3px 3px 8px 0px;
    }

    .circle-1 {
      width: 80px;
      top: 5px;
      right: 5px;
    }

    .circle-2 {
      width: 64px;
      top: 13px;
      right: 13px;
    }

    .circle-3 {
      width: 48px;
      top: 21px;
      right: 21px;
    }

    .circle-4 {
      width: 34px;
      top: 28px;
      right: 28px;
    }

    .circle-5 {
      width: 24px;
      top: 33px;
      right: 33px;
    }
  }
</style>
