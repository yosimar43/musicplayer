# Hooks Refactorización - Music Player

## 📚 Resumen

Se ha refactorizado la lógica de negocio de las páginas en **hooks reutilizables** siguiendo el patrón de Svelte 5 runes. Esto permite:

✅ **Separación de responsabilidades**: UI vs Lógica de negocio  
✅ **Reutilización**: Los hooks se pueden usar en cualquier componente  
✅ **Testeable**: Lógica independiente fácil de probar  
✅ **Mantenible**: Código más limpio y organizado  
✅ **Type-safe**: TypeScript completo con tipos exportados  

---

## 🎯 Hooks Disponibles

### 1. `useSpotifyAuth()`
**Propósito**: Manejar autenticación con Spotify OAuth

**Estado expuesto**:
```typescript
{
  isAuthenticated: boolean    // ¿Usuario autenticado?
  isLoading: boolean          // ¿Autenticando?
  profile: SpotifyUserProfile | null  // Datos del perfil
  error: string | null        // Error si hay
}
```

**Métodos**:
```typescript
checkAuth()      // Verifica si ya está autenticado
authenticate()   // Inicia flujo OAuth
logout()         // Limpia sesión local
loadProfile()    // Carga datos del perfil
```

**Ejemplo de uso**:
```svelte
<script>
  import { useSpotifyAuth } from '@/lib/hooks';
  
  const auth = useSpotifyAuth();
  
  onMount(async () => {
    const isAuth = await auth.checkAuth();
    if (!isAuth) {
      await auth.authenticate();
    }
  });
</script>

{#if auth.isAuthenticated}
  <p>Hola {auth.profile?.display_name}!</p>
{/if}
```

---

### 2. `useSpotifyTracks()`
**Propósito**: Manejar canciones guardadas con streaming progresivo

**Estado expuesto**:
```typescript
{
  tracks: SpotifyTrack[]      // Lista de canciones
  isLoading: boolean          // ¿Cargando?
  loadingProgress: number     // Progreso 0-100
  error: string | null        // Error si hay
}
```

**Métodos**:
```typescript
setupEventListeners()        // Configura listeners de eventos Tauri
loadTracks(forceReload?)     // Carga canciones (con/sin cache)
markLocalTracks(localTracks) // Marca canciones ya descargadas
cleanup()                    // Limpia listeners
reset()                      // Resetea estado
```

**Ejemplo de uso**:
```svelte
<script>
  import { useSpotifyTracks } from '@/lib/hooks';
  
  const tracks = useSpotifyTracks();
  
  onMount(async () => {
    await tracks.setupEventListeners();
    await tracks.loadTracks();
    
    return () => tracks.cleanup();
  });
</script>

{#if tracks.isLoading}
  <p>Cargando... {tracks.loadingProgress}%</p>
{:else}
  <p>{tracks.tracks.length} canciones cargadas</p>
{/if}
```

---

### 3. `useSpotifyPlaylists()`
**Propósito**: Manejar playlists del usuario

**Estado expuesto**:
```typescript
{
  playlists: SpotifyPlaylist[]  // Lista de playlists
  isLoading: boolean            // ¿Cargando?
  error: string | null          // Error si hay
}
```

**Métodos**:
```typescript
loadPlaylists(limit?, forceReload?)  // Carga playlists
reset()                              // Resetea estado
```

**Ejemplo de uso**:
```svelte
<script>
  import { useSpotifyPlaylists } from '@/lib/hooks';
  
  const playlists = useSpotifyPlaylists();
  
  onMount(async () => {
    await playlists.loadPlaylists(50);
  });
</script>

{#each playlists.playlists as playlist}
  <div>{playlist.name}</div>
{/each}
```

---

### 4. `useDownload()`
**Propósito**: Manejar descargas con spotdl

**Estado expuesto**:
```typescript
{
  isDownloading: boolean              // ¿Descargando?
  downloadProgress: DownloadProgressItem[]  // Lista de progreso
  downloadStats: DownloadStats        // Estadísticas
  spotdlInstalled: boolean | null     // ¿spotdl instalado?
  error: string | null                // Error si hay
}
```

**Métodos**:
```typescript
setupEventListeners()        // Configura listeners de eventos
checkSpotdlInstallation()    // Verifica spotdl
downloadTracks(tracks, opts) // Descarga múltiples tracks
downloadSingleTrack(track)   // Descarga 1 track
clearProgress()              // Limpia progreso
cleanup()                    // Limpia listeners
reset()                      // Resetea estado
```

