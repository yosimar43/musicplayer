# 🎵 Prompt: Optimización de Carga y Transiciones de Canciones

## Objetivo General
Optimizar la experiencia de carga, transición y visualización de canciones en la aplicación de música, mejorando:
- **Velocidad de carga inicial** (Library, Spotify, Playlists)
- **Transiciones visuales fluidas** entre canciones
- **Loading states inteligentes** con feedback visual progresivo
- **Rendimiento de slides/carousels** de álbumes y playlists
- **Caché estratégico** para evitar recalcular/recargar datos

---

## 🔍 Análisis Actual

### Problemas Identificados
1. **Carga bloqueante**: En `useMasterHook`, las inicializaciones secuenciales ralentizan el startup
2. **No hay skeleton screens**: Los componentes esperan datos completos antes de renderizar
3. **Recarga innecesaria**: Cada click en una canción puede triggerear operaciones redundantes
4. **GSAP animations sin optimización**: Posibles memory leaks si timelines no se limpian correctamente
5. **Album art**: Carga sincrónica que bloquea el rendering de la UI
6. **Transiciones slide**: Sin virtualización para listas grandes

### Métricas a Mejorar
```
Antes (Baseline):
├── App startup: ~2-3s
├── Library load: ~1.5s
├── Spotify load: ~2.5s
├── Album art load: ~500ms per item
├── Slide transition: ~30fps en listas grandes
└── Memory: ~150-200MB after 1 hour

Objetivo:
├── App startup: <1s
├── Library load: <800ms
├── Spotify load (parallel): <1s
├── Album art load: lazy + cached
├── Slide transition: 60fps consistent
└── Memory: <100MB (stable)
```

---

## 📋 Plan de Optimización por Capas

### 1️⃣ CAPA DE STORES (Estado Puro)

#### `player.store.svelte.ts` - Optimización de Tracks
```typescript
// ✅ Agregar:
- computed `isLoadingTrack` para mostrar skeleton
- computed `nextTrackPreview` (para precargar album art)
- método `batchSetTracks()` para evitar renders intermedios
- flag `isTransitioning` para controlar animaciones
```

#### `library.store.svelte.ts` - Caché y Paginación
```typescript
// ✅ Agregar:
- `Map<string, MusicFile>` para O(1) lookup por path
- lazy-loading con página size configurable (50 items)
- flag `isInitialLoadComplete` vs `isLoading` granular
- computed `visibleTracks` solo para viewport (virtualización)
```

#### `enrichment.store.svelte.ts` - Album Art Caché
```typescript
// ✅ Agregar:
- persistir cache de album art en localStorage/indexedDB
- expiration time: 30 días
- max size: 500 items (LRU eviction)
```

---

### 2️⃣ CAPA DE HOOKS (Orquestación + I/O)

#### `useMasterHook.svelte.ts` - Startup Parallelización
```typescript
// ❌ Actual (secuencial, lento):
async function initializeApp() {
  await player.initialize();
  await library.initialize();
  const isAuth = await auth.checkAuth();
  if (isAuth) {
    await spotifyTracks.loadTracks();
    await spotifyPlaylists.loadPlaylists();
  }
}

// ✅ Optimizado (paralelo + lazy):
async function initializeApp() {
  // Fase 1: Crítico inmediato
  await player.initialize();
  
  // Fase 2: Paralelo (no bloqueante)
  const [authResult] = await Promise.all([
    auth.checkAuth(),
    library.initialize() // Inicia pero no espera
  ]);
  
  // Fase 3: Data load (background)
  Promise.allSettled([
    library.loadLibraryPaginated(0, 50), // Primer lote visible
    authResult ? spotifyPlaylists.loadPlaylists() : Promise.resolve(),
    spotifyTracks.loadTracks() // Background
  ]);
  
  // Fase 4: Enriquecimiento deferred (baja prioridad)
  requestIdleCallback(() => enrichment.preloadVisibleAlbumArt());
}
```

