<script lang="ts">
  import { Search } from 'lucide-svelte';

  let { placeholder = "Buscar...", value = $bindable(""), oninput, onfocus, onblur } = $props<{
    placeholder?: string;
    value?: string;
    oninput?: (event: Event) => void;
    onfocus?: (event: FocusEvent) => void;
    onblur?: (event: FocusEvent) => void;
  }>();
</script>

<div class="flex-1 max-w-2xl mx-8">
  <div class="relative">
    <input
      type="text"
      {placeholder}
      bind:value
      {oninput}
      {onfocus}
      {onblur}
      class="w-full px-6 py-3 pl-12 rounded-xl
             bg-slate-900/50 backdrop-blur-md
             border border-sky-400/20
             text-slate-200 placeholder-slate-400
             focus:outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30
             transition-all duration-300"
    />
    <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400/70" />
  </div>
</div>
