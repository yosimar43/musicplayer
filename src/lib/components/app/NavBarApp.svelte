<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gsap } from "gsap";
  import {
    Music,
    Search,
    Home,
    Library,
    ListMusic,
    Menu,
    X,
  } from "lucide-svelte";
  import { page } from "$app/stores";
  import { useLibrary } from "$lib/hooks";
  import {
    uiStore,
    setupNavbarAutoHide,
    cleanupNavbarAutoHide,
  } from "$lib/stores/ui.store.svelte";
  import { cn } from "$lib/utils";
  import Logo from "./Logo.svelte";
  import SearchBar from "./SearchBar.svelte";
  import NavLinks from "./NavLinks.svelte";
  import MobileToggle from "./MobileToggle.svelte";
  import MobileMenu from "./MobileMenu.svelte";

  // --- STATE ---
  let navRef = $state<HTMLElement>();
  let searchRef = $state<HTMLElement>();
  let linksContainerRef = $state<HTMLElement>();
  let mobileMenuRef = $state<HTMLElement>();
  let menuButtonRef = $state<HTMLElement>();
  let glowLineRef = $state<HTMLElement>();
  let glowSpotRef = $state<HTMLElement>();

  let isMobileMenuOpen = $state(false);
  let isLoadingLibrary = $state(false);
  let searchQuery = $state("");
  let isSearchFocused = $state(false);

  // Hook para la biblioteca local
  const library = useLibrary();

  // GSAP Context
  let ctx: gsap.Context;

  // --- HANDLERS ---
  async function handleLogoClick() {
    if (isLoadingLibrary) return;

    isLoadingLibrary = true;

    // Animación de carga "Reactor Overload"
    gsap.to(".reactor-core", {
      scale: 1.5,
      boxShadow: "0 0 40px rgba(34, 211, 238, 0.9)",
      duration: 0.5,
      yoyo: true,
      repeat: 3,
      ease: "power2.inOut",
    });

    gsap.to(".reactor-ring", {
      rotation: "+=720",
      duration: 2,
      ease: "power4.inOut",
    });

    try {
      console.log("🎵 Cargando biblioteca local...");
      await library.loadLibrary();
      console.log("✅ Biblioteca cargada:", library.tracks.length, "canciones");

      // Success flash
      gsap.to(".logo", {
        scale: 1.2,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "back.out(1.7)",
      });
    } catch (error) {
      console.error("❌ Error al cargar biblioteca:", error);
      // Error shake
      gsap.to(".logo", { x: 5, duration: 0.1, repeat: 5, yoyo: true });
    } finally {
      isLoadingLibrary = false;
      // Return to idle
      gsap.to(".reactor-core", {
        scale: 1,
        boxShadow: "0 0 15px rgba(34, 211, 238, 0.5)",
        duration: 0.5,
      });
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
    // Setup GSAP Context
    ctx = gsap.context(() => {
      // 1. Initial Entrance Timeline
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.set(navRef!, { yPercent: -150, opacity: 0 })
        .to(navRef!, {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power4.out",
        })
        .from(
          [".logo", ".search", ".links", ".toggle"],
          {
            y: -20,
            opacity: 0,
            stagger: 0.08,
            duration: 0.8,
            clearProps: "opacity,transform", // Limpieza para interacciones posteriores
          },
          "-=0.8",
        );

      // 2. Reactor Idle Animation (Logo) - Moved to Logo component
    }, navRef);

    // Setup Auto-hide logic (trigger only, animation handled in effect)
    setupNavbarAutoHide(navRef!, 100);

    return () => {
      ctx.revert();
      cleanupNavbarAutoHide();
    };
  });

  // Watch Navbar Visibility (Auto-hide)
  $effect(() => {
    if (!navRef) return;

    if (uiStore.navbarHidden && !isMobileMenuOpen) {
      // Mini-mode: Scale down and dim, but stay visible
      gsap.to(navRef!, {
        yPercent: 0, // Keep it on screen
        scale: 0.85,
        opacity: 0.6,
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        borderColor: "rgba(255,255,255,0.1)",
        duration: 0.6,
        ease: "power4.inOut",
      });

      // Dim glows
      if (glowLineRef)
        gsap.to(glowLineRef, { opacity: 0.2, scaleX: 0.5, duration: 0.6 });
      if (glowSpotRef) gsap.to(glowSpotRef, { opacity: 0.2, duration: 0.6 });
    } else {
      // Full mode: Expanded and Glowing
      gsap.to(navRef!, {
        yPercent: 0,
        scale: 1,
        opacity: 1,
        backdropFilter: "blur(24px)",
        // Cyan glow effect + standard shadow
        boxShadow:
          "0 0 40px rgba(34, 211, 238, 0.15), 0 0 15px rgba(34, 211, 238, 0.1)",
        borderColor: "rgba(34, 211, 238, 0.4)", // Brighter cyan border
        duration: 0.6,
        ease: "power4.out",
      });

      // Brighten glows
      if (glowLineRef)
        gsap.to(glowLineRef, { opacity: 1, scaleX: 1, duration: 0.6 });
      if (glowSpotRef) gsap.to(glowSpotRef, { opacity: 0.8, duration: 0.6 });
    }
  });

  // Watch Mobile Menu
  $effect(() => {
    if (!mobileMenuRef) return;

    if (isMobileMenuOpen) {
      gsap.to(mobileMenuRef!, {
        height: "auto",
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
        display: "block",
      });
      gsap.from(mobileMenuRef!.children, {
        y: -10,
        opacity: 0,
        stagger: 0.05,
        duration: 0.4,
        delay: 0.1,
      });
    } else {
      gsap.to(mobileMenuRef!, {
        height: 0,
        opacity: 0,
        duration: 0.4,
        ease: "power3.in",
        display: "none",
      });
    }
  });
</script>

<!-- 
  NAVBAR CONTAINER 
  Fixed, z-index high, centered.
-->
<div
  class="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none"
>
  <nav
    bind:this={navRef}
    class="relative w-full max-w-7xl pointer-events-auto
           bg-white/5 backdrop-blur-2xl
           border border-white/20 rounded-2xl
           shadow-[0_8px_32px_rgba(0,0,0,0.1)]
           overflow-hidden group transition-colors duration-500"
  >
    <!-- Ambient Glow (Top Border) -->
    <div
      bind:this={glowLineRef}
      class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-60"
    ></div>

    <!-- Ambient Glow (Background Spot - Lighter) -->
    <div
      bind:this={glowSpotRef}
      class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-20 bg-cyan-400/10 blur-[60px] rounded-full pointer-events-none"
    ></div>

    <div
      class="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-3"
    >
      <!-- LEFT: LOGO & BRAND -->
      <div class="logo"><Logo {isLoadingLibrary} {handleLogoClick} tracksLength={library.tracks.length} /></div>

      <!-- CENTER: SEARCH BAR (Desktop) -->
      <div class="search"><SearchBar {searchQuery} {isSearchFocused} onSearchQueryChange={handleSearchQueryChange} onSearchFocus={handleSearchFocus} onSearchBlur={handleSearchBlur} /></div>

      <!-- RIGHT: NAVIGATION (Desktop) -->
      <div class="links"><NavLinks bind:linksContainerRef /></div>

      <!-- MOBILE TOGGLE -->
      <div class="toggle"><MobileToggle {isMobileMenuOpen} {toggleMobileMenu} bind:menuButtonRef /></div>
    </div>

    <!-- MOBILE MENU (Collapsible) -->
    <MobileMenu {isMobileMenuOpen} {toggleMobileMenu} bind:mobileMenuRef />
  </nav>
</div>


