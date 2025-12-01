<script lang="ts">
  import { enrichmentStore } from '@/lib/stores/enrichment.store.svelte';
  import { Progress } from '@/lib/components/ui/progress';
  import { Card, CardContent, CardHeader, CardTitle } from '@/lib/components/ui/card';
</script>

{#if enrichmentStore.isEnriching}
  <Card class="fixed bottom-4 right-4 w-80 z-50 shadow-lg border-sky-200 bg-slate-900/95 backdrop-blur-sm">
    <CardHeader class="pb-2">
      <CardTitle class="text-sm font-semibold text-sky-300 flex items-center gap-2">
        <div class="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
        Enriqueciendo con Last.fm
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div class="space-y-2">
        <Progress value={enrichmentStore.percentComplete} class="h-2" />
        <p class="text-xs font-normal text-slate-400">
          {enrichmentStore.progress.current} de {enrichmentStore.progress.total} canciones
        </p>
        {#if enrichmentStore.currentTrack}
          <p class="text-xs font-medium text-sky-400 truncate">
            🎵 {enrichmentStore.currentTrack}
          </p>
        {:else}
          <p class="text-xs font-light text-sky-400/80 animate-pulse">
            Obteniendo imágenes, artistas y metadatos...
          </p>
        {/if}
      </div>
    </CardContent>
  </Card>
{/if}
