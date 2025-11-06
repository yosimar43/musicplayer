<script lang="ts">
  interface Props {
    title: string | null;
    artist: string | null;
    album?: string | null;
    isCurrentTrack: boolean;
  }
  
  let { title, artist, album, isCurrentTrack }: Props = $props();
</script>

<div class="flex-1 min-w-0">
  <h3 class="text-white font-medium truncate group-hover:text-purple-300 transition-colors duration-200 {isCurrentTrack ? 'text-purple-400' : ''}">
    {title || 'Título desconocido'}
  </h3>
  <div class="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
    <span class="truncate">{artist || 'Artista desconocido'}</span>
    {#if album}
      <span class="text-gray-600">•</span>
      <span class="truncate shrink-0 max-w-[200px]">{album}</span>
    {/if}
  </div>
</div>
