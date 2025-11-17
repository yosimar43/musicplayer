<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Home, Music, ListMusic, User, LogOut, Loader2, Search, Sparkles } from "lucide-svelte";
  import { search } from '@/lib/state/search.svelte';
  import { fadeIn, slideInLeft, scaleIn } from '@/lib/animations';
  import { useSpotifyAuth } from '@/lib/hooks';
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
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

<nav class="w-full border-b shadow-2xl backdrop-blur-xl bg-sky-950/95 border-sky-800/50">
  <div class="container px-6 mx-auto">
    <div class="flex items-center justify-between h-16 gap-6">
      <!-- 🎵 Logo Animado -->
      <div class="flex items-center gap-4 nav-logo shrink-0 group">
        <div class="relative">
          <div class="absolute inset-0 transition-all duration-500 rounded-2xl blur-xl opacity-60 group-hover:opacity-100" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
          <div class="relative flex items-center justify-center w-12 h-12 transition-all duration-500 transform shadow-2xl rounded-2xl shadow-cyan-500/50 group-hover:rotate-6 group-hover:scale-110" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);">
            <Sparkles size={24} class="text-white drop-shadow-lg" strokeWidth={2.5} />
          </div>
        </div>
        <h1 class="text-2xl font-bold tracking-wide text-transparent bg-clip-text drop-shadow-sm" style="background-image: linear-gradient(to right, #67e8f9, #93c5fd, #67e8f9);">
          Music Player
        </h1>
      </div>

      <!-- 🔍 Search Bar con Glassmorphism -->
      <div class="flex-1 max-w-2xl mx-6 search-bar">
        <div class="relative">
          <div class="absolute inset-y-0 flex items-center pointer-events-none left-4">
            <Search size={18} class="text-cyan-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar canciones, artistas o álbumes..."
            bind:value={search.query}
            onfocus={() => showSearch = true}
            onblur={() => setTimeout(() => showSearch = false, 200)}
            class="w-full h-12 pl-12 pr-12 text-base font-medium text-white transition-all border bg-white/10 backdrop-blur-lg border-white/20 rounded-xl placeholder:text-slate-300 focus:outline-none focus:border-cyan-400/50 focus:bg-white/15 focus:shadow-lg focus:shadow-cyan-500/20"
          />
          {#if search.query}
            <button
              onclick={() => search.clear()}
              class="absolute inset-y-0 flex items-center transition-all right-4 text-cyan-300 hover:text-white hover:scale-110"
            >
              <span class="text-lg font-bold">✕</span>
            </button>
          {/if}
        </div>
        
        

        <!-- 👤 Spotify User Profile con Glassmorphism -->
        
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