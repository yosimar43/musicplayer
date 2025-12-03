# Music Player - AI Coding Guide

##  Quick Reference

**Desktop app** con **Tauri 2.x** + **Svelte 5** combinando reproducción local con Spotify.

### Stack
- **Frontend**: Svelte 5 (runes only), SvelteKit 2.x, Tailwind CSS 4.x (CSS-first config), shadcn-svelte, GSAP
- **Backend**: Rust (Tauri 2.x), rspotify, audiotags, tokio, thiserror

---

##  Arquitectura

### Patrón de Separación de Responsabilidades

```

                      COMPONENTES                            
  (UI pura, consume hooks para acciones)                     
  Ejemplo: MusicCard3D usa usePlayer hook                    

                          
                          

                        HOOKS                                
  (Orquestación, I/O, eventos, side effects)                 
  usePlayer, useLibrary, useSpotifyAuth, etc.                

                          
                          

                       STORES                                
  (Estado PURO, sin I/O, sin side effects)                   
  playerStore, libraryStore, musicDataStore, etc.            

```

### Estructura de Archivos
```
src/lib/
 stores/          # Estado PURO (sin I/O, sin side effects)
    player.store.svelte.ts    # Estado reproducción
    library.store.svelte.ts   # Estado biblioteca
    ...
 hooks/           # ORQUESTACIÓN (I/O, eventos, lifecycle)
    usePlayer.svelte.ts       #  Orquesta playerStore + audioManager
    useLibrary.svelte.ts      # Biblioteca con eventos Tauri
    useMasterHook.svelte.ts   #  Orquestador central
    ...
 utils/
     tauriCommands.ts          #  TODOS los invokes aquí
     audioManager.ts           # Audio via callbacks (sin imports stores)

src-tauri/src/
 commands/        # Thin controllers
 services/        # Business logic
 domain/          # DTOs
 errors/          # thiserror types
```

---

##  Svelte 5 Runes (OBLIGATORIO)

**NO uses sintaxis de Svelte 4. Solo runes.**

### Core Runes
```typescript
//  $state - Variables reactivas
let count = $state(0);
let user = $state({ name: "John", age: 25 });

//  $derived - Valores computados
let doubled = $derived(count * 2);

//  $effect - Efectos secundarios
$effect(() => {
  console.log("Count changed:", count);
  return () => console.log("cleanup");
});

//  $props - Props de componentes
let { title, onclick, disabled = false } = $props();
```

### Eventos (Sin colon)
```svelte
<!--  Correcto -->
<button onclick={handleClick}>Click</button>

<!--  Incorrecto -->
<button on:click={handleClick}>Click</button>
```

---

##  Sistema de Estado

### 1. Stores = Estado PURO

**Regla**: Los stores contienen SOLO estado reactivo. Sin I/O, sin side effects, sin imports de audioManager o TauriCommands.

```typescript
// src/lib/stores/player.store.svelte.ts
class PlayerStore {
  // Estado reactivo
  current = $state<Track | null>(null);
  
  //  Solo setters simples (sin lógica de I/O)
  setCurrent(track: Track | null) { 
    untrack(() => { this.current = track; }); 
  }
}
export const playerStore = new PlayerStore();
```

### 2. Hooks = Orquestación

**Regla**: Los hooks manejan TODA la lógica de I/O, eventos y side effects. Orquestan stores con servicios externos.

```typescript
// src/lib/hooks/usePlayer.svelte.ts
export function usePlayer() {
  // Singleton pattern interno
  
  const play = async (track: MusicFile) => {
    await audioManager.play(track.path); // I/O
    playerStore.setCurrent(track);       // Store update
  };

  return {
    get current() { return playerStore.current; }, // Getter reactivo
    play
  };
}
```

### 3. audioManager = Callbacks

**Regla**: `audioManager` es un Singleton. NO importa stores. Usa callbacks para notificar cambios.

---

##  Tauri Integration

### TauriCommands (OBLIGATORIO)

** NUNCA uses `invoke()` directo. Solo `TauriCommands`.**

```typescript
import { TauriCommands } from "$lib/utils/tauriCommands";

//  Correcto
await TauriCommands.scanMusicFolder(path);
```

### Backend (Rust)

- **Commands**: Thin controllers que retornan `ApiResponse<T>`.
- **Services**: Lógica de negocio pura.
- **Eventos**: Usar `app_handle.emit("event-name", payload)` para progreso.

---

##  Tailwind CSS 4.x

**Configuración CSS-first**: La configuración del tema está en `src/styles/app.css` usando `@theme`.

```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
}
```

- No buscar `tailwind.config.js` para colores, mirar `app.css`.
- Usar variables CSS nativas para modo oscuro (`oklch`).

---

##  Common Pitfalls

-  **Svelte 4 syntax**: Usar `$state` no `let`, `$derived` no `$:`
-  **Store con I/O**: Stores solo estado puro, hooks manejan I/O
-  **Direct invokes**: Siempre usar `TauriCommands`
-  **Sin cleanup**: Llamar `cleanup()` en hooks con listeners
-  **Mutex deadlocks**: Liberar guards de Rust temprano
-  **Destructuring proxies**: Rompe reactividad en Svelte 5 (`const { count } = store`  -> `store.count` )

