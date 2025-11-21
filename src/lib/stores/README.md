# 🏪 Arquitectura de Stores Reactivos

## 🎯 Patrón de Estado

Este proyecto usa **stores reactivos tipados** para una arquitectura robusta y mantenible. Cada store maneja un dominio específico con tipos estrictos y reactivity automática.

## 📁 Estructura de Stores

```
src/lib/stores/
├── enrichment.store.ts  # Progreso de enriquecimiento Last.fm
├── library.store.ts     # Biblioteca de música local
├── musicData.store.ts   # Cache de datos Last.fm
├── index.ts            # Barrel exports
└── README.md           # Esta documentación
```

## 🚀 Ventajas de Stores Reactivos

### ✅ Type Safety Completo
```typescript
// Store con tipos estrictos
enrichmentStore.startEnrichment(150);
```

### ✅ Reactivity Automática
```svelte
<!-- Los componentes se actualizan automáticamente -->
{#if enrichmentStore.isEnriching}
  <Progress value={enrichmentStore.percentComplete} />
{/if}
```

### ✅ Mejor Performance
- Solo componentes suscritos se actualizan
- No hay overhead de event listeners
- Menos código boilerplate

### ✅ Fácil Debugging
- Cambios de estado son rastreables
- Estado centralizado por dominio

## 📖 Uso en Componentes

### Importación
```typescript
import { enrichmentStore, libraryStore, musicDataStore } from '@/lib/stores';
```

### En Componentes Svelte
```svelte
<script lang="ts">
  import { enrichmentStore } from '@/lib/stores';
</script>

<!-- Reactivity automática -->
{#if enrichmentStore.isEnriching}
  <div class="progress">
    <Progress value={enrichmentStore.percentComplete} />
    <p>Enriqueciendo: {enrichmentStore.currentTrack}</p>
  </div>
{/if}
```

### En Hooks Personalizados
```typescript
import { enrichmentStore } from '@/lib/stores';

export function useEnrichment() {
  // Acceso directo al store
  return {
    isEnriching: $derived(enrichmentStore.isEnriching),
    progress: $derived(enrichmentStore.progress),
    startEnrichment: enrichmentStore.startEnrichment.bind(enrichmentStore),
    completeEnrichment: enrichmentStore.completeEnrichment.bind(enrichmentStore)
  };
}
```

## 🏪 Stores Disponibles

### `enrichmentStore` - Estado de Enriquecimiento Last.fm
```typescript
interface EnrichmentStore {
  // Estado
  isEnriching: boolean;
  progress: { current: number; total: number; currentTrack?: string };
  enrichedTracks: Map<string, MusicFile>;
  error: string | null;

  // Derivados
  isComplete: boolean;
  percentComplete: number;
  currentTrack: string | undefined;

  // Métodos
  startEnrichment(totalTracks: number): void;
  updateProgress(current: number, currentTrack?: string): void;
  completeEnrichment(totalEnriched: number): void;
  setError(errorMessage: string): void;
  finishEnrichment(): void;
  reset(): void;
}
```

## 🔧 Servicios de Enriquecimiento

### `EnrichmentService` - Lógica de Enriquecimiento

```typescript
class EnrichmentService {
  // Métodos estáticos
  static async enrichTracksBatch(tracks: MusicFile[]): Promise<void>;
  static isAvailable(): boolean;
  static getEnrichmentState(): { isEnriching: boolean; progress: any; error: string | null };
  static isEnriching(): boolean;
  static getProgress(): { current: number; total: number; currentTrack?: string };
  static getEnrichedTrack(artist: string, title: string): MusicFile | undefined;
}
```

**Propósito**: Separa la lógica de enriquecimiento del store de biblioteca, manteniendo responsabilidades claras.

**Uso**:

```typescript
import { EnrichmentService } from '@/lib/services/enrichment.service';

// Enriquecer tracks
await EnrichmentService.enrichTracksBatch(tracks);

// Verificar estado
if (EnrichmentService.isEnriching()) {
  const progress = EnrichmentService.getProgress();
  console.log(`Progreso: ${progress.current}/${progress.total}`);
}
```

### `libraryStore` - Biblioteca Local
```typescript
interface LibraryStore {
  // Estado
  tracks: MusicFile[];
  isLoading: boolean;
  error: string | null;
  currentFolder: string;

  // Derivados
  totalTracks: number;
  totalDuration: number;
  artists: string[];
  albums: string[];

  // Métodos
  loadLibrary(folderPath?: string, enrichWithLastFm?: boolean): Promise<MusicFile[]>;
  reload(enrichWithLastFm?: boolean): Promise<void>;
}
```

