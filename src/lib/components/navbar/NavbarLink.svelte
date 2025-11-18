<script lang="ts">
  import type { Component } from 'svelte';

  let { href, icon: Icon, label, active = false, isHidden = false } = $props<{
    href: string;
    icon: Component;
    label: string;
    active?: boolean;
    isHidden?: boolean;
  }>();
</script>

<a
  {href}
  class="flex items-center gap-2 px-6 py-2.5 rounded-xl
         text-slate-200 font-medium
         hover:bg-white/10 hover:text-white
         transition-all duration-300
         {active ? 'bg-sky-500/20 border border-sky-400/30 text-white/95 hover:bg-sky-500/30 hover:border-sky-400/50' : ''}"
>
  <Icon class="w-5 h-5" />
  <span class="transition-opacity duration-500 {isHidden ? 'opacity-70' : 'opacity-100'}">
    {label}
  </span>
</a>