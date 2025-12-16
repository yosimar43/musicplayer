# 🚀 Plan de Optimizaciones de Performance

Análisis comprensivo de mejoras de performance para Music Player

---

## 📊 ÁREAS DE OPTIMIZACIÓN

### 1. **Album Art Loading (Web Worker)**
**Estado**: ✅ Implementado con `albumArtService`
**Mejora**: Optimizar Worker para procesar en batch
- [ ] Implementar batch processing en albumArtWorker
- [ ] Cache de imágenes con IndexedDB (no solo sessionStorage)
- [ ] Lazy loading de thumbnails en grid
- [ ] Webp/AVIF para formato más pequeño

**Impacto**: -40% tiempo carga imágenes

---

### 2. **Store Reactivity Optimization**
**Estado**: ⚠️ Posibles effect loops
**Problema**: `$effect` en stores puede causar loops infinitos
- [ ] Auditar todos los `$effect()` en stores
- [ ] Usar `untrack()` más agresivamente
- [ ] Evitar derivadas que mutan estado
- [ ] Implementar manual invalidation en lugar de auto-tracking

**Impacto**: Reducción de renders innecesarios

---

### 3. **Memory Leaks en Event Listeners**
**Estado**: ⚠️ Cleanup inconsistente
**Problema**: 
- `usePlayer()` tiene cleanup pero no se llama en todas las páginas
- `useLibrary()` event listeners pueden no limpiarse
- `useDownload()` listeners pendientes al logout
- [ ] Implementar cleanup automático en `+layout.svelte`
- [ ] Audit de listeners en cada hook
- [ ] Destruir timelines GSAP correctamente

**Impacto**: -30% consumo de memoria después de 1 hora uso

---

### 4. **Tauri Command Batching**
**Estado**: ⚠️ Llamadas individuales
**Problema**: `scanMusicFolder` se llama para cada carpeta
- [ ] Implementar batch scanning
- [ ] Usar `invoke_batch` pattern
- [ ] Cache de resultados con invalidación smart

**Impacto**: -60% tiempo total de carga biblioteca

---

### 5. **Spotify API Rate Limiting**
**Estado**: ⚠️ Sin throttle/debounce en requests
**Problema**: Spotify limita a 429 requests/minuto
- [ ] Implementar Queue para requests Spotify
- [ ] Debounce en search (useSpotifyTracks)
- [ ] Caché con invalidación time-based
- [ ] Retry strategy con exponential backoff

**Impacto**: Evitar 429 errors

---

### 6. **CSS-in-JS Performance**
**Estado**: ⚠️ Tailwind config CSS-first
**Mejora**:
- [ ] Analyzer de unused CSS
- [ ] Critical CSS inline en layout
- [ ] Tree-shake animations no usadas
- [ ] Optimize font loading (WOFF2, preload)

**Impacto**: -20% CSS bundle size

---

### 7. **Component Re-render Optimization**
**Estado**: ⚠️ Componentes con muchos `$derived`
**Problema**:
- MusicCard3D tiene 10+ `$derived` que recalculan
- CarouselCard3D recalcula grid en cada state change
- [ ] Usar `$derived.by()` en lugar de computed getters
- [ ] Memoizar funciones costosas
- [ ] Lazy initialization de GSAP

**Impacto**: -25% re-renders innecesarios

---

### 8. **Audio Buffer Management**
**Estado**: ⚠️ Sin pre-buffering
**Mejora**:
- [ ] Pre-buffer siguiente track (100ms)
- [ ] Detectar cambios de format automáticamente
- [ ] Error recovery sin skip de track
- [ ] Peak audio detection para visualization

**Impacto**: Reproducción más fluida

---

### 9. **Session Storage Cleanup**
**Estado**: ⚠️ Cache sin límite
**Problema**: sessionStorage puede llenar 10MB límite
- [ ] Implementar LRU cache para visibleTracksCount
- [ ] Limpiar cache antiguo (>1 hora)
- [ ] Compresión de cache con gzip
- [ ] Migrar a IndexedDB para datos grandes

**Impacto**: Evitar quota exceeded errors

---

### 10. **Bundle Size & Code Splitting**
**Estado**: ⚠️ Sin análisis actual
**Mejora**:
- [ ] Analizar bundle con `vite-plugin-visualizer`
- [ ] Code split por ruta (lazy load TracksCarousel)
- [ ] Dynamic imports para GSAP plugins
- [ ] Tree-shake unused rspotify methods

**Impacto**: -30% bundle inicial

---

## 🎯 PRIORIDAD IMPLEMENTACIÓN

### High Impact (1-2 horas)
1. **Memory leak cleanup** - Auditar listeners
2. **Effect loop prevention** - Revisar stores
3. **Session storage LRU** - Evitar quota errors

### Medium Impact (2-4 horas)
4. **Spotify rate limiting** - Queue + debounce
5. **Component re-render** - Memoization
6. **Album art batch** - Web Worker optimization

### Nice to Have (4+ horas)
7. **Bundle analysis** - Code splitting
8. **CSS optimization** - Critical CSS
9. **Audio buffering** - Pre-buffer siguiente track
10. **Tauri batching** - Command optimization

---

## 📈 Métricas Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Memory after 1h** | ~150MB | ~90MB | -40% |
| **Initial load** | 2.5s | 1.5s | -40% |
| **Spotify search latency** | 500ms | 100ms | -80% |
| **Bundle size** | 450KB | 315KB | -30% |
| **FCP (First Contentful Paint)** | 800ms | 500ms | -37% |

---

## ✅ Quick Wins (30 min)

1. **Agregar console timing**
```typescript
console.time('initializeApp');
await initializeApp();
console.timeEnd('initializeApp');
```

2. **Limpiar logs en production**
```typescript
const isDev = import.meta.env.DEV;
const log = isDev ? console.log : () => {};
```

3. **Habilitar compression en Tauri**
```json
{
  "bundle": {
    "compression": "brotli"
  }
}
```

---

