# 🎵 Music Player - Tauri + SvelteKit + Spotify

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue.svg)
![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)

> Aplicación de escritorio multiplataforma con **Tauri 2.x** y **Svelte 5** que combina reproducción de archivos locales con datos de **Spotify** y descarga de canciones.

---

## ✨ Características

### 🎵 Reproducción Local
- ✅ **Auto-carga de biblioteca**: Recuerda tu última carpeta y carga al inicio.
- ✅ **Persistencia**: Volumen y preferencias guardadas automáticamente.
- ✅ Multi-formato (MP3, FLAC, WAV, OGG, AAC).
- ✅ Extracción automática de metadata (ID3 tags).
- ✅ Enriquecimiento con Last.fm (portadas, géneros, bios).
- ✅ Escaneo con progreso en tiempo real.
- ✅ Cola, shuffle y repeat.
- ✅ MediaSession API integrada.

### 📊 Integración Spotify
- ✅ Autenticación OAuth 2.0.
- ✅ Biblioteca completa (streaming progresivo).
- ✅ Playlists y top tracks.
- ✅ **Descarga con spotdl**.
- ✅ Auto-sync: marca canciones descargadas.

### 🎨 Interfaz
- ✅ Diseño glassmorphism con tema azul-gris.
- ✅ Componentes accesibles (shadcn-svelte).
- ✅ **Tailwind CSS 4**: Estilos modernos y performantes.
- ✅ Animaciones fluidas (CSS Transitions).

---

## 🏗️ Arquitectura

### Frontend (Svelte 5 + Runes)
El proyecto utiliza **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) para una reactividad granular y eficiente.

```
src/lib/
├── stores/          # Estado global (singleton classes .svelte.ts)
│   ├── player.store.svelte.ts       # Reproductor y controles
│   ├── library.store.svelte.ts      # Biblioteca local
│   ├── musicData.store.svelte.ts    # Cache Last.fm
│   ├── enrichment.store.svelte.ts   # Progreso enriquecimiento
│   ├── playlist.store.svelte.ts     # Playlists de Spotify
│   ├── ui.store.svelte.ts           # Preferencias UI
│   ├── search.store.svelte.ts       # Estado de búsqueda
│   └── index.ts                     # Barrel exports
├── hooks/           # Estado local por componente
│   ├── useMasterHook.svelte.ts      # ⚠️ Orquestador central de todos los hooks
│   ├── useLibrary.svelte.ts
│   ├── usePlayerPersistence.svelte.ts
│   ├── useSpotifyAuth.svelte.ts
│   ├── useSpotifyTracks.svelte.ts
│   ├── useSpotifyPlaylists.svelte.ts
│   ├── useDownload.svelte.ts
│   ├── useLibrarySync.svelte.ts
│   ├── usePersistedState.svelte.ts
│   ├── usePlayerUI.svelte.ts
│   ├── useTrackFilters.svelte.ts
│   ├── useUI.svelte.ts
│   ├── useAlbumArt.svelte.ts
│   └── index.ts
└── utils/
    └── tauriCommands.ts  # ⚠️ TODOS los invokes van aquí
```

### Backend (Rust + Tauri)
```
src-tauri/src/
├── commands/        # Thin controllers
├── services/        # Lógica de negocio
│   ├── file.rs          # Escaneo + metadata
│   ├── spotify.rs       # OAuth + API
│   └── download.rs      # spotdl wrapper
├── domain/          # DTOs y modelos
└── errors/          # thiserror types
```

---

## 🏪 Patrón de Estado (Stores Reactivos)

Utilizamos un patrón de **Stores Globales Singleton** implementados con clases y Runes.

### Ventajas
1.  **Type Safety**: Interfaces estrictas para cada store.
2.  **Reactividad Granular**: Solo se actualizan los componentes que usan propiedades específicas.
3.  **Organización por Dominio**: Cada store maneja una responsabilidad clara.

### Ejemplo de Implementación
```typescript
// src/lib/stores/player.store.svelte.ts
class PlayerStore {
  // Estado reactivo con Runes
  current = $state<Track | null>(null);
  isPlaying = $state(false);
  volume = $state(DEFAULT_VOLUME);
  
  // Estado derivado
  hasTrack = $derived(!!this.current);
  
  // Acciones (métodos de clase)
  play(track: Track) {
    this.current = track;
    this.isPlaying = true;
  }
}

// Exportar instancia única (Singleton)
export const playerStore = new PlayerStore();
```

