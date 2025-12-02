<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { useLibrary } from "$lib/hooks";
  import { useNavbarAutoHide } from "$lib/hooks/useNavbarAutoHide.svelte";
  import Logo from "./Logo.svelte";
  import SearchBar from "./SearchBar.svelte";
  import NavLinks from "./NavLinks.svelte";
  import MobileToggle from "./MobileToggle.svelte";
  import MobileMenu from "./MobileMenu.svelte";

  // --- STATE ---
  let navContainerRef = $state<HTMLElement>();
  let navRef = $state<HTMLElement>();
  let glowLineCyan = $state<HTMLElement>();
  let glowLinePurple = $state<HTMLElement>();
  let glowSpotCyan = $state<HTMLElement>();
  let glowSpotPurple = $state<HTMLElement>();

  // Refs for children animations
  let logoRef = $state<HTMLElement>();
  let searchRef = $state<HTMLElement>();
  let linksRef = $state<HTMLElement>();
  let toggleRef = $state<HTMLElement>();

  let isMobileMenuOpen = $state(false);
  let isLoadingLibrary = $state(false);
  let searchQuery = $state("");
  let isSearchFocused = $state(false);

  // Navbar state: 'retreat' | 'active' | 'focus'
  let currentState = $state<"retreat" | "active" | "focus">("active");
  let isHovering = $state(false);

  // Hook para la biblioteca local
  const library = useLibrary();

  // GSAP Context
  let ctx: gsap.Context;

  // Mouse proximity state
  let mouseProximity = $state<{ isMouseNear: boolean }>();

  // Activation zone ref
  let activationZoneRef = $state<HTMLElement>();

  // --- HANDLERS ---
  async function handleLogoClick() {
    if (isLoadingLibrary) return;
    isLoadingLibrary = true;

    try {
      console.log("🎵 Cargando biblioteca local...");
      await library.loadLibrary();
      console.log("✅ Biblioteca cargada:", library.tracks.length, "canciones");
    } catch (error) {
      console.error("❌ Error al cargar biblioteca:", error);
    } finally {
      isLoadingLibrary = false;
    }
  }

  function toggleMobileMenu(close?: boolean) {
    isMobileMenuOpen = close ? false : !isMobileMenuOpen;
  }

  function handleSearchQueryChange(newQuery: string) {
    searchQuery = newQuery;
  }

  function handleSearchFocus() {
    isSearchFocused = true;
  }

  function handleSearchBlur() {
    isSearchFocused = false;
  }

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {
      // 1. Initial Entrance
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.set(navRef!, { y: -100, opacity: 0, rotateX: 20 })
        .to(navRef!, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1.5,
          ease: "power4.out",
        })
        .from(
          [logoRef, searchRef, linksRef, toggleRef],
          {
            y: -20,
            opacity: 0,
            stagger: 0.1,
            duration: 1.2,
            clearProps: "opacity,transform",
          },
          "-=1.0",
        );
    }, navContainerRef);

    return () => {
      ctx.revert();
    };
  });

  // Initialize mouse proximity hook
  $effect(() => {
    if (!activationZoneRef) return;
    mouseProximity = useNavbarAutoHide(activationZoneRef);
  });

  // --- 3-STATE SYSTEM ---
  // Watch Mouse Proximity and Hover State
  $effect(() => {
    if (
      !navRef ||
      !glowLineCyan ||
      !glowLinePurple ||
      !glowSpotCyan ||
      !glowSpotPurple
    )
      return;

    // Determinar el estado actual basado en hover y proximidad
    let targetState: "retreat" | "active" | "focus";

    if (isHovering) {
      targetState = "focus";
    } else if (mouseProximity?.isMouseNear) {
      targetState = "active";
    } else {
      targetState = "retreat";
    }

    // Solo animar si el estado cambió
    if (currentState === targetState) return;
    currentState = targetState;

    // Aplicar animaciones según el estado
    if (targetState === "retreat") {
      applyRetreatMode();
    } else if (targetState === "active") {
      applyActiveMode();
    } else {
      applyFocusMode();
    }
  });

  // --- INTERACTION HANDLERS ---
  function handleMouseEnter() {
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
  }

  // ✅ Defaults compartidos para animaciones de estado
  const stateAnimDefaults = { 
    duration: 1.2, 
    ease: "power1.out", 
    overwrite: "auto" as const 
  };
  
  const focusAnimDefaults = { 
    duration: 0.4, 
    ease: "power1.out", 
    overwrite: "auto" as const 
  };

  // --- ANIMATION FUNCTIONS ---
  // ✅ OPTIMIZADO: Usar arrays para animar múltiples elementos a la vez
  function applyRetreatMode() {
    gsap.to(navRef!, {
      scale: 0.9,
      z: -50,
      rotateX: 10,
      opacity: 0.4,
      ...stateAnimDefaults
    });

    // Purple glow dominant - batch animation
    gsap.to([glowLineCyan!, glowSpotCyan!], {
      opacity: (i) => i === 0 ? 0.2 : 0,
      ...stateAnimDefaults
    });
    gsap.to([glowLinePurple!, glowSpotPurple!], {
      opacity: (i) => i === 0 ? 0.6 : 0.15,
      ...stateAnimDefaults
    });
  }

  function applyActiveMode() {
    gsap.to(navRef!, {
      scale: 1,
      z: 0,
      rotateX: 0,
      opacity: 1,
      ...stateAnimDefaults
    });

    // Cyan glow dominant - batch animation
    gsap.to([glowLineCyan!, glowSpotCyan!], {
      opacity: (i) => i === 0 ? 0.6 : 0.4,
      ...stateAnimDefaults
    });
    gsap.to([glowLinePurple!, glowSpotPurple!], {
      opacity: 0,
      ...stateAnimDefaults
    });
  }

  function applyFocusMode() {
    gsap.to(navRef!, {
      scale: 1.05,
      z: 20,
      rotateX: 0,
      opacity: 1,
      boxShadow:
        "0 20px 50px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.2), 0 0 80px rgba(147, 51, 234, 0.15)",
      duration: 0.4,
      ease: "back.out(1.5)",
      overwrite: "auto",
    });

    // Both glows at maximum (white blend) - batch animation
    gsap.to([glowLineCyan!, glowLinePurple!], {
      opacity: 0.8,
      ...focusAnimDefaults
    });
    gsap.to([glowSpotCyan!, glowSpotPurple!], {
      opacity: 0.6,
      ...focusAnimDefaults
    });
  }
