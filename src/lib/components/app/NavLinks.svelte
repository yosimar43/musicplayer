<script lang="ts">
  import { Home, Library, ListMusic } from "lucide-svelte";
  import { page } from "$app/stores";

  let { linksContainerRef = $bindable() } = $props();
</script>

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
        class="relative flex items-center gap-2 text-sm z-10"
        class:font-semibold={isActive}
        class:font-medium={!isActive}
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