### Uso en Componentes
```svelte
<script>
  import { playerStore } from '@/lib/stores/player.store.svelte';
</script>

{#if playerStore.hasTrack}
  <div class="player">
    <button onclick={() => playerStore.play(track)}>Play</button>
    <span>Volumen: {playerStore.volume}%</span>
  </div>
{/if}
```

---

## 🎼 Sistema de Hooks y Orquestación

### Master Hook (useMasterHook)

El `useMasterHook` es el **orquestador central** que coordina todos los hooks de la aplicación, asegurando inicialización ordenada, dependencias correctas y cleanup automático.

**Ventajas**:
- ✅ Inicialización secuencial (auth → library → UI)
- ✅ Dependencias forzadas (Spotify hooks requieren auth)
- ✅ Cleanup automático de event listeners
- ✅ Estado consistente entre componentes

**Uso recomendado**:
```typescript
// En el componente raíz (App.svelte)
import { useMasterHook } from '@/lib/hooks';

const { initializeApp, logout } = useMasterHook();

// Inicializar al montar
$effect(() => {
  initializeApp();
  return () => logout();  // Cleanup al desmontar
});
```

**Hooks orquestados**:
- `useSpotifyAuth` - Base para todos los hooks de Spotify
- `useLibrary` - Biblioteca local (independiente)
- `useSpotifyTracks` - Depende de auth
- `useSpotifyPlaylists` - Depende de auth
- `useDownload` - Depende de auth, actualiza flags inmediatamente
- `useLibrarySync` - Sincroniza flags de descarga
- `usePlayerPersistence` - Persistencia de volumen
- `useUI` - Preferencias UI
- `useTrackFilters` - Filtros de búsqueda
- `useAlbumArt` - Cache de portadas

---

## 🎨 Interfaz Modularizada

### Navbar Componentes

La barra de navegación está modularizada en componentes reutilizables:

- **Logo.svelte**: Logo animado con reactor effect y contador de tracks
- **SearchBar.svelte**: Barra de búsqueda con efectos de foco
- **NavLinks.svelte**: Enlaces de navegación con indicadores activos
- **MobileToggle.svelte**: Botón hamburguesa para móvil
- **MobileMenu.svelte**: Menú desplegable para móvil

**Características**:
- ✅ Animaciones GSAP fluidas
- ✅ Auto-hide basado en scroll
- ✅ Diseño responsive
- ✅ Estado reactivo con stores

---

### Prerrequisitos
- **Node.js** 18+ y **pnpm**
- **Rust** stable (instalado automáticamente por Tauri)
- **Python 3.8+** con pip (para spotdl, opcional)

### Pasos

1. **Clonar e instalar:**
   ```bash
   git clone https://github.com/tu-usuario/musicplayer.git
   cd musicplayer
   pnpm install
   ```

2. **Configurar Spotify (opcional):**
   Crea `.env` en la raíz:
   ```env
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
   ```

3. **Instalar spotdl (para descargas):**
   ```bash
   pip install spotdl yt-dlp
   ```

4. **Desarrollo:**
   ```bash
   pnpm tauri dev
   ```

5. **Build producción:**
   ```bash
   pnpm tauri build
   ```

---

## 🔧 Comandos Útiles

```bash
# Desarrollo (Frontend + Backend)
pnpm tauri dev

# Chequeo de Tipos (Svelte + TS)
pnpm check

# Chequeo de Rust
cd src-tauri && cargo check

# Build
pnpm tauri build
```

---

## 🛠️ Stack Tecnológico

### Frontend
- **Svelte 5** - Runes (`$state`, `$derived`, `$effect`)
- **SvelteKit 2.x** - Routing y SSR
- **TypeScript 5.x**
- **Tailwind CSS 4.x** - Styling
- **shadcn-svelte** - Componentes UI

### Backend
- **Tauri 2.x**
- **Rust** stable
- **rspotify** - Spotify Web API
- **audiotags** - Metadata extraction
- **tokio** - Async runtime

---

## 📄 Licencia

MIT License - Ver `LICENSE` para más detalles.