**Ejemplo de uso**:
```svelte
<script>
  import { useDownload, useSpotifyTracks } from '@/lib/hooks';
  
  const download = useDownload();
  const tracks = useSpotifyTracks();
  
  onMount(async () => {
    await download.setupEventListeners();
    return () => download.cleanup();
  });
  
  async function handleDownloadAll() {
    const notDownloaded = tracks.tracks.filter(t => !t.isDownloaded);
    await download.downloadTracks(notDownloaded);
  }
</script>

<button onclick={handleDownloadAll} disabled={download.isDownloading}>
  {#if download.isDownloading}
    Descargando... {download.downloadStats.downloaded}/{download.downloadStats.total}
  {:else}
    Descargar Todas
  {/if}
</button>
```

---

### 5. `useTrackFilters(searchQuery)`
**Propósito**: Filtrado, ordenamiento y búsqueda de tracks

**Parámetros**:
- `searchQuery: () => string` - Función que retorna el query de búsqueda

**Estado expuesto**:
```typescript
{
  sortBy: SortBy                      // Columna de ordenamiento
  sortOrder: SortOrder                // 'asc' | 'desc'
  filterPopularity: PopularityFilter  // Filtro de popularidad
}
```

**Métodos**:
```typescript
handleSort(column)              // Cambia ordenamiento
filterAndSortTracks(tracks)     // Filtra y ordena tracks
hasActiveFilters()              // ¿Hay filtros activos?
clearFilters()                  // Limpia filtros
reset()                         // Resetea estado
```

**Ejemplo de uso**:
```svelte
<script>
  import { useTrackFilters, useSpotifyTracks } from '@/lib/hooks';
  import { searchStore } from '@/lib/stores/searchStore.svelte';
  
  const tracks = useSpotifyTracks();
  const filters = useTrackFilters(() => searchStore.query);
  
  let filteredTracks = $derived(
    filters.filterAndSortTracks(tracks.tracks)
  );
</script>

<button onclick={() => filters.handleSort('name')}>
  Ordenar por Nombre {filters.sortOrder === 'asc' ? '↑' : '↓'}
</button>

<select bind:value={filters.filterPopularity}>
  <option value="all">Todas</option>
  <option value="high">Alta (70+)</option>
  <option value="medium">Media (40-70)</option>
  <option value="low">Baja (<40)</option>
</select>

{#each filteredTracks as track}
  <div>{track.name}</div>
{/each}
```

---

## 🏗️ Estructura de Archivos

```
src/lib/hooks/
├── index.ts                      # Barrel export
├── useSpotifyAuth.svelte.ts      # Autenticación
├── useSpotifyTracks.svelte.ts    # Tracks con streaming
├── useSpotifyPlaylists.svelte.ts # Playlists
├── useDownload.svelte.ts         # Descargas spotdl
└── useTrackFilters.svelte.ts     # Filtrado y ordenamiento
```

---

## 📖 Patrón de Uso Completo

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    useSpotifyAuth,
    useSpotifyTracks, 
    useSpotifyPlaylists,
    useDownload,
    useTrackFilters
  } from '@/lib/hooks';
  import { searchStore } from '@/lib/stores/searchStore.svelte';

  // Inicializar todos los hooks
  const auth = useSpotifyAuth();
  const tracks = useSpotifyTracks();
  const playlists = useSpotifyPlaylists();
  const download = useDownload();
  const filters = useTrackFilters(() => searchStore.query);

  // Computed values con $derived
  let filteredTracks = $derived(
    filters.filterAndSortTracks(tracks.tracks)
  );

  // Inicialización
  onMount(async () => {
    // Setup de listeners
    await Promise.all([
      tracks.setupEventListeners(),
      download.setupEventListeners()
    ]);

    // Autenticación y carga
    const isAuth = await auth.checkAuth();
    if (isAuth) {
      await Promise.all([
        tracks.loadTracks(),
        playlists.loadPlaylists()
      ]);
    }

    // Cleanup al desmontar
    return () => {
      tracks.cleanup();
      download.cleanup();
    };
  });

  // Funciones de UI (orquestación simple)
  async function handleAuth() {
    await auth.authenticate();
    await tracks.loadTracks();
  }

  async function handleDownload() {
    const notDownloaded = filteredTracks.filter(t => !t.isDownloaded);
    await download.downloadTracks(notDownloaded);
  }
