<script lang="ts">
  import { Search, Home, Library, ListMusic } from "lucide-svelte";
  import { page } from "$app/stores";

  let { isMobileMenuOpen, toggleMobileMenu, mobileMenuRef = $bindable() } = $props();
</script>

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
        onclick={() => toggleMobileMenu(true)}
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