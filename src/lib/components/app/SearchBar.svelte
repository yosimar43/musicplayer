<script lang="ts">
  import { Search, X } from "lucide-svelte";
  import { cn } from "$lib/utils";

  let { searchQuery, isSearchFocused, onSearchQueryChange, onSearchFocus, onSearchBlur } = $props();
</script>

<!-- CENTER: SEARCH BAR (Desktop) -->
<div class="hidden md:flex flex-1 max-w-xl mx-8">
  <div class="relative w-full group/search">
    <!-- Focus Glow -->
    <div
      class={cn(
        "absolute -inset-0.5 bg-linear-to-r from-cyan-400/40 to-blue-400/40 rounded-xl blur opacity-0 transition duration-500",
        isSearchFocused ? "opacity-100" : "group-hover/search:opacity-50",
      )}
    ></div>

    <div
      class={cn(
        "relative flex items-center bg-white/1 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden transition-all duration-300",
        isSearchFocused
          ? "bg-white/2 border-white/10 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
          : "hover:bg-white/2 hover:border-white/10",
      )}
    >
      <Search
        class={cn(
          "w-4 h-4 ml-4 mr-2 transition-colors",
          isSearchFocused ? "text-cyan-300" : "text-slate-300",
        )}
      />
      <input
        type="text"
        bind:value={searchQuery}
        onfocus={onSearchFocus}
        onblur={onSearchBlur}
        placeholder="Buscar canciones, artistas..."
        class="w-full py-2.5 bg-transparent text-sm font-normal text-slate-100 placeholder:font-light placeholder:text-slate-400/80 focus:outline-none border-none ring-0 focus:ring-0"
      />
      {#if searchQuery}
        <button
          onclick={() => onSearchQueryChange("")}
          class="p-2 text-slate-300 hover:text-white"
        >
          <X class="w-3 h-3" />
        </button>
      {/if}
    </div>
  </div>
</div>