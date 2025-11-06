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
  <h3 class="text-sky-50 text-base md:text-lg font-semibold truncate group-hover:text-cyan-300 transition-colors duration-200 {isCurrentTrack ? 'text-cyan-300' : ''}">
    {title || 'Título desconocido'}
  </h3>
  <div class="flex items-center gap-2 text-xs md:text-sm text-sky-300 group-hover:text-sky-200 transition-colors">
    <span class="truncate">{artist || 'Artista desconocido'}</span>
    {#if album}
      <span class="text-sky-600">•</span>
      <span class="truncate shrink-0 max-w-[200px]">{album}</span>
    {/if}
  </div>
</div>
