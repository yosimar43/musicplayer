<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { invoke } from '@tauri-apps/api/core';
  import { Button } from "$lib/components/ui/button";
  import { Home, Music, ListMusic, User, LogOut, Loader2 } from "lucide-svelte";

  interface SpotifyUserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    country: string | null;
    product: string | null;
    followers: number;
    images: string[];
  }

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/library', label: 'Library', icon: Music },
    { path: '/playlists', label: 'Playlists', icon: ListMusic },
    { path: '/spotify', label: 'Spotify', icon: Music },
  ];

  let currentPath = $derived($page.url.pathname);
  let isAuthenticated = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let isLoading = $state(false);

  onMount(async () => {
    await checkSpotifyAuth();
  });

  async function checkSpotifyAuth() {
    try {
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      if (isAuthenticated) {
        profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
      }
    } catch (err) {
      console.error('Error checking Spotify auth:', err);
    }
  }

  async function handleSpotifyLogout() {
    isLoading = true;
    try {
      await invoke('spotify_logout');
      isAuthenticated = false;
      profile = null;
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      isLoading = false;
    }
  }
</script>

<nav class="sticky top-0 bg-black/40 backdrop-blur-xl border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10 z-50">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-linear-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-cyan-500/50 animate-pulse-slow">
          <span class="text-white text-xl font-bold">♪</span>
        </div>
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-300 to-blue-300">Music Player</h1>
      </div>

      <!-- Navigation Links -->
      <div class="flex items-center gap-2">
        {#each navItems as item}
          {@const Icon = item.icon}
          <a href={item.path}>
            <Button
              variant={currentPath === item.path ? "default" : "ghost"}
              size="sm"
              class={currentPath === item.path 
                ? "bg-linear-to-r from-cyan-500/30 to-blue-500/30 text-white hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/30 shadow-lg shadow-cyan-500/20" 
                : "text-cyan-200/60 hover:text-white hover:bg-cyan-500/10 border border-transparent"}
            >
              <Icon size={18} class="mr-2" />
              {item.label}
            </Button>
          </a>
        {/each}

        <!-- Spotify User Profile -->
        {#if isAuthenticated && profile}
          <div class="ml-4 flex items-center gap-3 pl-4 border-l border-white/20">
            <!-- Profile Info -->
            <a href="/spotify" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {#if profile.images && profile.images[0]}
                <img 
                  src={profile.images[0]} 
                  alt={profile.display_name || 'Profile'} 
                  class="w-8 h-8 rounded-full border-2 border-green-500 shadow-lg"
                />
              {:else}
                <div class="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-green-700 flex items-center justify-center border-2 border-green-400">
                  <User size={16} class="text-white" />
                </div>
              {/if}
              <div class="flex flex-col">
                <span class="text-sm font-medium text-white leading-tight">
                  {profile.display_name || 'Usuario'}
                </span>
                {#if profile.product}
                  <span class="text-xs text-green-400 leading-tight">
                    {profile.product}
                  </span>
                {/if}
              </div>
            </a>

            <!-- Logout Button -->
            <Button
              variant="ghost"
              size="sm"
              onclick={handleSpotifyLogout}
              disabled={isLoading}
              class="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              title="Cerrar sesión de Spotify"
            >
              {#if isLoading}
                <Loader2 size={16} class="animate-spin" />
              {:else}
                <LogOut size={16} />
              {/if}
            </Button>
          </div>
        {:else if !isAuthenticated}
          <!-- Connect to Spotify Button -->
          <a href="/spotify" class="ml-4 pl-4 border-l border-white/20">
            <Button
              variant="ghost"
              size="sm"
              class="text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/30"
            >
              <Music size={16} class="mr-2" />
              Conectar Spotify
            </Button>
          </a>
        {/if}
      </div>
    </div>
  </div>
</nav>

<style>
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }
</style>