</script>

<!-- 
  NAVBAR CONTAINER 
  Perspective container for 3D effects.
  Fixed at top, high z-index.
-->
<div
  bind:this={navContainerRef}
  class="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6 pointer-events-none"
  style="perspective: 1200px;"
>
  <!-- Invisible activation zone (reduced) -->
  <div
    bind:this={activationZoneRef}
    class="absolute opacity-0 pointer-events-auto -top-8 -left-8 -right-8 -bottom-8"
    style="z-index: -1;"
  ></div>

  <!-- 
    NAVBAR ELEMENT 
    The 3D object.
    Glassmorphism 2.0 styles.
  -->
  <nav
    bind:this={navRef}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    class="relative w-full max-w-5xl pointer-events-auto
           bg-white/5 backdrop-blur-2xl backdrop-saturate-150
           border-b border-black/20
           rounded-2xl overflow-hidden
           shadow-[0_8px_32px_rgba(0,0,0,0.1)]"
    style="transform-style: preserve-3d; will-change: transform, opacity;"
  >
    <!-- 
      GLASS BORDERS & GLOWS 
    -->
    <!-- Top Light Border (Reflection) -->
    <div
      class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-80"
    ></div>

    <!-- Ambient Glow (Layered for smooth transitions) -->
    <div
      class="absolute top-[1px] left-0 right-0 h-[1px] blur-[1px] pointer-events-none"
    >
      <!-- Cyan Layer -->
      <div
        bind:this={glowLineCyan}
        class="absolute inset-0 opacity-60"
        style="background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.6), transparent);"
      ></div>
      <!-- Purple Layer -->
      <div
        bind:this={glowLinePurple}
        class="absolute inset-0 opacity-0"
        style="background: linear-gradient(to right, transparent, rgba(147, 51, 234, 0.6), transparent);"
      ></div>
    </div>

    <!-- Ambient Glow (Spot) -->
    <div
      class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 blur-[60px] pointer-events-none"
    >
      <!-- Cyan Layer -->
      <div
        bind:this={glowSpotCyan}
        class="absolute inset-0 rounded-full opacity-40"
        style="background-color: rgba(34, 211, 238, 0.15);"
      ></div>
      <!-- Purple Layer -->
      <div
        bind:this={glowSpotPurple}
        class="absolute inset-0 rounded-full opacity-0"
        style="background-color: rgba(147, 51, 234, 0.15);"
      ></div>
    </div>

    <!-- CONTENT -->
    <div
      class="relative z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-3"
    >
      <!-- LEFT: LOGO -->
      <div bind:this={logoRef} class="logo">
        <Logo
          {isLoadingLibrary}
          {handleLogoClick}
          tracksLength={library.tracks.length}
        />
      </div>

      <!-- CENTER: SEARCH (Desktop) -->
      <div bind:this={searchRef} class="hidden search md:block">
        <SearchBar
          {searchQuery}
          {isSearchFocused}
          onSearchQueryChange={handleSearchQueryChange}
          onSearchFocus={handleSearchFocus}
          onSearchBlur={handleSearchBlur}
        />
      </div>

      <!-- RIGHT: LINKS (Desktop) -->
      <div bind:this={linksRef} class="hidden links md:block">
        <NavLinks />
      </div>

      <!-- MOBILE TOGGLE -->
      <div bind:this={toggleRef} class="toggle md:hidden">
        <MobileToggle {isMobileMenuOpen} {toggleMobileMenu} />
      </div>
    </div>

    <!-- MOBILE MENU -->
    <MobileMenu {isMobileMenuOpen} {toggleMobileMenu} />
  </nav>
</div>
