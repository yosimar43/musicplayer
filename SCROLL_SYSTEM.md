# 🎯 Sistema de Scroll Personalizado - Documentación

## 📋 Resumen

Sistema de scroll completamente controlado, sin barras nativas, con animaciones GSAP fluidas para una aplicación Svelte 5. Maneja dos contextos de scroll independientes sin interferencias.

---

## 🏗️ Arquitectura

### 1. **useScrollController** - Scroll Externo (Cambio de Slides)
📄 `src/lib/hooks/useScrollController.svelte.ts`

**Responsabilidades:**
- Navegar entre slides/islas con gestos
- Detectar wheel, touch y eventos de puntero
- Aplicar inercia y snap a posiciones
- Prevenir scroll nativo del navegador
- Gestionar prioridades de contexto

**Características clave:**
- ✅ Acumulador de delta para prevenir doble disparo
- ✅ Snap suave con GSAP Timeline
- ✅ Sistema de prioridades (respeta scroll interno)
- ✅ Inercia calculada con damping
- ✅ Threshold configurable
- ✅ Touch gestures con velocidad

**API:**
```typescript
const scrollController = useScrollController({
  threshold: 100,        // Umbral mínimo para scroll
  snapDuration: 0.8,     // Duración de animación de cambio
  inertiaDuration: 1.2,  // Duración de inercia
  maxVelocity: 3000,     // Velocidad máxima
  dampingFactor: 0.85    // Factor de amortiguación
});

// Estado reactivo
scrollController.currentIndex    // Índice actual
scrollController.isAnimating     // Si está animando
scrollController.activeContext   // 'external' | 'internal' | 'none'

// Métodos
scrollController.goToSlide(index, animated)
scrollController.nextSlide()
scrollController.prevSlide()
scrollController.setTotalSlides(count)
scrollController.setActiveContext(context)

// Lifecycle
scrollController.initialize(containerElement)
scrollController.cleanup()
```

---

### 2. **useInnerListScroll** - Scroll Interno (Lista de Tracks)
📄 `src/lib/hooks/useInnerListScroll.svelte.ts`

**Responsabilidades:**
- Scroll vertical dentro del slide activo
- Lazy loading automático
- Inercia natural con GSAP
- Detectar límites (inicio/fin)
- Notificar al scroll externo cuando está activo

**Características clave:**
- ✅ Transforma contenido con GSAP (no scroll nativo)
- ✅ Lazy load en threshold configurable
- ✅ Callbacks: onScrollStart, onScrollEnd, onLazyLoad
- ✅ Retorna boolean en handlers (consumido o no)
- ✅ Prevención de scroll bleed
- ✅ Actualización dinámica de bounds

**API:**
```typescript
const innerScroll = useInnerListScroll({
  inertiaDuration: 0.8,
  dampingFactor: 0.9,
  maxVelocity: 5000,
  lazyLoadThreshold: 0.7  // 70% del scroll
});

// Estado reactivo
innerScroll.scrollPosition  // Posición en px
innerScroll.isScrolling    // Si está scrolleando
innerScroll.canScrollUp    // Puede scrollear arriba
innerScroll.canScrollDown  // Puede scrollear abajo
innerScroll.progress       // 0-1 progreso

// Métodos
innerScroll.scrollTo(position, animated)
innerScroll.scrollBy(delta, animated)
innerScroll.resetScroll()
innerScroll.updateBounds()

// Callbacks
innerScroll.onLazyLoad = () => { /* cargar más */ };
innerScroll.onScrollStart = () => { /* notificar */ };
innerScroll.onScrollEnd = () => { /* limpiar */ };

// Lifecycle
innerScroll.initialize(containerEl, contentEl)
innerScroll.cleanup()
```

---

## 🔄 Flujo de Eventos

### Priorización Automática

```
Usuario hace scroll
      │
      ├─> ¿Está sobre tracks-grid?
      │         │
      │         ├─> SÍ: innerScroll.handleWheel()
      │         │        ├─> ¿Puede scrollear en esa dirección?
      │         │        │    ├─> SÍ: e.preventDefault() + scroll interno
      │         │        │    │         └─> Retorna TRUE (consumido)
      │         │        │    └─> NO: Retorna FALSE (pasar a externo)
      │         │        
      │         └─> NO: scrollController.handleWheel()
      │                  └─> Cambiar slide si supera threshold
      │
      └─> Context = 'internal' → Bloquea scroll externo
```

### Sistema de Contextos

```typescript
// TracksCarousel3D notifica contexto
<CarouselCard3D
  onScrollContextChange={(isActive: boolean) => {
    scrollController.setActiveContext(isActive ? 'internal' : 'external');
  }}
/>

// Mientras scroll interno está activo:
// - scrollController.handleWheel() retorna early
// - Ningún cambio de slide puede ocurrir
// - Animaciones externas se pausan
```

---

## 📦 Integración en Componentes

### TracksCarousel3D.svelte

```svelte
<script>
  import { useScrollController } from '@/lib/hooks';
  
  const scrollController = useScrollController({
    threshold: 100,
    snapDuration: 0.8
  });
  
  // Sincronizar índice con estado
  const currentLetterIndex = $derived(scrollController.currentIndex);
  
  // Animar cambios de slide
  $effect(() => {
    if (!slidesWrapperRef) return;
    
    const slides = slidesWrapperRef.querySelectorAll('.carousel-slide');
    slides.forEach((slide, index) => {
      const position = getPosition(index);
      gsap.to(slide, {
        x, y, z, opacity, scale,
        duration: 0.8,
        ease: 'power3.out'
      });
    });
  });
  
  onMount(() => {
    scrollController.initialize(containerRef);
    scrollController.setTotalSlides(letterGroups.length);
    
    return () => scrollController.cleanup();
  });
</script>
```

