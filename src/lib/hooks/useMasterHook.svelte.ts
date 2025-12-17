/**
 * 🎯 HOOK MAESTRO: Coordinador central de todos los hooks
 * Centraliza autenticación y coordina el estado entre todos los hooks
 * Proporciona una interfaz unificada para componentes complejos
 * 
 * ✅ MODO LOCAL PURO: Solo funciones esenciales sin Spotify
 */

import { useLibrary } from './useLibrary.svelte';
import { usePlayer } from './usePlayer.svelte';
import { usePlayerUI } from './usePlayerUI.svelte';
import { useUI } from './useUI.svelte';
import { useKeyboard } from './useKeyboard.svelte';
import { EnrichmentService } from '@/lib/services/enrichment.service';

// ✅ Logger condicional (solo en dev)
const isDev = import.meta.env.DEV;
const log = isDev ? console.log : () => {};
const logTime = isDev ? (label: string) => {
  console.time(label);
  return () => console.timeEnd(label);
} : () => () => {};

// Imports condicionales para Spotify (solo si están disponibles)
let useSpotifyAuth: any;
let useSpotifyTracks: any;
let useSpotifyPlaylists: any;
let useDownload: any;

try {
  ({ useSpotifyAuth } = await import('./useSpotifyAuth.svelte'));
  ({ useSpotifyTracks } = await import('./useSpotifyTracks.svelte'));
  ({ useSpotifyPlaylists } = await import('./useSpotifyPlaylists.svelte'));
  ({ useDownload } = await import('./useDownload.svelte'));
} catch {
  console.log('🎵 Modo local puro - Spotify no disponible');
}

export interface MasterHookReturn {
  // 🔐 Autenticación (opcional - solo si Spotify está disponible)
  auth?: ReturnType<typeof useSpotifyAuth>;

  // 🎵 Spotify (opcional)
  spotifyTracks?: ReturnType<typeof useSpotifyTracks>;
  spotifyPlaylists?: ReturnType<typeof useSpotifyPlaylists>;

  // 📚 Biblioteca local (SIEMPRE disponible)
  library: ReturnType<typeof useLibrary>;

  // ⬇️ Descargas (opcional)
  download?: ReturnType<typeof useDownload>;

  // 🎧 Reproductor (SIEMPRE disponible)
  player: ReturnType<typeof usePlayer>;

  // 🎧 Reproductor UI (SIEMPRE disponible)
  playerUI: ReturnType<typeof usePlayerUI>;

  // 🎨 UI general (SIEMPRE disponible)
  ui: ReturnType<typeof useUI>;

  // ⌨️ Teclado global (SIEMPRE disponible)
  keyboard: ReturnType<typeof useKeyboard>;

  // 🚀 Acciones coordinadas
  initializeApp: () => Promise<void>;
  logout?: () => Promise<void>;
  
  // Estado de disponibilidad
  isSpotifyAvailable: boolean;
}

/**
 * 🎯 Hook maestro que coordina TODOS los hooks de la aplicación
 * Garantiza que la autenticación sea el punto central y coordina el estado
 * 
 * ✅ MODO LOCAL PURO: Funciona sin Spotify si no está disponible
 */
export function useMasterHook(): MasterHookReturn {
  const isSpotifyAvailable = !!(useSpotifyAuth && useSpotifyTracks && useSpotifyPlaylists && useDownload);

  // 🔐 Autenticación como base (opcional)

  // 🔐 Autenticación como base (opcional)
  const auth = isSpotifyAvailable ? useSpotifyAuth() : undefined;

  // 🎵 Hooks de Spotify (opcionales - dependen de auth)
  const spotifyTracks = isSpotifyAvailable ? useSpotifyTracks() : undefined;
  const spotifyPlaylists = isSpotifyAvailable ? useSpotifyPlaylists() : undefined;

  // 📚 Biblioteca local (SIEMPRE disponible - independiente)
  const library = useLibrary();

  // ⬇️ Descargas (opcional - depende de auth)
  const download = isSpotifyAvailable ? useDownload() : undefined;

  // 🎧 Reproductor (SIEMPRE disponible - orquesta store + audio)
  const player = usePlayer();

  // 🎧 Reproductor UI (SIEMPRE disponible - depende de playerStore)
  const playerUI = usePlayerUI();

  // 🎨 UI general (SIEMPRE disponible)
  const ui = useUI();

  // ⌨️ Teclado global (SIEMPRE disponible)
  const keyboard = useKeyboard();

  /**
   * 🚀 Inicialización completa de la aplicación
   * Coordina todos los hooks en el orden correcto
   * ✅ MODO LOCAL PURO: Funciona sin Spotify
   */
  async function initializeApp(): Promise<void> {
    try {
      const endTiming = logTime('⏱️ Total app initialization');
      
      log(`🚀 Inicializando aplicación (${isSpotifyAvailable ? 'con Spotify' : 'modo local puro'})...`);

      // Fase 1: Crítico inmediato (Reproductor)
      player.initialize();
      keyboard.initialize();
      EnrichmentService.initialize();
      log('🎵 Reproductor y teclado inicializados');

      // Fase 2: Paralelo (no bloqueante)
      // Iniciar listeners de biblioteca y checkAuth en paralelo
      const authPromise = isSpotifyAvailable && auth ? auth.checkAuth() : Promise.resolve(false);
      const libraryInitPromise = library.initialize();

      // Esperar solo lo necesario para mostrar UI básica
      const [isAuthenticated] = await Promise.all([
        authPromise,
        libraryInitPromise
      ]);
      
      log(`🔐 Autenticación Spotify: ${isAuthenticated ? '✅ OK' : '❌ No autenticado'}`);

      // Fase 3: Data load (background)
      // Usamos Promise.allSettled pero NO hacemos await para no bloquear la UI
      // La UI mostrará skeletons/loading states
      Promise.allSettled([
        library.loadLibrary(), // TODO: Optimizar a paginado en useLibrary
        isAuthenticated && download ? download.setupEventListeners() : Promise.resolve(),
        isAuthenticated && spotifyPlaylists ? spotifyPlaylists.loadPlaylists() : Promise.resolve(),
        isAuthenticated && spotifyTracks ? spotifyTracks.loadTracks() : Promise.resolve()
      ]);

      log('🎉 ¡Aplicación inicializada (background loading)!');
      endTiming();
    } catch (error) {
      console.error('❌ Error inicializando aplicación:', error);
      throw error;
    }
  }

  /**
   * 🚪 Logout coordinado (solo si Spotify está disponible)
   * Limpia todos los hooks relacionados con autenticación
   */
  async function logout(): Promise<void> {
    if (!isSpotifyAvailable || !auth) {
      console.warn('⚠️ Logout no disponible en modo local puro');
      return;
    }

    try {
      console.log('🚪 Cerrando sesión...');

      // 1️⃣ Limpiar reproductor
      player.cleanup();

      // 2️⃣ Limpiar biblioteca
      library.cleanup();

      // 3️⃣ Logout de Spotify
      await auth.logout();

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
    player,
    playerUI,
    ui,
    keyboard,

    // Acciones coordinadas
    initializeApp,
    logout: isSpotifyAvailable ? logout : undefined,
    
    // Estado
    isSpotifyAvailable
  };
}