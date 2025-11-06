<script lang="ts">
  import { page } from '$app/stores';
  import { Button } from "$lib/components/ui/button";
  import { Home, Music, TestTube, ListMusic } from "lucide-svelte";

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/library', label: 'Library', icon: Music },
    { path: '/playlists', label: 'Playlists', icon: ListMusic },
    { path: '/test', label: 'Test', icon: TestTube },
  ];

  let currentPath = $derived($page.url.pathname);
</script>

<nav class="bg-black/30 backdrop-blur-md border-b border-white/10">
  <div class="container mx-auto px-4">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <span class="text-white text-xl font-bold">♪</span>
        </div>
        <h1 class="text-xl font-bold text-white">Music Player</h1>
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
                ? "bg-white/20 text-white hover:bg-white/30" 
                : "text-gray-300 hover:text-white hover:bg-white/10"}
            >
              <Icon size={18} class="mr-2" />
              {item.label}
            </Button>
          </a>
        {/each}
      </div>
    </div>
  </div>
</nav>
