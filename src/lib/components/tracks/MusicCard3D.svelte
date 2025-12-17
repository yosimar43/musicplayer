<script lang="ts">
  import type { Track } from "$lib/types/music";
  import { onMount } from "svelte";
  import gsap from "gsap";
  import { albumArtService } from "$lib/services/albumArt.service";
  import { usePlayer } from "$lib/hooks";
  import { useLibrary } from "$lib/hooks";
  import { uiStore } from "$lib/stores";

  // ✅ Flag global para evitar múltiples listeners
  let isGlobalPointerUpListenerAdded = false;

  interface Props {
    track: Track;
    size?: number; // diámetro en px (opcional, default 160)
    immediate?: boolean; // ✅ Nuevo: forzar inicialización inmediata (para los primeros items)
  }

  // Svelte 5 runes: props
  let { track, size = 160, immediate = false }: Props = $props();

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
  let isVisible = $state(false); // ✅ Nuevo: control de visibilidad
  let isAnimationsPaused = $state(false); // ✅ Nuevo: pausar todas las animaciones cuando no visible
  let isDragOver = $state(false); // ✅ Nuevo: estado para drag and drop

  // ID único para el path SVG (evita conflictos entre múltiples instancias)
  const uniqueId = $state(Math.random().toString(36).substring(2, 9));
  const pathId = $derived(`textPath-${uniqueId}`);

  // ✅ Album art loader con Web Worker (no bloquea UI)
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

    // ✅ Cargar usando Web Worker (no bloquea UI)
    loadAlbumArtAsync(artist, title, album, trackPath);
  });

  async function loadAlbumArtAsync(
    artist: string,
    title: string,
    album: string | null,
    originalTrackPath: string,
  ) {
    try {
      const checkSameTrack = () => track?.path === originalTrackPath;

      // ✅ Usar Web Worker en lugar de musicDataStore
      const image = await albumArtService.getAlbumArt(
        artist,
        title,
        album,
        originalTrackPath,
      );

      if (!checkSameTrack()) return;

      if (image) {
        albumArtUrl = image;
      }

      isAlbumArtLoading = false;
    } catch (error) {
      if (track?.path === originalTrackPath) {
        isAlbumArtLoading = false;
        console.error("Error loading album art:", error);
      }
    }
  }

  const defaultAlbumArt =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23334155'/%3E%3Cpath fill='%2394a3b8' d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E";

  const albumArt = $derived(track.albumArt || albumArtUrl || defaultAlbumArt);
  const title = $derived(track.title || "Unknown Title");
  const artist = $derived(track.artist || "Unknown Artist");
  const album = $derived(track.album || "Unknown Album");

  // Player hook
  const player = usePlayer();
  const library = useLibrary();
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

  // ✅ Pausar/reanudar animaciones según visibilidad (optimización crítica)
  function pauseAllAnimations() {
    if (isAnimationsPaused) return;
    isAnimationsPaused = true;

    idleTimeline?.pause();
    hoverTimeline?.pause();
    textRotationTimeline?.pause();
    textFloatTimeline?.pause();

    // Kill quickTo para evitar memory leaks
    killAllAnimations();
  }

  function resumeAllAnimations() {
    if (!isAnimationsPaused || !isInitialized) return;
    isAnimationsPaused = false;

    // Solo reanudar idle si no está en hover
    if (!isHovering && idleTimeline) {
      idleTimeline.resume();
    }
  }

  // ✅ Effect: pausar animaciones cuando NO es visible
  $effect(() => {
    if (!isInitialized) return;

    if (!isVisible) {
      pauseAllAnimations();
    } else if (isAnimationsPaused) {
      resumeAllAnimations();
    }
  });

  // ✅ Effect: snap back cuando drag termina (incluso si se completó en hover)
  $effect(() => {
    if (uiStore.isDragging === false && uiStore.draggedTrack && track.path === uiStore.draggedTrack.path && (position.x !== 0 || position.y !== 0)) {
      console.log(`🔄 Snap back automático para: "${track.title}"`);
      position = { x: 0, y: 0 };
    }
  });

  // Animación de float vertical para los textos (solo en hover)
  function startTextFloat() {
    if (!titleSvgRef || !artistSvgRef || !ctx) return;

    // Matar float anterior si existe
    textFloatTimeline?.kill();

    textFloatTimeline = gsap.timeline({
      repeat: -1,
      yoyo: true,
      defaults: { ease: "sine.inOut" },
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
          overwrite: true,
        });
      }
    }
  }

  // ✅ Iniciar animación de rotación de texto (solo en hover) - OPTIMIZADO
  function startTextRotation() {
    if (!titleSvgRef || !artistSvgRef || !ctx) return;

    // Matar rotación anterior si existe
    textRotationTimeline?.kill();

    // ✅ Reducir duración: 20-25s → 60s (más smooth, menos CPU)
    // Rotaciones lentas = mejor performance que rápidas
    textRotationTimeline = gsap.timeline({
      defaults: { ease: "none", repeat: -1, transformOrigin: "center center" },
    });

    textRotationTimeline.to(titleSvgRef, { rotation: 360, duration: 60 }, 0);
    textRotationTimeline.to(artistSvgRef, { rotation: -360, duration: 75 }, 0);
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
          overwrite: true,
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

    quickToBgX = gsap.quickTo(bgImageRef, "x", {
      duration: 0.5,
      ease: "power2.out",
    });
    quickToBgY = gsap.quickTo(bgImageRef, "y", {
      duration: 0.5,
      ease: "power2.out",
    });

    // ✅ QuickTo para albumRef en parallax (más rápido que gsap.to)
    if (albumRef) {
      const quickToAlbumX = gsap.quickTo(albumRef, "x", {
        duration: 0.4,
        ease: "power2.out",
      });
      const quickToAlbumY = gsap.quickTo(albumRef, "y", {
        duration: 0.4,
        ease: "power2.out",
      });

      // Almacenar para usar en mousemove
      (circleRef as any)._quickToAlbumX = quickToAlbumX;
      (circleRef as any)._quickToAlbumY = quickToAlbumY;
    }

    if (glowRef) {
      quickToGlowX = gsap.quickTo(glowRef, "x", {
        duration: 0.3,
        ease: "power2.out",
      });
      quickToGlowY = gsap.quickTo(glowRef, "y", {
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }

  // ✅ Throttle mousemove para mejor performance usando requestAnimationFrame
  let mouseMoveRafId: number | null = null;
  let lastMouseEvent: MouseEvent | null = null;

  // Mouse move tilt (3D effect) - optimizado con requestAnimationFrame
  function handleMouseMove(e: MouseEvent) {
    if (!isHovering || !wrapperRef || !quickToCircleRotX || uiStore.isDragging) {
      if (uiStore.isDragging) console.log(`🚫 Mouse move prevenido en card durante drag: "${track.title}"`);
      return;
    }

    // Guardar el último evento
    lastMouseEvent = e;

    // Cancelar RAF anterior si existe
    if (mouseMoveRafId !== null) {
      cancelAnimationFrame(mouseMoveRafId);
    }

    // Programar actualización en el próximo frame
    mouseMoveRafId = requestAnimationFrame(() => {
      if (!lastMouseEvent || !isHovering) return;

      const rect = wrapperRef.getBoundingClientRect();
      const x = lastMouseEvent.clientX - rect.left;
      const y = lastMouseEvent.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateY = ((x - cx) / cx) * 12; // Reducido: 15 → 12
      const rotateX = ((y - cy) / cy) * -12; // Reducido: -15 → -12

      const parallaxX = (x - cx) * 0.05; // Reducido: 0.08 → 0.05
      const parallaxY = (y - cy) * 0.05; // Reducido: 0.08 → 0.05

      // ✅ Usar quickTo para rotations (muy rápido)
      quickToCircleRotX!(rotateX);
      quickToCircleRotY?.(rotateY);

      // ✅ Usar quickTo pre-creado para album parallax (NO gsap.to)
      const quickToAlbumX = (circleRef as any)?._quickToAlbumX;
      const quickToAlbumY = (circleRef as any)?._quickToAlbumY;

      if (quickToAlbumX && quickToAlbumY) {
        quickToAlbumX(parallaxX * 1.2); // Reducido: 1.5 → 1.2
        quickToAlbumY(parallaxY * 1.2); // Reducido: 1.5 → 1.2
      }

      quickToBgX?.(parallaxX * 0.3); // Reducido: 0.5 → 0.3
      quickToBgY?.(parallaxY * 0.3); // Reducido: 0.5 → 0.3

      quickToGlowX?.(parallaxX * 1.5); // Reducido: 2 → 1.5
      quickToGlowY?.(parallaxY * 1.5); // Reducido: 2 → 1.5

      mouseMoveRafId = null;
    });
  }

  function handleMouseEnter() {
    if (!ctx || !isInitialized || uiStore.isDragging) {
      if (uiStore.isDragging) console.log(`🚫 Hover prevenido en card durante drag: "${track.title}"`);
      return;
    }
    isHovering = true;

    // Pausar idle animation
    idleTimeline?.pause();

    // Matar hover timeline anterior si existe
    hoverTimeline?.kill();

    // ✅ Crear timeline coordinada - OPTIMIZADO: menos tweens
    hoverTimeline = gsap.timeline({
      defaults: { duration: 0.4, ease: "power2.out", overwrite: true },
    });

    // ✅ Agrupar animaciones: menos tweens = mejor performance
    if (circleRef) {
      hoverTimeline.to(circleRef, { scale: 1.05, ease: "back.out(1.7)" }, 0);
    }

    // Album bubble: scale + no parallax inicial
    if (albumRef) {
      hoverTimeline.to(
        albumRef,
        { scale: 1.12, duration: 0.5, ease: "elastic.out(1, 0.5)" },
        0,
      );
    }

    // ✅ Optimizar filter: usar backdrop en lugar de filter blur
    if (bgImageRef) {
      hoverTimeline.to(
        bgImageRef,
        {
          filter: "blur(4px) saturate(1.4)", // ✅ Reducido: 6px → 4px (menos expensive)
          scale: 1.15,
          duration: 0.5,
        },
        0,
      );
    }

    if (bgOverlayRef) {
      hoverTimeline.to(bgOverlayRef, { opacity: 0.85 }, 0);
    }

    if (glowRef) {
      hoverTimeline.to(glowRef, { opacity: 1, scale: 1.1 }, 0);
    }

    // ✅ SVG text fill - agrupar para menos tweens
    if (titleTextRef && artistTextRef) {
      hoverTimeline.to(
        [titleTextRef, artistTextRef],
        {
          attr: { fill: "rgba(56, 189, 248, 1)" },
          duration: 0.3,
        },
        0.05,
      );
    }

    if (titleSvgRef) {
      hoverTimeline.to(
        titleSvgRef,
        {
          scale: 1.08,
          ease: "back.out(1.5)",
          transformOrigin: "center center",
        },
        0,
      );
    }

    if (artistSvgRef) {
      hoverTimeline.to(
        artistSvgRef,
        {
          scale: 1.1,
          duration: 0.45,
          ease: "back.out(1.5)",
          transformOrigin: "center center",
        },
        0.05,
      );
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
      },
    });

    if (circleRef) {
      resetTimeline.to(circleRef, { rotationX: 0, rotationY: 0, scale: 1 }, 0);
    }

    if (albumRef) {
      resetTimeline.to(
        albumRef,
        { x: 0, y: 0, scale: 1, rotationX: 0, rotationY: 0 },
        0,
      );
    }

    if (bgImageRef) {
      resetTimeline.to(
        bgImageRef,
        {
          x: 0,
          y: 0,
          filter: "blur(4px) saturate(1.2)",
          scale: 1.1,
          ease: "power2.out",
        },
        0,
      );
    }

    if (bgOverlayRef) {
      resetTimeline.to(
        bgOverlayRef,
        { opacity: 1, duration: 0.4, ease: "power2.out" },
        0,
      );
    }

    if (glowRef) {
      resetTimeline.to(
        glowRef,
        { opacity: 0, scale: 1, x: 0, y: 0, duration: 0.4, ease: "power2.out" },
        0,
      );
    }

    if (titleTextRef) {
      resetTimeline.to(
        titleTextRef,
        {
          attr: { fill: "rgba(56, 189, 248, 1)" },
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
    }

    if (artistTextRef) {
      resetTimeline.to(
        artistTextRef,
        {
          attr: { fill: "rgba(226, 232, 240, 0.9)" },
          duration: 0.3,
          ease: "power2.out",
        },
        0,
      );
    }

    if (titleSvgRef && artistSvgRef) {
      resetTimeline.to(
        [titleSvgRef, artistSvgRef],
        {
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
          transformOrigin: "center center",
        },
        0,
      );
    }
  }

  // Handle click to play track
  function handleClick() {
    // Set the entire library as queue (sorted alphabetically) and start from this track
    const sortedTracks = [...library.tracks].sort((a, b) => {
      const titleA = (a.title || a.path).toLowerCase();
      const titleB = (b.title || b.path).toLowerCase();
      return titleA.localeCompare(titleB);
    });
    
    const trackIndex = sortedTracks.findIndex((t) => t.path === track.path);
    if (trackIndex !== -1) {
      player.setQueue(sortedTracks, trackIndex);
    } else {
      // Fallback: just play the track
      player.play(track);
    }
  }

  // Handle drag start
  function handleDragStart(event: DragEvent) {
    // Set drag data
    event.dataTransfer?.setData("application/json", JSON.stringify(track));
    event.dataTransfer!.effectAllowed = "copy";

    // Set global drag state
    uiStore.setDragging(true);
    uiStore.setEnqueuedDuringDrag(false); // Reset flag
    uiStore.setDraggedTrack(track);
    console.log(`🚀 Drag HTML5 iniciado para: "${track.title}"`);
  }

  // Handle drag over - permite que se pueda soltar
  function handleDragOver(event: DragEvent) {
    event.preventDefault(); // Necesario para permitir drop
    event.dataTransfer!.dropEffect = "copy";
  }

  // Handle drag enter - feedback visual
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  // Handle drag leave - quitar feedback visual
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    // Solo quitar si realmente salió del elemento (no de un hijo)
    const target = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as Node;
    if (target && relatedTarget && !target.contains(relatedTarget)) {
      isDragOver = false;
    }
  }

  // Handle drop - procesar el elemento soltado
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;

    try {
      const data = event.dataTransfer?.getData("application/json");
      if (!data) return;

      const droppedTrack = JSON.parse(data) as Track;

      // Evitar soltar la misma canción sobre sí misma
      if (droppedTrack.path === track.path) return;

      // Agregar la canción arrastrada a la cola después de la canción actual
      const currentIndex = player.queue.findIndex((t) => t.path === track.path);
      if (currentIndex !== -1) {
        player.insertToQueue(droppedTrack, currentIndex + 1);
        console.log(
          `🎵 Agregado "${droppedTrack.title}" después de "${track.title}"`,
        );
      } else {
        // Si no está en la cola, agregarlo al final
        player.addToQueue(droppedTrack);
        console.log(`🎵 Agregado "${droppedTrack.title}" a la cola`);
      }
    } catch (error) {
      console.error("❌ Error procesando drop:", error);
    }
  }

  // ✅ will-change dinámico para mejor performance
  $effect(() => {
    if (!circleRef || !albumRef || !bgImageRef || !glowRef || !isInitialized) return;

    const willChangeValue = isHovering ? "transform" : "auto";
    circleRef.style.willChange = isHovering ? "transform, box-shadow" : "auto";
    albumRef.style.willChange = willChangeValue;
    bgImageRef.style.willChange = willChangeValue;
    if (glowRef) glowRef.style.willChange = willChangeValue;
  });

  // ✅ Función de inicialización diferida
  function initAnimations() {
    if (isInitialized || !wrapperRef) return;

    // ✅ Configurar GSAP para mejor performance
    gsap.config({
      autoSleep: 60, // garbage collection después de 60s idle
      force3D: true, // ✅ Forzar hardware acceleration (GPU)
      nullTargetWarn: false, // desactivar warnings
    });

    // ✅ Crear contexto GSAP único para todo el componente
    ctx = gsap.context(() => {
      // Inicializar TODAS las propiedades antes de crear quickTo

      if (circleRef) {
        gsap.set(circleRef, {
          transformPerspective: 1200,
          rotationX: 0,
          rotationY: 0,
          scale: 1,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        });
      }

      if (albumRef) {
        gsap.set(albumRef, {
          transformStyle: "preserve-3d",
          x: 0,
          y: 0,
          scale: 1,
          rotationX: 0,
          rotationY: 0,
        });
      }

      if (bgImageRef) {
        gsap.set(bgImageRef, {
          x: 0,
          y: 0,
          scale: 1.1,
          filter: "blur(4px) saturate(1.2)",
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
          scale: 1,
        });
      }

      if (titleSvgRef && artistSvgRef) {
        gsap.set([titleSvgRef, artistSvgRef], {
          rotation: 0,
          y: 0,
          scale: 1,
          transformOrigin: "center center",
        });
      }

      // Marcar como inicializado
      isInitialized = true;

      // ✅ matchMedia: desactivar animaciones complejas en móvil
      const mm = gsap.matchMedia();

      mm.add(
        {
          // Desktop: animaciones completas
          isDesktop: "(min-width: 768px)",
          // Mobile: animaciones simplificadas
          isMobile: "(max-width: 767px)",
        },
        (context) => {
          const { isDesktop } = context.conditions as { isDesktop: boolean };

          // Inicializar quickTo solo en desktop (más performante en móvil sin él)
          if (isDesktop) {
            initQuickTo();
          }

          // Idle animation: más suave en desktop, más simple en móvil
          if (albumRef) {
            idleTimeline = gsap.timeline({
              repeat: -1,
              yoyo: true,
              defaults: { ease: "sine.inOut" },
              paused: true,
            });

            // Móvil: animación más simple y lenta
            const duration = isDesktop ? 2.5 : 4;
            const yOffset = isDesktop ? -4 : -2;

            idleTimeline.to(albumRef, { y: yOffset, duration });
          }
        },
      );

      return () => mm.revert(); // Cleanup matchMedia
    }, wrapperRef);
  }

  // ✅ Efecto para inicializar animaciones cuando sea visible o immediate
  $effect(() => {
    if ((isVisible || immediate) && !isInitialized) {
      // Usar requestAnimationFrame para no bloquear el renderizado inicial
      requestAnimationFrame(() => {
        initAnimations();
      });
    }
  });

  onMount(() => {
    // ✅ IntersectionObserver para pausar/reanudar animaciones idle según visibilidad
    // Y para inicializar animaciones diferidas
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      {
        threshold: 0.05, // 5% visible para activar (más agresivo)
        rootMargin: "100px", // Margen de 100px para pre-activar
      },
    );

    if (wrapperRef) {
      observer.observe(wrapperRef);
    }

    // ✅ Listener global para terminar drag en pointerup (solo una vez)
    if (!isGlobalPointerUpListenerAdded) {
      document.addEventListener("pointerup", () => {
        uiStore.setDragging(false);
        uiStore.setEnqueuedDuringDrag(false); // Reset flag para permitir próximos drags
        uiStore.setDraggedTrack(null); // Reset dragged track
        console.log(`🛑 Drag terminado - estados reseteados`);
      });
      isGlobalPointerUpListenerAdded = true;
    }

    // ✅ Función para pointerdown
    const handlePointerDown = () => {
      uiStore.setDragging(true);
      uiStore.setEnqueuedDuringDrag(false); // Reset flag
      uiStore.setDraggedTrack(null); // Reset dragged track
      console.log(`🎯 Inicio de drag detectado para: "${track.title}"`);
    };

    // Listeners para interacción
    wrapperRef?.addEventListener("mousemove", handleMouseMove);
    wrapperRef?.addEventListener("mouseenter", handleMouseEnter);
    wrapperRef?.addEventListener("mouseleave", handleMouseLeave);

    // ✅ Listener para iniciar drag en pointerdown (con capture para prioridad)
    wrapperRef?.addEventListener("pointerdown", handlePointerDown, { capture: true });

    // ✅ Cleanup completo
    return () => {
      wrapperRef?.removeEventListener("mousemove", handleMouseMove);
      wrapperRef?.removeEventListener("mouseenter", handleMouseEnter);
      wrapperRef?.removeEventListener("mouseleave", handleMouseLeave);

      // Remove pointerdown listener
      wrapperRef?.removeEventListener("pointerdown", handlePointerDown, { capture: true });

      // Cancelar RAF pendiente
      if (mouseMoveRafId !== null) {
        cancelAnimationFrame(mouseMoveRafId);
        mouseMoveRafId = null;
      }

      observer.disconnect(); // ✅ Limpiar observer
      killAllAnimations();
      ctx?.revert();
      ctx = null;
      isInitialized = false;
    };
  });

  // --- DRAG (Library) ---
  import { draggable } from "@neodrag/svelte";
  import type { DragEventData } from "@neodrag/svelte";

  let position = $state({ x: 0, y: 0 });

  function handleLibraryDragEnd(data: DragEventData) {
    // Reset global drag state
    uiStore.setDragging(false);
    uiStore.setEnqueuedDuringDrag(false); // Reset flag
    uiStore.setDraggedTrack(null); // Reset dragged track

    const playerBar = document.getElementById("floating-player-bar");
    if (playerBar) {
      const playerRect = playerBar.getBoundingClientRect();
      const cardRect = data.rootNode.getBoundingClientRect();

      const intersects =
        cardRect.right > playerRect.left &&
        cardRect.left < playerRect.right &&
        cardRect.bottom > playerRect.top &&
        cardRect.top < playerRect.bottom;

      if (intersects) {
        player.enqueueNext(track);
        console.log(`🎵 Encolado desde 3D card: "${track.title}"`);
      }
    }

    // Snap back
    position = { x: 0, y: 0 };
  }
