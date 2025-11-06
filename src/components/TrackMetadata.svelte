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
      class="hidden sm:inline-flex bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30 transition-colors"
    >
      {genre}
    </Badge>
  {/if}
  
  {#if year}
    <Badge 
      variant="outline" 
      class="hidden md:inline-flex text-gray-400 border-gray-600 hover:border-gray-500 transition-colors tabular-nums"
    >
      <Calendar size={12} class="mr-1" />
      {year}
    </Badge>
  {/if}
  
  <div class="flex items-center gap-1.5 text-gray-400 text-sm tabular-nums min-w-[60px] justify-end group-hover:text-gray-300 transition-colors">
    <Clock size={14} class="text-gray-500" />
    <span class="font-medium">{formatDuration(duration)}</span>
  </div>
</div>