#### `usePlayer.svelte.ts` - Transición Fluida
```typescript
// ✅ Agregar:
async function playNext(track: Track) {
  playerStore.setIsTransitioning(true); // Deshabilita UI
  
  try {
    // Precargar: album art + metadata
    await Promise.all([
      enrichment.getAlbumArt(track), // Async pero no bloquea
      audioManager.preload(track.path)
    ]);
    
    // Actualizar UI con fade transition
    playerStore.setCurrentTrack(track);
    await audioManager.play(track.path);
    
  } finally {
    playerStore.setIsTransitioning(false);
  }
}
```

#### `useLibrary.svelte.ts` - Paginación Virtual
```typescript
// ✅ Agregar:
function setupVirtualScroll(scrollContainer: HTMLElement) {
  const visibleHeight = scrollContainer.clientHeight;
  const itemHeight = 60; // px
  const bufferItems = 5;
  
  scrollContainer.addEventListener('scroll', (e) => {
    const scrollTop = e.target.scrollTop;
    const startIdx = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferItems);
    const endIdx = startIdx + Math.ceil(visibleHeight / itemHeight) + (bufferItems * 2);
    
    libraryStore.setVisibleRange(startIdx, endIdx);
  });
  
  // Lazy-load más items cuando se acerca al final
  if (endIdx > currentTracks.length - 20) {
    loadNextPage();
  }
}
```

#### `useSpotifyTracks.svelte.ts` - Throttling
```typescript
// ✅ Agregar:
const debouncedSearch = debounce((query: string) => {
  // Search only fires 500ms after user stops typing
  spotifySearch(query);
}, 500);
```

---

### 3️⃣ CAPA DE SERVICIOS

#### `enrichment.service.ts` - Album Art Worker
```typescript
// ✅ Agregar:
// Usar Web Worker para metadata parsing (no bloquea main thread)
// Implementar LRU cache con indexedDB para persistencia

async function getAlbumArt(track: Track): Promise<string | null> {
  // 1. Buscar en cache en memoria
  if (albumArtCache.has(track.id)) {
    return albumArtCache.get(track.id);
  }
  
  // 2. Buscar en IndexedDB (async, no bloquea)
  const cached = await db.getAlbumArt(track.id);
  if (cached && !isExpired(cached)) {
    albumArtCache.set(track.id, cached.url);
    return cached.url;
  }
  
  // 3. Fetch en background (Promise, no await en critical path)
  fetchAlbumArtFromLastFM(track).then(url => {
    if (url) {
      albumArtCache.set(track.id, url);
      db.saveAlbumArt(track.id, url, Date.now());
    }
  });
  
  // 4. Retornar null inmediatamente (lazy load placeholder)
  return null;
}
```

---

### 4️⃣ CAPA DE COMPONENTES (UI + Animaciones GSAP)

#### `+layout.svelte` - Background Effects Optimizados
```svelte
<!-- ✅ Usar requestAnimationFrame throttling -->
<script lang="ts">
  import gsap from 'gsap';
  let ctx: gsap.Context | null = null;
  let lastFrameTime = 0;
  
  onMount(() => {
    ctx = gsap.context(() => {
      // Usar GSAP ticker en lugar de setInterval
      gsap.ticker.add((time) => {
        // Throttle a 30fps para orbs (no necesitan 60fps)
        if (time - lastFrameTime > 1000/30) {
          updateOrbsPosition(time);
          lastFrameTime = time;
        }
      });
    });
    
    return () => ctx?.revert();
  });
</script>
```