</script>

<!-- Root wrapper: usado para perspectiva y accesibilidad -->
<div
  bind:this={wrapperRef}
  class="player-circle-wrapper"
  class:drag-over={isDragOver}
  role="button"
  tabindex="0"
  aria-label={`${title} by ${artist}`}
  onclick={handleClick}
  onkeydown={(e) => (e.key === "Enter" || e.key === " ") && handleClick()}
  ondragstart={handleDragStart}
  ondragover={handleDragOver}
  ondragenter={handleDragEnter}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  use:draggable={{
    position,
    onDragStart: () => {
      uiStore.setDragging(true);
      uiStore.setEnqueuedDuringDrag(false); // Reset flag
      uiStore.setDraggedTrack(track);
      console.log(`🚀 Drag @neodrag iniciado para: "${track.title}"`);
    },
    onDragEnd: handleLibraryDragEnd,
    transform: ({ offsetX, offsetY, rootNode }) => {
      // Boost Z-index heavily
      rootNode.style.zIndex = offsetX === 0 && offsetY === 0 ? "" : "99999";
      return `translate(${offsetX}px, ${offsetY}px)`;
    },
  }}
>
  <!-- Glow effect (behind everything) -->
  <div bind:this={glowRef} class="glow-effect" aria-hidden="true"></div>

  <!-- SVG text externo: Título (FUERA del glass-circle para permitir overflow) -->
  <svg
    bind:this={titleSvgRef}
    class="svg-text svg-text-outer"
    viewBox="0 0 200 200"
    aria-hidden="true"
  >
    <defs>
      <path
        id={`${pathId}-title`}
        d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0"
      />
    </defs>
    <text
      bind:this={titleTextRef}
      class="circum-text title-text"
      fill="rgba(56, 189, 248, 1)"
    >
      <textPath href={`#${pathId}-title`} startOffset="0%">
        {title} • {title} • {title} • {title}
      </textPath>
    </text>
  </svg>

  <!-- SVG text interno: Artista + Álbum (FUERA del glass-circle para permitir overflow) -->
  <svg
    bind:this={artistSvgRef}
    class="svg-text svg-text-outer"
    viewBox="0 0 200 200"
    aria-hidden="true"
  >
    <defs>
      <path
        id={`${pathId}-artist`}
        d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"
      />
    </defs>
    <text
      bind:this={artistTextRef}
      class="circum-text artist-text"
      fill="rgba(226, 232, 240, 0.9)"
    >
      <textPath href={`#${pathId}-artist`} startOffset="0%">
        {artist}
        {album !== "Unknown Album" ? `• ${album}` : ""} • {artist}
        {album !== "Unknown Album" ? `• ${album}` : ""}
      </textPath>
    </text>
  </svg>

  <!-- Circular glass base -->
  <div bind:this={circleRef} class="glass-circle">
    <!-- Background image with blur (behind everything) -->
    <div class="bg-image-container">
      <img
        bind:this={bgImageRef}
        src={albumArt}
        alt=""
        class="bg-image"
        aria-hidden="true"
      />
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
    font-family:
      "Quicksand",
      system-ui,
      -apple-system,
      "Segoe UI",
      Roboto,
      "Helvetica Neue",
      Arial;
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

  /* Drag over state - visual feedback */
  .player-circle-wrapper.drag-over {
    transform: scale(1.05);
    box-shadow:
      0 0 30px rgba(56, 189, 248, 0.6),
      0 0 60px rgba(56, 189, 248, 0.3),
      inset 0 0 30px rgba(56, 189, 248, 0.2);
    transition: all 0.2s ease-out;
  }

  .player-circle-wrapper.drag-over .glow-effect {
    opacity: 0.8;
    background: radial-gradient(
      circle at center,
      rgba(56, 189, 248, 0.5) 0%,
      rgba(56, 189, 248, 0.25) 30%,
      transparent 70%
    );
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
    backface-visibility: hidden;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
    display: grid;
    place-items: center;
    transition: border-color 0.3s ease;
    z-index: 1;
  }

  .glass-circle:hover {
    border-color: rgba(56, 189, 248, 0.3);
    will-change: transform; /* Solo durante hover */
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
    transform: scale(1.1) translateZ(0); /* ✅ GPU acceleration */
    will-change: filter, transform;
    backface-visibility: hidden;
  }

  /* Overlay gradient for depth and text readability */
  .bg-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at center,
      rgba(15, 23, 42, 0.3) 0%,
      rgba(15, 23, 42, 0.5) 50%,
      rgba(15, 23, 42, 0.7) 100%
    );
    box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.4);
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
    backface-visibility: hidden;
    /* ✅ GPU acceleration para SVG animations */
    will-change: transform;
    transform: translateZ(0);
  }

  /* SVGs externos al glass-circle - necesitan estar sobre el círculo */
  .svg-text-outer {
    z-index: 10;
  }

  .circum-text {
    font-family:
      "Quicksand",
      system-ui,
      -apple-system,
      "Segoe UI",
      Roboto,
      "Helvetica Neue",
      Arial;
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
    backface-visibility: hidden;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    );
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.25),
      0 2px 8px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
    background: radial-gradient(
      circle at 30% 30%,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.01)
    );
    z-index: 1;
    pointer-events: none;
    transform: translateZ(2px);
  }

  /* Responsive adjustments */
  @media (max-width: 900px) {
    .title-text {
      font-size: 10px;
    }
    .artist-text {
      font-size: 7px;
    }
  }

  @media (max-width: 600px) {
    .title-text {
      font-size: 9px;
    }
    .artist-text {
      font-size: 6px;
    }
    .glow-effect {
      inset: -15%;
    }
  }

  @media (max-width: 400px) {
    .title-text {
      font-size: 8px;
    }
    .artist-text {
      font-size: 5px;
    }
  }
</style>
