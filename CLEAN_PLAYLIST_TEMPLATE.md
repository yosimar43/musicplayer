# Plantilla Limpia - Función playPreview

Reemplaza la función `playPreview` en `src/routes/playlists/+page.svelte` con esto:

```typescript
async function playPreview(track: SpotifyTrack) {
  console.log('🎵 Canción seleccionada para reproducir:');
  console.log({
    id: track.id,
    nombre: track.name,
    artistas: track.artists.join(', '),
    album: track.album,
    imagen_album: track.album_image,
    duracion_ms: track.duration_ms,
    uri_spotify: track.uri
  });
  
  // TODO: Aquí puedes implementar tu propia lógica de reproducción
  // Datos disponibles:
  // - track.id: ID único de Spotify
  // - track.name: Nombre de la canción
  // - track.artists: Array de nombres de artistas
  // - track.album: Nombre del álbum  
  // - track.album_image: URL de la imagen del álbum
  // - track.duration_ms: Duración en milisegundos
  // - track.uri: URI de Spotify (spotify:track:xxx)
}
```

## Imports necesarios (eliminar lo que no uses):

```typescript
// MANTENER - Obtención de datos de Spotify
import { onMount } from 'svelte';
import { invoke } from '@tauri-apps/api/core';

// MANTENER - UI Components
import * as Card from "$lib/components/ui/card";
import * as Table from "$lib/components/ui/table";
import { Button } from "$lib/components/ui/button";
import StatsCard from "$lib/components/StatsCard.svelte";
import PlaylistSlider from "$lib/components/PlaylistSlider.svelte";
import AnimatedBackground from "$lib/components/AnimatedBackground.svelte";

// ELIMINAR - Ya no se usan para reproducción
// import { searchYouTubeMusic, getYouTubeAudioStream, getBestAudioUrl } from '$lib/utils/youtubeMusicApi';
// import { audioManager } from '$lib/utils/audioManager';
// import { player } from '@/lib/state/player.svelte';
// import { trackMetadataStore } from '@/lib/stores/trackMetadata';
```

## Lo que la app HACE ahora:

✅ Obtiene lista completa de canciones del usuario desde Spotify (2111+ canciones)
✅ Muestra todas las playlists
✅ Muestra estadísticas (top artistas, álbumes, etc.)
✅ Búsqueda y filtrado
✅ UI completa con animaciones
✅ Datos completos de cada canción (nombre, artista, álbum, imagen, duración, URI)

## Lo que la app NO hace (para que tú implementes):

❌ Reproducir música (eliminado completamente)
❌ Integración con YouTube Music (eliminado)
❌ Audio player (eliminado)

## Próximos pasos sugeridos:

1. Implementa tu propia lógica de búsqueda/streaming en `playPreview()`
2. Usa los datos de Spotify como metadatos solamente
3. Conecta con cualquier servicio de streaming que prefieras
