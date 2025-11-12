# 🎯 Plan de Refactorización Manual - Music Player

## 📊 Estado Actual del Proyecto

### Análisis de Líneas de Código

#### Páginas (Routes)
| Archivo | Líneas | Estado | Prioridad |
|---------|--------|--------|-----------|
| `playlists/+page.svelte` | **1,415** | 🔥 CRÍTICO | **P0** |
| `+page.svelte` (Home) | 254 | ✅ OK | P3 |
| `+layout.svelte` | 49 | ✅ OK | - |
| `library/+page.svelte` | 6 | ✅ OK | - |

#### Componentes
| Archivo | Líneas | Estado | Prioridad |
|---------|--------|--------|-----------|
| `musicplayerapp.svelte` | 793 | ⚠️ MEDIO | P2 |
| `Navbar.svelte` | 241 | ⚠️ MEDIO | P1 |
| `MusicLibrary.svelte` | 125 | ✅ OK | P3 |
| Otros | <150 | ✅ OK | - |

---

## 🎯 Hooks Disponibles

### ✅ Hooks Core (6)
```typescript
import {
  useSpotifyAuth,        // Auth OAuth + perfil
  useSpotifyTracks,      // Tracks con streaming progresivo
  useSpotifyPlaylists,   // Playlists del usuario
  useDownload,           // Descargas spotdl
  useTrackFilters,       // Filtrado/ordenamiento
  createAlbumArtLoader   // Imágenes Last.fm
} from '@/lib/hooks';
```

### ✅ Hooks Utilidades (3)
```typescript
import {
  useLibrarySync,        // Sincronización auto biblioteca local
  usePersistedState,     // localStorage con sync entre tabs
  useEventBus,           // Sistema de eventos global
  EVENTS                 // Eventos predefinidos
} from '@/lib/hooks';
```

### ✅ Estado Global
```typescript
import {
  library,               // Biblioteca local (singleton)
  player,                // Reproductor (singleton)
  ui,                    // UI preferences (singleton)
  // Acciones
  loadLibrary, loadDefaultLibrary, searchTracks,
  play, pause, next, previous, setVolume, setQueue,
  notify, toggleSidebar, setTheme
} from '@/lib/state';
```

---

## 🔥 Prioridad 0: `/playlists` (1,415 líneas)

### 🎯 Objetivo
Reducir de **1,415 líneas** a **~200-300 líneas** usando hooks

### 📝 Análisis de Código Actual

**Lógica que debe moverse a hooks:**
```svelte
<script lang="ts">
  // ❌ Estado local duplicado (ya existe en hooks)
  let profile = $state<SpotifyUserProfile | null>(null);
  let savedTracks = $state<SpotifyTrack[]>([]);
  let playlists = $state<SpotifyPlaylist[]>([]);
  let isLoading = $state(false);
  let isAuthenticated = $state(false);
  
  // ❌ Lógica de autenticación (useSpotifyAuth)
  async function checkAuth() { ... }
  
  // ❌ Streaming de tracks (useSpotifyTracks)
  async function setupTrackStreamListeners() { ... }
  async function loadSpotifySavedTracks() { ... }
  
  // ❌ Carga de playlists (useSpotifyPlaylists)
  async function loadPlaylists() { ... }
  
  // ❌ Descargas (useDownload)
  async function checkSpotdlInstallation() { ... }
  async function downloadAllTracks() { ... }
  
  // ❌ Filtros (useTrackFilters)
  let sortBy = $state(...);
  let sortOrder = $state(...);
  function handleSort() { ... }
  function filterAndSortTracks() { ... }
  
  // ❌ Sincronización manual (useLibrarySync)
  $effect(() => {
    if (savedTracks.length > 0 && library.tracks.length > 0) {
      savedTracks = markDownloadedTracks(savedTracks, library.tracks);
    }
  });
</script>
```

