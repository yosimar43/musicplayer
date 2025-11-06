<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Heart, ListPlus, Share2, MoreVertical } from 'lucide-svelte';
  
  interface Props {
    trackPath: string;
  }
  
  let { trackPath }: Props = $props();
  
  let isFavorite = $state(false);
  
  function toggleFavorite(event: MouseEvent) {
    event.stopPropagation();
    isFavorite = !isFavorite;
  }
  
  function addToPlaylist(event: MouseEvent) {
    event.stopPropagation();
    // TODO: Implementar agregar a playlist
  }
  
  function share(event: MouseEvent) {
    event.stopPropagation();
    // TODO: Implementar compartir
  }
  
  function showMore(event: MouseEvent) {
    event.stopPropagation();
    // TODO: Implementar menú de más opciones
  }
</script>

<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
  <Button
    variant="ghost"
    size="icon"
    class="h-7 w-7 text-sky-300 hover:text-red-400 hover:bg-red-500/20 transition-all"
    onclick={toggleFavorite}
    title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
  >
    <Heart size={14} class={isFavorite ? "fill-red-400 text-red-400" : ""} />
  </Button>

  <Button
    variant="ghost"
    size="icon"
    class="h-7 w-7 text-sky-300 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
    onclick={addToPlaylist}
    title="Agregar a playlist"
  >
    <ListPlus size={14} />
  </Button>

  <Button
    variant="ghost"
    size="icon"
    class="h-7 w-7 text-sky-300 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
    onclick={share}
    title="Compartir"
  >
    <Share2 size={14} />
  </Button>

  <Button
    variant="ghost"
    size="icon"
    class="h-7 w-7 text-sky-300 hover:text-sky-50 hover:bg-white/10 transition-all"
    onclick={showMore}
    title="Más opciones"
  >
    <MoreVertical size={14} />
  </Button>
</div>