</script>

<!-- UI simple y declarativa -->
{#if !auth.isAuthenticated}
  <button onclick={handleAuth}>Conectar Spotify</button>
{:else if tracks.isLoading}
  <p>Cargando... {tracks.loadingProgress}%</p>
{:else}
  <button onclick={handleDownload}>
    Descargar {filteredTracks.length} canciones
  </button>
  
  {#each filteredTracks as track}
    <div>{track.name}</div>
  {/each}
{/if}
```

---

## ✨ Beneficios de la Refactorización

### Antes (960 líneas monolíticas):
```svelte
<script lang="ts">
  // 500+ líneas de lógica mezclada
  let savedTracks = $state([]);
  let isLoading = $state(false);
  let profile = $state(null);
  
  async function setupTrackStreamListeners() {
    // 100 líneas...
  }
  
  async function checkAuth() {
    // 50 líneas...
  }
  
  async function downloadAllTracks() {
    // 80 líneas...
  }
  
  // ... más funciones
</script>

<!-- 400+ líneas de UI -->
```

### Después (150 líneas + hooks reutilizables):
```svelte
<script lang="ts">
  // ✅ Solo 50 líneas de lógica de presentación
  import { 
    useSpotifyAuth, 
    useSpotifyTracks,
    useDownload 
  } from '@/lib/hooks';
  
  const auth = useSpotifyAuth();
  const tracks = useSpotifyTracks();
  const download = useDownload();
  
  // Lógica simple de orquestación
</script>

<!-- UI limpia y declarativa -->
```

---

## 🔄 Migración de Código Existente

### Paso 1: Importar hooks
```typescript
import { 
  useSpotifyAuth,
  useSpotifyTracks,
  useDownload 
} from '@/lib/hooks';
```

### Paso 2: Reemplazar estado local
**Antes:**
```typescript
let isAuthenticated = $state(false);
let profile = $state(null);
```

**Después:**
```typescript
const auth = useSpotifyAuth();
// usar: auth.isAuthenticated, auth.profile
```

### Paso 3: Reemplazar funciones
**Antes:**
```typescript
async function checkAuth() {
  // 30 líneas...
}
```

**Después:**
```typescript
await auth.checkAuth();
```

### Paso 4: Actualizar referencias en el template
**Antes:**
```svelte
{#if isAuthenticated}
  <p>{profile?.display_name}</p>
{/if}
```

**Después:**
```svelte
{#if auth.isAuthenticated}
  <p>{auth.profile?.display_name}</p>
{/if}
```

---

## 🧪 Testing

Los hooks son fáciles de testear por separado:

```typescript
import { describe, it, expect } from 'vitest';
import { useSpotifyAuth } from '@/lib/hooks';

describe('useSpotifyAuth', () => {
  it('should start unauthenticated', () => {
    const auth = useSpotifyAuth();
    expect(auth.isAuthenticated).toBe(false);
  });

  it('should authenticate successfully', async () => {
    const auth = useSpotifyAuth();
    await auth.authenticate();
    expect(auth.isAuthenticated).toBe(true);
  });
});
```

---

## 📝 Notas Importantes

1. **Svelte 5 Runes**: Todos los hooks usan `$state`, `$derived`, `$effect`
2. **Cleanup**: Siempre llamar a `cleanup()` en `onMount` return
3. **Event Listeners**: Configurar una sola vez con `setupEventListeners()`
4. **Force Reload**: Usar parámetro `forceReload: true` para ignorar cache
5. **Error Handling**: Cada hook expone su propio `error` state

---

## 🎨 Próximos Pasos

1. ✅ **Hooks creados** (useSpotifyAuth, useSpotifyTracks, etc.)
2. 🎯 **Tu tarea**: Crear componentes UI (SpotifyHeader, TrackTable, etc.)
3. 🔄 **Migrar**: Actualizar playlists/+page.svelte usando hooks + componentes
4. 🚀 **Replicar**: Aplicar mismo patrón a spotify/+page.svelte

---

## 📚 Recursos

- [Svelte 5 Runes](https://svelte.dev/docs/svelte/$state)
- [Tauri Events](https://tauri.app/v1/guides/features/events/)
- Ver: `src/routes/playlists/+page.refactored.example.svelte` para ejemplo completo

---

**¡Listo para crear componentes UI y terminar la refactorización! 🚀**