### ✅ Refactorización con Hooks

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { library } from '@/lib/state/library.svelte';
  import { 
    useSpotifyAuth, 
    useSpotifyTracks,
    useSpotifyPlaylists,
    useDownload,
    useTrackFilters,
    useLibrarySync,
    useEventBus,
    EVENTS
  } from '@/lib/hooks';
  import { searchStore } from '@/lib/stores/searchStore.svelte';

  // ✅ Hooks reemplazan toda la lógica
  const auth = useSpotifyAuth();
  const tracks = useSpotifyTracks();
  const playlists = useSpotifyPlaylists();
  const download = useDownload();
  const filters = useTrackFilters(() => searchStore.query);
  const sync = useLibrarySync();
  const bus = useEventBus();

  // ✅ Solo UI state
  let activeView = $state<'liked' | 'playlists'>('liked');
  let showDownloadPanel = $state(false);
  let showProfileCard = $state(true);

  // ✅ Computed values derivados
  let filteredTracks = $derived(
    filters.filterAndSortTracks(tracks.tracks)
  );
  
  let syncedTracks = $derived(
    sync.syncWithLibrary(filteredTracks)
  );
  
  let downloadableCount = $derived(
    syncedTracks.filter(t => !t.isDownloaded).length
  );

  onMount(async () => {
    // Setup listeners
    await Promise.all([
      tracks.setupEventListeners(),
      download.setupEventListeners()
    ]);

    // Auto-sync con biblioteca
    sync.setupAutoSync(
      () => tracks.tracks,
      (synced) => { tracks.tracks = synced; }
    );

    // Event bus para descargas
    bus.on(EVENTS.DOWNLOAD_COMPLETED, async () => {
      await library.reload();
    });

    // Auth y carga
    const isAuth = await auth.checkAuth();
    if (isAuth) {
      await Promise.all([
        tracks.loadTracks(),
        playlists.loadPlaylists(50)
      ]);
    }

    // Cleanup
    return () => {
      tracks.cleanup();
      download.cleanup();
      bus.cleanup();
    };
  });

  // ✅ Funciones de UI simplificadas
  async function handleAuth() {
    await auth.authenticate();
    if (auth.isAuthenticated) {
      await Promise.all([
        tracks.loadTracks(),
        playlists.loadPlaylists(50)
      ]);
    }
  }

  async function handleDownloadAll() {
    if (downloadableCount === 0) return;
    showDownloadPanel = true;
    await download.downloadTracks(
      syncedTracks.filter(t => !t.isDownloaded),
      {
        segmentSize: 10,
        delay: 2,
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3'
      }
    );
  }
</script>

