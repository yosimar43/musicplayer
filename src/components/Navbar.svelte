<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Button } from "$lib/components/ui/button";
  import { Home, Music, ListMusic, User, LogOut, Loader2, Search, Sparkles } from "lucide-svelte";
  import { search } from '@/lib/state/search.svelte';
  import { fadeIn, slideInLeft, scaleIn } from '@/lib/animations';
  import { useSpotifyAuth } from '@/lib/hooks';

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/library', label: 'Library', icon: Music },
    { path: '/playlists', label: 'Playlists', icon: ListMusic },
  ];

  // ✅ Hook de autenticación Spotify (reemplaza 50+ líneas)
  const auth = useSpotifyAuth();

  let currentPath = $derived($page.url.pathname);
  let showSearch = $state(false);

  onMount(async () => {
    // Verificar autenticación al cargar
    await auth.checkAuth();
    
    // Animaciones de entrada
    fadeIn('.nav-logo');
    slideInLeft('.nav-item');
    scaleIn('.search-bar');
  });

  async function handleSpotifyLogout() {
    await auth.logout();
  }
</script>

<nav class="sticky top-0 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl z-50">
  <div class="container mx-auto px-6">
    <div class="flex items-center justify-between gap-6 h-20">
      <!-- 🎵 Logo Animado -->
      <div class="nav-logo flex items-center gap-4 shrink-0 group">
        <div class="relative">
          <div class="absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-all duration-500" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
          <div class="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);">
            <Sparkles size={24} class="text-white drop-shadow-lg" strokeWidth={2.5} />
          </div>
        </div>
        <h1 class="text-2xl font-bold bg-clip-text text-transparent drop-shadow-sm tracking-wide" style="background-image: linear-gradient(to right, #67e8f9, #93c5fd, #67e8f9);">
          Music Player
        </h1>
      </div>

      <!-- 🔍 Search Bar con Glassmorphism -->
      <div class="search-bar flex-1 max-w-2xl mx-6">
        <div class="relative">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={18} class="text-cyan-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar canciones, artistas o álbumes..."
            bind:value={search.query}
            onfocus={() => showSearch = true}
            onblur={() => setTimeout(() => showSearch = false, 200)}
            class="w-full h-12 pl-12 pr-12 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white placeholder:text-slate-300 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 focus:shadow-lg focus:shadow-cyan-500/20 transition-all text-base font-medium"
          />
          {#if search.query}
            <button
              onclick={() => search.clear()}
              class="absolute inset-y-0 right-4 flex items-center text-cyan-300 hover:text-white transition-all hover:scale-110"
            >
              <span class="text-lg font-bold">✕</span>
            </button>
          {/if}
        </div>
        
        <!-- Dropdown de Resultados Glassmorphism -->
        {#if showSearch && search.query}
          <div class="absolute mt-3 w-full max-w-2xl backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 max-h-96 overflow-y-auto">
            <p class="text-slate-300 text-sm text-center">
              Buscando: <span class="font-bold text-cyan-300 text-lg">"{search.query}"</span>
            </p>
          </div>
        {/if}
      </div>

      <!-- 🧭 Navigation Links con Animación -->
      <div class="flex items-center gap-3 shrink-0">
        {#each navItems as item, index}
          {@const Icon = item.icon}
          <a href={item.path} class="nav-item" style="animation-delay: {index * 0.1}s">
            <Button
              variant={currentPath === item.path ? "default" : "ghost"}
              size="sm"
              class={currentPath === item.path 
                ? "text-white border border-cyan-400/30 shadow-xl shadow-cyan-500/30 backdrop-blur-lg px-5 py-2 h-auto" 
                : "text-slate-300 hover:text-white hover:bg-white/10 border border-transparent backdrop-blur-sm px-5 py-2 h-auto"}
              style={currentPath === item.path ? "background: linear-gradient(to right, rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3));" : ""}
            >
              <Icon size={20} class="mr-2" />
              <span class="font-semibold">{item.label}</span>
            </Button>
          </a>
        {/each}

        <!-- 👤 Spotify User Profile con Glassmorphism -->
        {#if auth.isAuthenticated && auth.profile}
          <div class="ml-6 flex items-center gap-4 pl-6 border-l border-white/20">
            <!-- Profile Card -->
            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl px-4 py-2 shadow-lg hover:bg-white/15 transition-all">
              {#if auth.profile.images && auth.profile.images[0]}
                <img 
                  src={auth.profile.images[0]} 
                  alt={auth.profile.display_name || 'Profile'} 
                  class="w-10 h-10 rounded-full border-2 border-green-400 shadow-lg shadow-green-500/50"
                />
              {:else}
                <div class="w-10 h-10 rounded-full flex items-center justify-center border-2 border-green-300 shadow-lg" style="background: linear-gradient(to bottom right, #4ade80, #16a34a);">
                  <User size={20} class="text-white" />
                </div>
              {/if}
              <div class="flex flex-col">
              
                {#if auth.profile.product}
                  <span class="text-xs text-green-400 font-semibold leading-tight uppercase tracking-wide">
                    {auth.profile.product}
                  </span>
                {/if}
              </div>
            </div>

            <!-- Logout Button Glassmorphism -->
            <Button
              variant="ghost"
              size="sm"
              onclick={handleSpotifyLogout}
              disabled={auth.isLoading}
              class="text-slate-300 hover:text-red-400 hover:bg-red-500/20 backdrop-blur-sm px-4 py-2 h-auto rounded-xl border border-transparent hover:border-red-400/30 transition-all"
              title="Cerrar sesión de Spotify"
            >
              {#if auth.isLoading}
                <Loader2 size={18} class="animate-spin" />
              {:else}
                <LogOut size={18} />
              {/if}
            </Button>
          </div>
        {/if}
      </div>
    </div>
  </div>
</nav>

<style>
  /* 🎨 Animaciones de Navbar */
  
  /* Logo Pulse Suave */
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
      filter: drop-shadow(0 0 15px rgba(34, 211, 238, 0.5));
    }
    50% {
      opacity: 0.9;
      transform: scale(1.05);
      filter: drop-shadow(0 0 25px rgba(34, 211, 238, 0.8));
    }
  }

  .nav-logo {
    animation: pulse-glow 4s ease-in-out infinite;
  }

  /* Nav Items Fade In */
  .nav-item {
    opacity: 0;
    animation: fadeInSlide 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Search Bar Focus Effect */
  .search-bar input:focus {
    animation: searchPulse 0.3s ease-out;
  }

  @keyframes searchPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
    }
  }

  /* Glassmorphism Enhancement */
  nav {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 100%
    );
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  /* Button Hover Effects */
  nav :global(button) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  nav :global(button:not(:disabled):hover) {
    transform: translateY(-2px);
  }

  nav :global(button:not(:disabled):active) {
    transform: translateY(0);
  }
</style>