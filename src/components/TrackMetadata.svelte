<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Clock, Calendar } from 'lucide-svelte';
  
  interface Props {
    genre?: string | null;
    year?: number | null;
    duration: number | null;
  }
  
  let { genre, year, duration }: Props = $props();
  
  function formatDuration(seconds: number | null): string {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="flex items-center gap-2 shrink-0">
  {#if genre}
    <Badge 
      variant="secondary" 
      class="hidden sm:inline-flex bg-cyan-500/30 text-cyan-200 border-cyan-400/40 hover:bg-cyan-500/40 transition-colors shadow-lg shadow-cyan-500/20"
    >
      {genre}
    </Badge>
  {/if}
  
  {#if year}
    <Badge 
      variant="outline" 
      class="hidden md:inline-flex text-blue-200 border-blue-400/40 hover:border-blue-400/60 transition-colors tabular-nums bg-blue-500/10"
    >
      <Calendar size={12} class="mr-1" />
      {year}
    </Badge>
  {/if}
  
  <div class="flex items-center gap-1.5 text-sky-300 text-sm tabular-nums min-w-[60px] justify-end group-hover:text-sky-200 transition-colors">
    <Clock size={14} class="text-sky-400" />
    <span class="font-medium">{formatDuration(duration)}</span>
  </div>
</div>