<!-- Template simplificado -->
{#if !auth.isAuthenticated}
  <button onclick={handleAuth}>Conectar Spotify</button>
{:else if tracks.isLoading}
  <p>Cargando... {tracks.loadingProgress}%</p>
{:else}
  <button onclick={handleDownloadAll}>
    Descargar {downloadableCount} canciones
  </button>
  
  {#each syncedTracks as track}
    <div>{track.name}</div>
  {/each}
{/if}
```

### 📊 Resultado Esperado
- **Antes**: 1,415 líneas (lógica + UI mezclada)
- **Después**: ~200-300 líneas (solo UI + orquestación)
- **Reducción**: ~85% de código

---

## ⚠️ Prioridad 1: `Navbar.svelte` (241 líneas)

### 🎯 Objetivo
Simplificar autenticación y búsqueda usando hooks

### ❌ Código Actual
```svelte
<script lang="ts">
  let isAuthenticated = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let isLoading = $state(false);

  async function checkSpotifyAuth() {
    try {
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      if (isAuthenticated) {
        profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
      }
    } catch (err) {
      console.error('Error checking Spotify auth:', err);
    }
  }

  async function handleSpotifyLogout() {
    isLoading = true;
    try {
      await invoke('spotify_logout');
      isAuthenticated = false;
      profile = null;
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      isLoading = false;
    }
  }
</script>
```

### ✅ Refactorizado
```svelte
<script lang="ts">
  import { useSpotifyAuth } from '@/lib/hooks';
  
  const auth = useSpotifyAuth();

  onMount(() => {
    auth.checkAuth();
  });
</script>

{#if auth.isAuthenticated}
  <img src={auth.profile?.images[0]} alt="Profile" />
  <span>{auth.profile?.display_name}</span>
  <button onclick={() => auth.logout()}>Logout</button>
{/if}
```

### 📊 Resultado Esperado
- **Antes**: 241 líneas
- **Después**: ~150 líneas
- **Reducción**: ~40% de código

---

## ⚠️ Prioridad 2: `musicplayerapp.svelte` (793 líneas)

### 🎯 Análisis
Este componente parece ser **redundante** o legacy. Necesita investigación:

**Preguntas:**
1. ¿Se está usando actualmente?
2. ¿Qué funcionalidad proporciona?
3. ¿Puede ser eliminado o fusionado?

**Acción:** Revisar y decidir si refactorizar o eliminar

---

## ✅ Prioridad 3: Otros Componentes

### Estado: OK ✅
- `+page.svelte` (254 líneas) - Ya usa estado global correctamente
- `library/+page.svelte` (6 líneas) - Solo renderiza MusicLibrary
- `MusicLibrary.svelte` (125 líneas) - Tamaño razonable

**No requieren refactorización inmediata**

---

## 📋 Checklist de Refactorización

### Fase 1: `/playlists` 🔥
- [ ] 1. Backup del archivo original
- [ ] 2. Importar todos los hooks necesarios
- [ ] 3. Reemplazar estado local con hooks
- [ ] 4. Implementar `useLibrarySync` para auto-sincronización
- [ ] 5. Implementar `useEventBus` para comunicación
- [ ] 6. Simplificar funciones de UI (solo orquestación)
- [ ] 7. Limpiar event listeners manuales
- [ ] 8. Actualizar template con nuevas referencias
- [ ] 9. Testing completo
- [ ] 10. Eliminar código comentado

### Fase 2: `Navbar.svelte` ⚠️
- [ ] 1. Backup del archivo original
- [ ] 2. Reemplazar auth manual con `useSpotifyAuth`
- [ ] 3. Mantener `searchStore` (ya está bien)
- [ ] 4. Simplificar lógica de logout
- [ ] 5. Testing de autenticación
- [ ] 6. Verificar integración con otras páginas

### Fase 3: Investigación 🔍
- [ ] 1. Analizar `musicplayerapp.svelte`
- [ ] 2. Identificar si está en uso
- [ ] 3. Decidir: refactorizar, fusionar o eliminar

### Fase 4: Optimizaciones Finales ✨
- [ ] 1. Revisar imports duplicados
- [ ] 2. Consolidar tipos comunes
- [ ] 3. Documentar patrones de uso
- [ ] 4. Testing end-to-end completo
- [ ] 5. Performance profiling

---

## 🛠️ Herramientas de Desarrollo

### Testing de Hooks
```typescript
// Ejemplo de test para useSpotifyAuth
import { describe, it, expect } from 'vitest';
import { useSpotifyAuth } from '@/lib/hooks';

describe('useSpotifyAuth', () => {
  it('should start unauthenticated', () => {
    const auth = useSpotifyAuth();
    expect(auth.isAuthenticated).toBe(false);
  });
});
```

### Debugging
```typescript
// Usar EVENTS para debugging
bus.on(EVENTS.SPOTIFY_TRACKS_LOADED, (data) => {
  console.log('✅ Tracks cargados:', data);
});

bus.on(EVENTS.DOWNLOAD_COMPLETED, (data) => {
  console.log('✅ Descarga completa:', data);
});
```

---

## 📊 Métricas de Éxito

### Código
- **Reducción total**: ~2,000 líneas → ~700 líneas (~65%)
- **Hooks utilizados**: 9/9 (100%)
- **Duplicación**: 0% (lógica centralizada en hooks)

### Mantenibilidad
- **Separación de responsabilidades**: ✅ UI vs Lógica
- **Reutilización**: ✅ Hooks en múltiples componentes
- **Testabilidad**: ✅ Hooks testeables independientemente

### Performance
- **Menos re-renders**: ✅ Estado optimizado con $derived
- **Cleanup automático**: ✅ Event listeners limpios
- **Memory leaks**: ✅ Prevención con cleanup()

---

## 🚀 Orden de Ejecución Recomendado

1. **Día 1-2**: Refactorizar `/playlists` (más crítico)
2. **Día 3**: Refactorizar `Navbar.svelte`
3. **Día 4**: Investigar `musicplayerapp.svelte`
4. **Día 5**: Testing y optimizaciones finales

---

## 📚 Recursos

- **Documentación**: `README.md` (sección "Sistema de Hooks y Estado Global")
- **Ejemplos**: Ver sección de integración en README
- **Hooks**: `src/lib/hooks/index.ts` (todos exportados)
- **Estado**: `src/lib/state/index.ts` (singletons globales)

---

## ✨ Beneficios Esperados

### Desarrollador
- ✅ Código más limpio y legible
- ✅ Debugging más fácil (lógica aislada)
- ✅ Testing simplificado
- ✅ Menos bugs por duplicación

### Usuario
- ✅ UI más responsiva (menos re-renders)
- ✅ Mejor performance general
- ✅ Menos memory leaks
- ✅ Sincronización automática

### Mantenimiento
- ✅ Cambios centralizados (hooks)
- ✅ Patrones consistentes
- ✅ Onboarding más rápido
- ✅ Escalabilidad mejorada

---

**🎯 ¡Listo para comenzar la refactorización manual!**