### `musicDataStore` - Cache Last.fm
```typescript
interface MusicDataStore {
  // Estado
  trackCache: Map<string, LastFmTrack>;
  albumCache: Map<string, LastFmAlbum>;
  artistCache: Map<string, LastFmArtist>;

  // Métodos
  getCachedTrack(artist: string, title: string): LastFmTrack | undefined;
  setCachedTrack(artist: string, title: string, data: LastFmTrack): void;
  getCachedAlbum(artist: string, album: string): LastFmAlbum | undefined;
  setCachedAlbum(artist: string, album: string, data: LastFmAlbum): void;
}
```

## 🔧 Patrones Recomendados

### 1. Un Store por Dominio
Cada store debe manejar una responsabilidad específica:
- `enrichmentStore` → Progreso de enriquecimiento
- `libraryStore` → Gestión de biblioteca local
- `musicDataStore` → Cache de datos externos

### 2. Tipos Estrictos
```typescript
// ✅ Bueno: Interfaces específicas
interface EnrichmentProgress {
  current: number;
  total: number;
  currentTrack?: string;
}

// ❌ Malo: Tipos genéricos
interface Progress {
  current: any;
  total: any;
  currentTrack?: any;
}
```

### 3. Estado Derivado
```typescript
// ✅ Usar $derived para valores computados
percentComplete = $derived(
  this.progress.total > 0 ? Math.round((this.progress.current / this.progress.total) * 100) : 0
);

// ❌ No recalcular manualmente
get percentComplete() {
  return this.progress.total > 0 ? Math.round((this.progress.current / this.progress.total) * 100) : 0;
}
```

### 4. Batch Updates
```typescript
// ✅ Usar untrack() para múltiples cambios
startEnrichment(totalTracks: number) {
  untrack(() => {
    this.isEnriching = true;
    this.progress = { current: 0, total: totalTracks };
    this.enrichedTracks.clear();
    this.error = null;
  });
}
```

## 🧪 Testing

### Testing Stores
```typescript
import { enrichmentStore } from '@/lib/stores';

describe('enrichmentStore', () => {
  beforeEach(() => {
    enrichmentStore.reset();
  });

  it('should start enrichment', () => {
    enrichmentStore.startEnrichment(100);
    expect(enrichmentStore.isEnriching).toBe(true);
    expect(enrichmentStore.progress.total).toBe(100);
  });
});
```

### Testing Componentes con Stores
```typescript
import { render } from '@testing-library/svelte';
import { enrichmentStore } from '@/lib/stores';

it('shows progress when enriching', async () => {
  enrichmentStore.startEnrichment(50);

  const { getByRole } = render(EnrichmentProgress);
  const progress = getByRole('progressbar');

  expect(progress).toHaveAttribute('value', '0');
});
```

## 📚 Recursos Adicionales

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/runes)
- [Reactive Stores Pattern](https://svelte.dev/tutorial/reactive-statements)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Suscripción Reactiva
```svelte
<script>
  // Los stores son reactivos automáticamente
  $: tracks = libraryStore.tracks;
  $: isLoading = libraryStore.isLoading;
</script>

{#if libraryStore.isLoading}
  <p>Cargando biblioteca...</p>
{:else}
  <ul>
    {#each libraryStore.tracks as track}
      <li>{track.title} - {track.artist}</li>
    {/each}
  </ul>
{/if}
```

### Acciones
```typescript
// Llamar métodos del store
await libraryStore.loadLibrary('/music', true);
enrichmentStore.startEnrichment(100);
```

## 🎵 Stores Disponibles

### `enrichmentStore`
- **Propósito**: Gestionar progreso de enriquecimiento Last.fm
- **Estado**: `isEnriching`, `progress`, `currentTrack`, `error`
- **Acciones**: `startEnrichment()`, `updateProgress()`, `completeEnrichment()`

### `libraryStore`
- **Propósito**: Gestionar biblioteca de música local
- **Estado**: `tracks`, `isLoading`, `error`, `currentFolder`, estadísticas
- **Acciones**: `loadLibrary()`, `reload()`, `getTrackMetadata()`

### `musicDataStore`
- **Propósito**: Cache de datos Last.fm
- **Estado**: `loading`, `errors`, `cache`
- **Acciones**: `getArtist()`, `getAlbum()`, `getTrack()`, `clearCache()`