#### `player/TrackCard.svelte` - Transición Slide Optimizada
```svelte
<!-- ✅ Virtualización para grandes listas -->
<script lang="ts">
  import { usePlayer } from '@/lib/hooks';
  import { useUI } from '@/lib/hooks';
  
  let { track, index, visible }: { track: Track; index: number; visible: boolean } = $props();
  const player = usePlayer();
  const ui = useUI();
  
  let cardRef: HTMLElement;
  let hoverTimeline: gsap.core.Timeline | null = null;
  
  $effect(() => {
    if (visible && cardRef) {
      // Animación solo cuando visible en viewport
      gsap.set(cardRef, { opacity: 0, y: 20 });
      gsap.to(cardRef, { opacity: 1, y: 0, duration: 0.3 });
    }
  });
  
  function handleMouseEnter() {
    hoverTimeline?.kill();
    hoverTimeline = gsap.timeline({ defaults: { duration: 0.2, overwrite: true } });
    hoverTimeline
      .to(cardRef, { scale: 1.02, ease: "power2.out" }, 0)
      .to(cardRef.querySelector('.album-art'), { filter: "brightness(1.1)" }, 0);
  }
  
  function handleMouseLeave() {
    hoverTimeline?.kill();
    gsap.to(cardRef, { scale: 1, duration: 0.2 });
    gsap.to(cardRef.querySelector('.album-art'), { filter: "brightness(1)", duration: 0.2 });
  }
  
  onDestroy(() => {
    hoverTimeline?.kill();
    hoverTimeline = null;
  });
</script>

<div 
  bind:this={cardRef}
  class="track-card"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onclick={() => player.play(track)}
>
  <!-- Skeleton si loading -->
  {#if player.isTransitioning && player.current?.id === track.id}
    <div class="skeleton animate-pulse" />
  {:else}
    <!-- Album art lazy load -->
    <img 
      src={track.albumArt || '/placeholder.webp'} 
      alt={track.title}
      loading="lazy"
    />
  {/if}
  
  <div class="track-info">
    <h3>{track.title}</h3>
    <p>{track.artist}</p>
  </div>
</div>
```

#### `library/LibraryList.svelte` - Virtual Scroll
```svelte
<!-- ✅ Virtualización de lista grande -->
<script lang="ts">
  import { useLibrary } from '@/lib/hooks';
  import TrackCard from './TrackCard.svelte';
  
  const library = useLibrary();
  
  let scrollContainer: HTMLElement;
  let visibleStart = $state(0);
  let visibleEnd = $state(50);
  
  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const itemHeight = 80;
    
    visibleStart = Math.floor(scrollTop / itemHeight) - 5;
    visibleEnd = visibleStart + Math.ceil(target.clientHeight / itemHeight) + 10;
  }
  
  const visibleTracks = $derived(
    library.tracks.slice(visibleStart, visibleEnd)
  );
</script>

<div 
  bind:this={scrollContainer}
  class="library-list"
  onscroll={handleScroll}
  style="--total-height: {library.tracks.length * 80}px"
>
  <div style="height: {visibleStart * 80}px" />
  
  {#each visibleTracks as track, i (track.id)}
    <TrackCard 
      {track} 
      index={visibleStart + i}
      visible={true}
    />
  {/each}
  
  <div style="height: {(library.tracks.length - visibleEnd) * 80}px" />
</div>
```

#### `player/Slider.svelte` - Timeline Drag Optimizado
```svelte
<!-- ✅ Usar quickTo para drag sin lag -->
<script lang="ts">
  import gsap from 'gsap';
  import { usePlayer } from '@/lib/hooks';
  
  let { duration }: { duration: number } = $props();
  const player = usePlayer();
  let thumbRef: HTMLElement;
  let isDragging = $state(false);
  let quickToThumb: gsap.QuickToFunc | null = null;
  
  onMount(() => {
    quickToThumb = gsap.quickTo(thumbRef, "left", {
      duration: 0.1,
      ease: "power1.out"
    });
  });
  
  function handleThumbDrag(e: PointerEvent) {
    isDragging = true;
    const rect = e.currentTarget.getBoundingClientRect();
    
    function updatePosition(moveEvent: PointerEvent) {
      const percent = (moveEvent.clientX - rect.left) / rect.width;
      const newTime = Math.max(0, Math.min(duration, percent * duration));
      
      // Ultra-fast update sem garbage collection
      quickToThumb?.(rect.width * (newTime / duration));
      player.setCurrentTime(newTime);
    }
    
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('pointermove', updatePosition);
      document.removeEventListener('pointerup', stopDrag);
    }
    
    document.addEventListener('pointermove', updatePosition);
    document.addEventListener('pointerup', stopDrag);
  }
</script>

<div class="slider-track">
  <div 
    bind:this={thumbRef}
    class="slider-thumb"
    role="slider"
    onpointerdown={handleThumbDrag}
  />
</div>
```

---

### 5️⃣ OPTIMIZACIONES EN RUST (Tauri Backend)