### CarouselCard3D.svelte

```svelte
<script>
  import { useInnerListScroll } from '@/lib/hooks';
  
  const innerScroll = useInnerListScroll({
    lazyLoadThreshold: 0.7
  });
  
  // Lazy loading
  innerScroll.onLazyLoad = () => {
    visibleTracksCount = Math.min(visibleTracksCount + 20, tracks.length);
    setTimeout(() => innerScroll.updateBounds(), 100);
  };
  
  // Notificar scroll activo
  innerScroll.onScrollStart = () => onScrollContextChange?.(true);
  innerScroll.onScrollEnd = () => onScrollContextChange?.(false);
  
  // Resetear cuando se vuelve focus
  $effect(() => {
    if (isFocus) {
      visibleTracksCount = 20;
      innerScroll.resetScroll();
      setTimeout(() => innerScroll.updateBounds(), 100);
    }
  });
  
  onMount(() => {
    if (gridContainerRef && gridContentRef && isFocus) {
      innerScroll.initialize(gridContainerRef, gridContentRef);
    }
    return () => innerScroll.cleanup();
  });
</script>

<div class="carousel-slide">
  <div class="tracks-grid-container" bind:this={gridContainerRef}>
    <div class="tracks-grid" bind:this={gridContentRef}>
      <!-- Contenido transformado por GSAP -->
    </div>
  </div>
</div>
```

---

## 🎨 Estilos Requeridos

### Contenedor Principal
```css
.carousel-3d-container {
  overflow: hidden;  /* Obligatorio */
  touch-action: none; /* Previene gestos nativos */
}
```

### Scroll Interno
```css
.tracks-grid-container {
  position: relative;
  overflow: hidden;  /* Viewport */
}

.tracks-grid {
  will-change: transform;  /* Optimización GSAP */
  /* NO usar overflow, se maneja con transformaciones */
}
```

---

## ⚡ Optimizaciones

### 1. **Prevención de Re-renders**
- Uso de `untrack()` en setters de estado
- `$derived` solo cuando necesario
- Callbacks configurables, no reactivos

### 2. **Animaciones Eficientes**
- `will-change: transform` en elementos animados
- `force3D: true` en GSAP (hardware acceleration)
- `overwrite: true` para cancelar animaciones previas
- Cleanup automático con `ctx.revert()`

### 3. **Event Handling**
- `{ passive: false }` solo donde se necesita `preventDefault()`
- `{ passive: true }` en touchstart/touchend
- Throttling mediante acumuladores (wheel)
- Timeouts para resetear estado

### 4. **Memory Management**
- Singleton pattern en scrollController
- Factory pattern en innerScroll (una instancia por slide)
- Cleanup explícito en `onMount` return
- Kill de timelines GSAP antes de crear nuevas

---

## 🚨 Reglas Críticas

### ❌ NO HACER:
1. ❌ Usar `overflow: auto` o `overflow: scroll`
2. ❌ Mezclar scroll nativo con transformaciones GSAP
3. ❌ Olvidar `preventDefault()` en handlers
4. ❌ Crear múltiples instancias de scrollController
5. ❌ Animar sin verificar que el elemento exista
6. ❌ Ignorar el cleanup de event listeners

### ✅ SIEMPRE:
1. ✅ Inicializar hooks en `onMount`
2. ✅ Retornar cleanup function
3. ✅ Usar `bind:this` para referencias DOM
4. ✅ Verificar refs antes de usar (`if (!ref) return`)
5. ✅ Actualizar bounds después de cambios de contenido
6. ✅ Usar `setTimeout` para operaciones post-render

---

## 🧪 Testing Checklist

- [ ] Scroll con rueda del mouse cambia slides
- [ ] Touch gestures funcionan en móvil
- [ ] Scroll interno no cambia slides accidentalmente
- [ ] Lazy loading se activa al 70%
- [ ] Animaciones son fluidas (60fps)
- [ ] No hay scroll bleed entre contextos
- [ ] Límites de scroll se respetan (inicio/fin)
- [ ] Inercia se siente natural
- [ ] Snap a slides es preciso
- [ ] AlphabetNav funciona correctamente
- [ ] Reseteo al cambiar de isla funciona
- [ ] No hay memory leaks (DevTools Profiler)
- [ ] Touch rápido no genera múltiples cambios
- [ ] Wheel acumulado no genera saltos

---

## 📚 Exportaciones

```typescript
// src/lib/hooks/index.ts
export { useScrollController } from './useScrollController.svelte';
export type { 
  UseScrollControllerReturn, 
  ScrollContext, 
  ScrollControllerConfig 
} from './useScrollController.svelte';

export { useInnerListScroll } from './useInnerListScroll.svelte';
export type { 
  UseInnerListScrollReturn, 
  InnerScrollConfig 
} from './useInnerListScroll.svelte';
```

---

## 🎯 Beneficios del Sistema

1. **Control Total**: Ningún comportamiento del navegador interfiere
2. **Sin Scrollbars**: UI limpia y moderna
3. **Fluido**: GSAP garantiza 60fps
4. **Modular**: Hooks reutilizables en cualquier componente
5. **Svelte 5 Native**: Usa runes y patrones modernos
6. **Type-Safe**: TypeScript completo
7. **Predictible**: Sistema de prioridades claro
8. **Performante**: Lazy loading + virtualization ready

---

## 🔮 Extensiones Futuras

- Soporte para scroll horizontal
- Teclado navigation (flechas)
- Scroll programático con API externa
- Snappoints personalizados (no solo slides)
- Parallax effects opcionales
- Configuración per-slide de velocidad
- Gestos multi-touch (pinch, rotate)
