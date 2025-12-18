<script lang="ts">
  import { onMount } from "svelte";
  import { gsap } from "gsap";
  import { useLibrary } from "$lib/hooks";
  import Logo from "./Logo.svelte";
  import NavLinks from "./NavLinks.svelte";
  import MobileToggle from "./MobileToggle.svelte";
  import MobileMenu from "./MobileMenu.svelte";

  // --- STATE ---
  let navContainerRef = $state<HTMLElement>();
  let navRef = $state<HTMLElement>();
  let glowLineRef = $state<HTMLElement>();
  let glowSpotRef = $state<HTMLElement>();
  let activationZoneRef = $state<HTMLElement>();

  let isMobileMenuOpen = $state(false);
  let isLoadingLibrary = $state(false);
  let isMouseNear = $state(false);
  let isHovering = $state(false);

  const library = useLibrary();
  let ctx: gsap.Context | null = null;

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

  // --- ANIMATION FUNCTIONS ---
  function animateNavbar(targetMode: "retreat" | "active" | "focus") {
    if (!ctx || !navRef || !glowLineRef || !glowSpotRef) return;

    gsap.killTweensOf([navRef, glowLineRef, glowSpotRef]);

    const config = {
      retreat: {
        nav: { scale: 0.9, z: -50, rotateX: 10, opacity: 0.4 },
        glow: { lineOpacity: 0.2, spotOpacity: 0 }
      },
      active: {
        nav: { scale: 1, z: 0, rotateX: 0, opacity: 1 },
        glow: { lineOpacity: 0.6, spotOpacity: 0.4 }
      },
      focus: {
        nav: { 
          scale: 1.05, 
          z: 20, 
          rotateX: 0, 
          opacity: 1,
          boxShadow: "0 20px 50px rgba(34, 211, 238, 0.3), 0 0 40px rgba(34, 211, 238, 0.2), 0 0 80px rgba(147, 51, 234, 0.15)"
        },
        glow: { lineOpacity: 0.8, spotOpacity: 0.6 }
      }
    };

    const duration = targetMode === "focus" ? 0.4 : 1.2;
    const ease = targetMode === "focus" ? "back.out(1.5)" : "power1.out";

    gsap.to(navRef, { ...config[targetMode].nav, duration, ease });
    gsap.to([glowLineRef, glowSpotRef], { 
      opacity: config[targetMode].glow.lineOpacity, 
      duration, 
      ease 
    });
  }

  // --- LIFECYCLE ---
  onMount(() => {
    ctx = gsap.context(() => {
      if (navRef) {
        gsap.set(navRef, { 
          transformPerspective: 1200,
          scale: 1,
          z: 0,
          rotateX: 0,
          opacity: 1
        });

        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.set(navRef, { y: -100, opacity: 0, rotateX: 20 })
          .to(navRef, {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1.5,
            ease: "power4.out",
          });
      }
    }, navContainerRef);

    return () => {
      ctx?.revert();
      ctx = null;
    };
  });

  // --- MOUSE PROXIMITY ---
  $effect(() => {
    if (!activationZoneRef) return;
    
    const handleMouseEnter = () => { isMouseNear = true; };
    const handleMouseLeave = () => { isMouseNear = false; };
    
    activationZoneRef.addEventListener('mouseenter', handleMouseEnter);
    activationZoneRef.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      activationZoneRef?.removeEventListener('mouseenter', handleMouseEnter);
      activationZoneRef?.removeEventListener('mouseleave', handleMouseLeave);
    };
  });

  // --- STATE SYNCHRONIZATION ---
  $effect(() => {
    if (!ctx) return;
    
    const targetMode = isHovering ? "focus" : isMouseNear ? "active" : "retreat";
    animateNavbar(targetMode);
  });
</script>

<!-- 
  NAVBAR CONTAINER 
  Perspective container for 3D effects.
-->
<div
  bind:this={navContainerRef}
  class="flex justify-center px-4 pt-6 pointer-events-none"
  style="perspective: 1000px;"
>
  <!-- Invisible activation zone for mouse proximity detection -->
  <div
    bind:this={activationZoneRef}
    class="pointer-events-auto"
    style="position: absolute; top: -32px; left: -32px; right: -32px; bottom: -32px; z-index: -1; background: transparent;"
  ></div>

  <!-- NAVBAR ELEMENT - 3D object with glassmorphism -->
  <nav
    bind:this={navRef}
    onmouseenter={() => isHovering = true}
    onmouseleave={() => isHovering = false}
    class="relative w-full min-w-[65vw] max-w-6xl overflow-hidden border pointer-events-auto bg-slate-800/60 backdrop-blur-2xl backdrop-saturate-150 border-slate-600/30 rounded-2xl"
    style="transform-style: preserve-3d; will-change: transform, opacity;"
  >
    <!-- Top Light Border (Reflection) -->
    <div
      class="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent opacity-80"
    ></div>

    <!-- Glow Line & Spot (Consolidated) -->
    <div
      bind:this={glowLineRef}
      class="absolute top-px left-0 right-0 h-px blur-px pointer-events-none"
      style="background: linear-gradient(to right, transparent, rgba(34, 211, 238, 0.6), rgba(147, 51, 234, 0.4), transparent); opacity: 0.6;"
    ></div>

    <div
      bind:this={glowSpotRef}
      class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-40 blur-[60px] pointer-events-none rounded-full"
      style="background: linear-gradient(to bottom, rgba(34, 211, 238, 0.15), rgba(147, 51, 234, 0.1)); opacity: 0.4;"
    ></div>

    <!-- CONTENT -->
    <div class="relative z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-3">
      <!-- LEFT: LOGO -->
      <div class="logo">
        <Logo
          {isLoadingLibrary}
          {handleLogoClick}
          tracksLength={library.tracks.length}
        />
      </div>

      <!-- RIGHT: LINKS (Desktop) -->
      <div class="hidden links md:block">
        <NavLinks />
      </div>

      <!-- MOBILE TOGGLE -->
      <div class="toggle md:hidden">
        <MobileToggle {isMobileMenuOpen} {toggleMobileMenu} />
      </div>
    </div>

    <!-- MOBILE MENU -->
    <MobileMenu {isMobileMenuOpen} {toggleMobileMenu} />
  </nav>
</div>