#### `commands/file.rs` - Scanning Optimizado
```rust
// ✅ Agregar:
// - Parallelización con rayon para scannear múltiples carpetas
// - Stream de resultados en lugar de retornar todo al final
// - Enviar progress events cada 100 items
// - Caché de índice de archivos

#[tauri::command]
pub async fn scan_music_folder_progressive(
    folder_path: String,
    app_handle: tauri::AppHandle,
) -> ApiResponse<Vec<MusicFile>> {
    let mut results = Vec::new();
    let mut count = 0;
    
    for entry in WalkDir::new(&folder_path) {
        if is_audio_file(&entry) {
            results.push(parse_audio_file(&entry)?);
            count += 1;
            
            // Emit progress cada 100 items
            if count % 100 == 0 {
                app_handle.emit(
                    "scan-progress",
                    json!({ "loaded": count })
                )?;
            }
        }
    }
    
    Ok(results)
}
```

#### `services/file.rs` - Metadatos en Background
```rust
// ✅ Agregar:
// - Parsing de metadatos en thread pool
// - Serializar solo campos necesarios
// - Compresión de datos si se envía mucha info

pub async fn parse_audio_metadata_async(
    file_path: &Path,
) -> Result<TrackMetadata> {
    tokio::task::spawn_blocking(move || {
        let tag = Tag::new().read_from_path(&file_path)?;
        Ok(TrackMetadata {
            title: tag.title().map(|t| t.to_string()),
            artist: tag.artist().map(|a| a.to_string()),
            // Minimizar campos
        })
    })
    .await?
}
```

---

## 🎯 Checklist de Implementación

### Fase 1: Startup (1-2 días)
- [ ] Parallelizar `initializeApp` en `useMasterHook`
- [ ] Implementar skeleton screens en componentes
- [ ] Agregar `isLoading` granular en stores
- [ ] Lazy-load Spotify data en background

### Fase 2: Caché y Metadata (2-3 días)
- [ ] Implementar album art cache con indexedDB
- [ ] Agregar LRU eviction en enrichment.service
- [ ] Parsing de metadata en Web Worker
- [ ] Persistencia de caché entre sesiones

### Fase 3: Virtualización (2-3 días)
- [ ] Virtual scroll en LibraryList
- [ ] Virtual scroll en playlist slides
- [ ] Visible range tracking con observer

### Fase 4: GSAP Optimización (1-2 días)
- [ ] Usar `quickTo()` para mouse tracking
- [ ] Cleanup de timelines en onDestroy
- [ ] Throttle de orbs background animation
- [ ] Heap snapshots para memory leaks

### Fase 5: Backend (1-2 días)
- [ ] Scan progresivo en Rust
- [ ] Metadata parsing async
- [ ] Progress events
- [ ] Caché de índice de archivos

---

## 📊 Monitoreo de Rendimiento

### Métricas a Trackear
```typescript
// En useMasterHook
const metrics = {
  appStartTime: performance.now(),
  libraryLoadTime: 0,
  spotifyLoadTime: 0,
  albumArtLoadTime: 0,
  firstTrackPlayTime: 0,
};

// En components
const componentRenderTime = performance.now();
const fpsMonitor = setInterval(() => {
  console.log(`FPS: ${gsap.ticker.fps()}`);
}, 1000);
```

### DevTools
```bash
# Chrome DevTools → Performance tab
# 1. Record app startup
# 2. Identify long tasks (>50ms)
# 3. Check memory growth over time
# 4. Heap snapshots before/after library load

# Firefox → about:memory
# Mensura memory footprint de Web Workers
```

---

## 🚀 Resultado Esperado

**Antes:**
- App startup: ~2.5s
- Library load: blocking
- Spotify: sequential
- Album art: synchronous lookup failures
- UI lag on scroll: frequent

**Después:**
- ✅ App startup: <1s (users see UI immediately)
- ✅ Library loads 50 items instantly, rest in background
- ✅ Spotify loads in parallel with library
- ✅ Album art loads lazily with placeholders
- ✅ 60fps smooth scrolling with virtual list
- ✅ Memory stable <100MB
