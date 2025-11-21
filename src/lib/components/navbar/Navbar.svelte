<script lang="ts">
  import { onMount } from 'svelte';
  import { Music, Home, Library, ListMusic } from 'lucide-svelte';
  import { uiStore, setupNavbarAutoHide, cleanupNavbarAutoHide } from '$lib/stores/ui.store';
  import NavbarSearch from './NavbarSearch.svelte';
  import NavbarLink from './NavbarLink.svelte';

  let { links = [], logo: Logo = Music, title = "Music Player", searchPlaceholder = "Buscar canciones, artistas o álbumes..." } = $props<{
    links?: Array<{ href: string; icon: any; label: string; active?: boolean }>;
    logo?: any;
    title?: string;
    searchPlaceholder?: string;
  }>();

  let navElement: HTMLElement;

  onMount(() => {
    setupNavbarAutoHide(navElement, 150);
    return cleanupNavbarAutoHide;
  });

  // Default links if none provided
  if (links.length === 0) {
    links = [
      { href: "/", icon: Home, label: "Home", active: true },
      { href: "/library", icon: Library, label: "Library" },
      { href: "/playlists", icon: ListMusic, label: "Playlists" }
    ];
  }
</script>

<div class="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none">
  <nav
    bind:this={navElement}
    class="w-[85%] backdrop-blur-xl bg-white/10 border border-sky-400/30 
           rounded-2xl shadow-lg shadow-cyan-500/20 pointer-events-auto
           transition-all duration-500 ease-out
           {uiStore.navbarHidden ? 'scale-[0.92] opacity-55 -translate-y-8' : 'scale-100 opacity-100 translate-y-0'}"
  >
    <div class="flex items-center justify-between px-6 py-4">

      <!-- Logo y Título -->
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500
                    flex items-center justify-center shadow-lg shadow-cyan-500/40
                    transition-all duration-500
                    {uiStore.navbarHidden ? 'scale-90' : 'scale-100'}">
          <Logo class="w-7 h-7 text-white" />
        </div>
        <h1 class="text-2xl font-bold text-white/95 transition-opacity duration-500
                   {uiStore.navbarHidden ? 'opacity-70' : 'opacity-100'}">
          {title}
        </h1>
      </div>

      <!-- Barra de Búsqueda -->
      <NavbarSearch placeholder={searchPlaceholder} />

      <!-- Navegación -->
      <div class="flex items-center gap-2">
        {#each links as link}
          <NavbarLink
            href={link.href}
            icon={link.icon}
            label={link.label}
            active={link.active}
            isHidden={uiStore.navbarHidden}
          />
        {/each}
      </div>

    </div>
  </nav>
</div>