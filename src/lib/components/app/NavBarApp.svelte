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

  // --- STATE ---
  let navRef: HTMLElement;
  let logoRef: HTMLElement;
  let searchRef: HTMLElement;
  let linksContainerRef: HTMLElement;
  let mobileMenuRef: HTMLElement;
  let menuButtonRef: HTMLElement;

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
      gsap.to(logoRef, {
        scale: 1.2,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "back.out(1.7)",
      });
    } catch (error) {
      console.error("❌ Error al cargar biblioteca:", error);
      // Error shake
      gsap.to(logoRef, { x: 5, duration: 0.1, repeat: 5, yoyo: true });
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

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  // --- LIFECYCLE ---
  onMount(() => {
    // Setup GSAP Context
    ctx = gsap.context(() => {
      // 1. Initial Entrance Timeline
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.set(navRef, { yPercent: -150, opacity: 0 })
        .to(navRef, {
          yPercent: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power4.out",
        })
        .from(
          [logoRef, searchRef, linksContainerRef?.children, menuButtonRef],
          {
            y: -20,
            opacity: 0,
            stagger: 0.08,
            duration: 0.8,
            clearProps: "opacity,transform", // Limpieza para interacciones posteriores
          },
          "-=0.8",
        );

      // 2. Reactor Idle Animation (Logo)
      // Core breathing
      gsap.to(".reactor-core", {
        scale: 1.05,
        boxShadow: "0 0 25px rgba(34, 211, 238, 0.6)",
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Ring rotation
      gsap.to(".reactor-ring", {
        rotation: 360,
        duration: 12,
        repeat: -1,
        ease: "none",
      });
    }, navRef);

    // Setup Auto-hide logic (trigger only, animation handled in effect)
    setupNavbarAutoHide(navRef, 100);

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
      gsap.to(navRef, {
        yPercent: 0, // Keep it on screen
        scale: 0.85,
        opacity: 0.6,
        backdropFilter: "blur(8px)",
        duration: 0.6,
        ease: "power4.inOut",
      });
    } else {
      // Full mode
      gsap.to(navRef, {
        yPercent: 0,
        scale: 1,
        opacity: 1,
        backdropFilter: "blur(24px)",
        duration: 0.6,
        ease: "power4.out",
      });
    }
  });

  // Watch Mobile Menu
  $effect(() => {
    if (!mobileMenuRef) return;

    if (isMobileMenuOpen) {
      gsap.to(mobileMenuRef, {
        height: "auto",
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
        display: "block",
      });
      gsap.from(mobileMenuRef.children, {
        y: -10,
        opacity: 0,
        stagger: 0.05,
        duration: 0.4,
        delay: 0.1,
      });
    } else {
      gsap.to(mobileMenuRef, {
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
      class="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-60"
    ></div>

    <!-- Ambient Glow (Background Spot - Lighter) -->
    <div
      class="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-20 bg-cyan-400/10 blur-[60px] rounded-full pointer-events-none"
    ></div>

    <div
      class="relative flex items-center justify-between px-4 py-3 md:px-6 md:py-3"
    >
      <!-- LEFT: LOGO & BRAND -->
      <div bind:this={logoRef} class="flex items-center gap-4">
        <button
          onclick={handleLogoClick}
          disabled={isLoadingLibrary}
          class="group/logo relative w-12 h-12 flex items-center justify-center focus:outline-none"
          aria-label="Cargar biblioteca"
        >
          <!-- Reactor Ring -->
          <div
            class="reactor-ring absolute inset-0 border-2 border-cyan-400/40 rounded-full border-t-cyan-300"
          ></div>

          <!-- Reactor Core -->
          <div
            class="reactor-core relative w-7 h-7 bg-gradient-to-br from-cyan-300 to-blue-500 rounded-full
                      shadow-[0_0_15px_rgba(34,211,238,0.6)] flex items-center justify-center z-10
                      group-hover/logo:scale-110 transition-transform duration-300"
          >
            {#if isLoadingLibrary}
              <div
                class="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin"
              ></div>
            {:else}
              <Music class="w-3.5 h-3.5 text-white drop-shadow-md" />
            {/if}
          </div>

          <!-- Hover Glow -->
          <div
            class="absolute inset-0 bg-cyan-400/30 rounded-full blur-md opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500"
          ></div>
        </button>

        <div class="flex flex-col">
          <h1
            class="text-lg font-bold text-white tracking-tight leading-none font-display drop-shadow-sm"
          >
            Music Player
          </h1>
          {#if library.tracks.length > 0}
            <span
              class="text-[10px] font-medium text-cyan-300/90 uppercase tracking-wider"
            >
              {library.tracks.length} Tracks
            </span>
          {/if}
        </div>
      </div>

      <!-- CENTER: SEARCH BAR (Desktop) -->
      <div bind:this={searchRef} class="hidden md:flex flex-1 max-w-xl mx-8">
        <div class="relative w-full group/search">
          <!-- Focus Glow -->
          <div
            class="absolute -inset-0.5 bg-gradient-to-r from-cyan-400/40 to-blue-400/40 rounded-xl blur opacity-0
                      {isSearchFocused
              ? 'opacity-100'
              : 'group-hover/search:opacity-50'} transition duration-500"
          ></div>

          <div
            class="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden transition-all duration-300
                      {isSearchFocused
              ? 'bg-white/15 border-cyan-400/40 ring-1 ring-cyan-400/30'
              : ''}"
          >
            <Search
              class="w-4 h-4 text-slate-300 ml-4 mr-2 {isSearchFocused
                ? 'text-cyan-300'
                : ''} transition-colors"
            />
            <input
              type="text"
              bind:value={searchQuery}
              onfocus={() => (isSearchFocused = true)}
              onblur={() => (isSearchFocused = false)}
              placeholder="Buscar..."
              class="w-full py-2.5 bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
            {#if searchQuery}
              <button
                onclick={() => (searchQuery = "")}
                class="p-2 text-slate-300 hover:text-white"
              >
                <X class="w-3 h-3" />
              </button>
            {/if}
          </div>
        </div>
      </div>

      <!-- RIGHT: NAVIGATION (Desktop) -->
      <div
        bind:this={linksContainerRef}
        class="hidden md:flex items-center gap-1"
      >
        {#each [{ href: "/", icon: Home, label: "Home" }, { href: "/library", icon: Library, label: "Library" }, { href: "/playlists", icon: ListMusic, label: "Playlists" }] as item}
          {@const isActive = $page.url.pathname === item.href}
          <a
            href={item.href}
            class="relative px-4 py-2 rounded-lg group/link overflow-hidden transition-all duration-300
                   {isActive
              ? 'text-white'
              : 'text-slate-400 hover:text-white'}"
          >
            <!-- Active/Hover Background -->
            <div
              class="absolute inset-0 bg-white/10 translate-y-full
                        {isActive
                ? 'translate-y-0 opacity-100'
                : 'group-hover/link:translate-y-0 opacity-0 group-hover/link:opacity-100'} 
                        transition-all duration-300 ease-out rounded-lg"
            ></div>

            <div
              class="relative flex items-center gap-2 text-sm font-medium z-10"
            >
              <item.icon
                class="w-4 h-4 {isActive
                  ? 'text-cyan-300'
                  : 'group-hover/link:text-cyan-300'} transition-colors duration-300"
              />
              <span>{item.label}</span>
            </div>

            <!-- Active Indicator (Dot) -->
            <div
              class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full
                        {isActive
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-0 group-hover/link:opacity-50 group-hover/link:scale-75'} 
                        transition-all duration-300"
            ></div>
          </a>
        {/each}
      </div>

      <!-- MOBILE TOGGLE -->
      <div class="md:hidden" bind:this={menuButtonRef}>
        <button
          onclick={toggleMobileMenu}
          class="p-2 text-slate-200 hover:text-white transition-colors relative"
        >
          {#if isMobileMenuOpen}
            <X class="w-6 h-6 animate-in fade-in zoom-in duration-200" />
          {:else}
            <Menu class="w-6 h-6 animate-in fade-in zoom-in duration-200" />
          {/if}
        </button>
      </div>
    </div>

    <!-- MOBILE MENU (Collapsible) -->
    <div
      bind:this={mobileMenuRef}
      class="hidden md:hidden border-t border-white/10 bg-slate-900/40"
    >
      <div class="p-4 space-y-2">
        <!-- Mobile Search -->
        <div class="relative mb-4">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar..."
            class="w-full py-2 pl-9 pr-4 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400/50"
          />
        </div>

        {#each [{ href: "/", icon: Home, label: "Home" }, { href: "/library", icon: Library, label: "Library" }, { href: "/playlists", icon: ListMusic, label: "Playlists" }] as item}
          {@const isActive = $page.url.pathname === item.href}
          <a
            href={item.href}
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-95
                   {isActive
              ? 'bg-white/10 text-white'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'}"
            onclick={() => (isMobileMenuOpen = false)}
          >
            <div
              class="p-2 rounded-lg {isActive
                ? 'text-cyan-300'
                : 'text-slate-400'}"
            >
              <item.icon class="w-4 h-4" />
            </div>
            <span class="font-medium">{item.label}</span>
          </a>
        {/each}
      </div>
    </div>
  </nav>
</div>

<style>
  /* Custom font support if needed, otherwise relying on Tailwind sans */
  .font-display {
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      "Open Sans",
      "Helvetica Neue",
      sans-serif;
  }
</style>
