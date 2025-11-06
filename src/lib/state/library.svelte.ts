import { invoke } from "@tauri-apps/api/core";

export interface Track {
  path: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  year: number | null;
  genre: string | null;
}

class LibraryState {
  tracks = $state<Track[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  currentDirectory = $state<string | null>(null);
  
  // Estadísticas derivadas
  totalTracks = $derived(this.tracks.length);
  totalDuration = $derived(
    this.tracks.reduce((acc, track) => acc + (track.duration || 0), 0)
  );
  artists = $derived(
    [...new Set(this.tracks.map(t => t.artist).filter(Boolean))]
  );
  albums = $derived(
    [...new Set(this.tracks.map(t => t.album).filter(Boolean))]
  );
}

export const library = new LibraryState();

/**
 * Carga la biblioteca de música desde un directorio
 */
export async function loadLibrary(directory: string) {
  library.isLoading = true;
  library.error = null;
  
  try {
    console.log('🔍 Escaneando directorio:', directory);
    const result = await invoke<Track[]>("scan_music_folder", { 
      folderPath: directory 
    });
    
    library.tracks = result;
    library.currentDirectory = directory;
    library.error = null;
    
    console.log('✅ Cargadas', result.length, 'canciones');
    return result;
  } catch (e) {
    const errorMsg = String(e);
    library.error = errorMsg;
    console.error('❌ Error cargando biblioteca:', errorMsg);
    throw e;
  } finally {
    library.isLoading = false;
  }
}

/**
 * Carga la carpeta de música predeterminada del sistema
 */
export async function loadDefaultLibrary() {
  try {
    const defaultFolder = await invoke<string>("get_default_music_folder");
    return await loadLibrary(defaultFolder);
  } catch (e) {
    console.error('❌ Error obteniendo carpeta predeterminada:', e);
    throw e;
  }
}

/**
 * Obtiene metadata de un archivo específico
 */
export async function getTrackMetadata(filePath: string): Promise<Track> {
  return await invoke<Track>("get_audio_metadata", { filePath });
}

/**
 * Busca tracks por título, artista o álbum
 */
export function searchTracks(query: string): Track[] {
  const lowerQuery = query.toLowerCase();
  return library.tracks.filter(track => 
    track.title?.toLowerCase().includes(lowerQuery) ||
    track.artist?.toLowerCase().includes(lowerQuery) ||
    track.album?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filtra tracks por artista
 */
export function getTracksByArtist(artist: string): Track[] {
  return library.tracks.filter(track => track.artist === artist);
}

/**
 * Filtra tracks por álbum
 */
export function getTracksByAlbum(album: string): Track[] {
  return library.tracks.filter(track => track.album === album);
}

/**
 * Limpia la biblioteca
 */
export function clearLibrary() {
  library.tracks = [];
  library.currentDirectory = null;
  library.error = null;
}
