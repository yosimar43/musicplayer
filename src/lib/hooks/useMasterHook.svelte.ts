/**
 * 🎯 HOOK MAESTRO: Coordinador central de todos los hooks
 * Centraliza autenticación y coordina el estado entre todos los hooks
 * Proporciona una interfaz unificada para componentes complejos
 */

import { useSpotifyAuth } from './useSpotifyAuth.svelte';
import { useSpotifyTracks } from './useSpotifyTracks.svelte';
import { useSpotifyPlaylists } from './useSpotifyPlaylists.svelte';
import { useLibrary } from './useLibrary.svelte';
import { useDownload } from './useDownload.svelte';
import { usePlayerUI } from './usePlayerUI.svelte';
import { useUI } from './useUI.svelte';

export interface MasterHookReturn {
  // 🔐 Autenticación (base de todo)
  auth: ReturnType<typeof useSpotifyAuth>;

  // 🎵 Spotify
  spotifyTracks: ReturnType<typeof useSpotifyTracks>;
  spotifyPlaylists: ReturnType<typeof useSpotifyPlaylists>;

  // 📚 Biblioteca local
  library: ReturnType<typeof useLibrary>;

  // ⬇️ Descargas
  download: ReturnType<typeof useDownload>;

  // 🎧 Reproductor UI
  playerUI: ReturnType<typeof usePlayerUI>;

  // 🎨 UI general
  ui: ReturnType<typeof useUI>;

  // 🚀 Acciones coordinadas
  initializeApp: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * 🎯 Hook maestro que coordina TODOS los hooks de la aplicación
 * Garantiza que la autenticación sea el punto central y coordina el estado
 */
export function useMasterHook(): MasterHookReturn {
  // 🔐 Autenticación como base
  const auth = useSpotifyAuth();

  // 🎵 Hooks de Spotify (dependen de auth)
  const spotifyTracks = useSpotifyTracks();
  const spotifyPlaylists = useSpotifyPlaylists();

  // 📚 Biblioteca local (independiente)
  const library = useLibrary();

  // ⬇️ Descargas (depende de auth)
  const download = useDownload();

  // 🎧 Reproductor UI (depende de playerStore)
  const playerUI = usePlayerUI();

  // 🎨 UI general
  const ui = useUI();

  /**
   * 🚀 Inicialización completa de la aplicación
   * Coordina todos los hooks en el orden correcto
   */
  async function initializeApp(): Promise<void> {
    try {
      console.log('🚀 Inicializando aplicación...');

      // 1️⃣ Verificar/cargar autenticación
      const isAuthenticated = await auth.checkAuth();
      console.log(`🔐 Autenticación: ${isAuthenticated ? '✅ OK' : '❌ No autenticado'}`);

      // 2️⃣ Cargar biblioteca local (siempre disponible)
      await library.loadLibrary();
      console.log(`📚 Biblioteca: ${library.totalTracks} tracks`);

      // 3️⃣ Si está autenticado, cargar datos de Spotify
      if (isAuthenticated) {
        console.log('🎵 Cargando datos de Spotify...');

        // Configurar listeners de descarga
        await download.setupEventListeners();

        // Cargar tracks y playlists en paralelo
        await Promise.allSettled([
          spotifyTracks.loadTracks(),
          spotifyPlaylists.loadPlaylists()
        ]);

        console.log(`✅ Spotify: ${spotifyTracks.totalTracks} tracks, ${spotifyPlaylists.totalPlaylists} playlists`);
      }

      console.log('🎉 ¡Aplicación inicializada!');
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
      throw error;
    }
  }

  /**
   * 🚪 Logout coordinado
   * Limpia todos los hooks relacionados con autenticación
   */
  async function logout(): Promise<void> {
    try {
      console.log('🚪 Cerrando sesión...');

      // 1️⃣ Logout de Spotify
      await auth.logout();

      // 2️⃣ Los efectos $effect en cada hook limpiarán automáticamente
      // useSpotifyTracks, useSpotifyPlaylists, useDownload ya tienen efectos de limpieza

      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      throw error;
    }
  }

  return {
    // Hooks individuales
    auth,
    spotifyTracks,
    spotifyPlaylists,
    library,
    download,
    playerUI,
    ui,

    // Acciones coordinadas
    initializeApp,
    logout
  };
}