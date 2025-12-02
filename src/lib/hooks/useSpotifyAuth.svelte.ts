import { TauriCommands, type SpotifyUser } from '@/lib/utils/tauriCommands';

const { checkSpotifyAuth, getSpotifyProfile, authenticateSpotify, logoutSpotify } = TauriCommands;

// Re-exportar tipo para compatibilidad
export type SpotifyUserProfile = SpotifyUser;

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON PATTERN - Evita múltiples instancias con estados desincronizados
// ═══════════════════════════════════════════════════════════════════════════

let _instance: ReturnType<typeof createSpotifyAuthInternal> | null = null;

/**
 * Hook para manejar autenticación de Spotify
 * Gestiona el estado de autenticación y perfil del usuario
 * 
 * ⚠️ SINGLETON: Todas las llamadas retornan la misma instancia
 */
export function useSpotifyAuth() {
  if (!_instance) {
    _instance = createSpotifyAuthInternal();
  }
  return _instance;
}

/**
 * Reset para testing - NO usar en producción
 */
export function resetSpotifyAuthInstance() {
  _instance = null;
}

function createSpotifyAuthInternal() {
  let isAuthenticated = $state(false);
  let isLoading = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let error = $state<string | null>(null);

  /**
   * Verifica si el usuario está autenticado
   */
  async function checkAuth(): Promise<boolean> {
    try {
      isAuthenticated = await checkSpotifyAuth();
      
      if (isAuthenticated) {
        await loadProfile();
      }
      
      return isAuthenticated;
    } catch (err) {
      console.error('❌ Error verificando autenticación:', err);
      error = err instanceof Error ? err.message : String(err);
      isAuthenticated = false;
      return false;
    }
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  async function loadProfile(): Promise<void> {
    try {
      profile = await getSpotifyProfile();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error cargando perfil';
      error = errorMsg;
      console.error('❌ Error cargando perfil:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Autentica al usuario con Spotify OAuth
   */
  async function authenticate(): Promise<void> {
    if (isLoading) {
      console.warn('⚠️ Autenticación ya en progreso');
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      await authenticateSpotify();
      isAuthenticated = true;
      await loadProfile();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
      error = errorMsg;
      isAuthenticated = false;
      console.error('❌ Error de autenticación:', errorMsg);
      throw new Error(errorMsg);
    } finally {
      isLoading = false;
    }
  }

  /**
   * Cierra sesión y limpia el estado
   */
  async function logout(): Promise<void> {
    try {
      await logoutSpotify();
      isAuthenticated = false;
      profile = null;
      error = null;
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err);
      // Aún así limpiamos el estado local
      isAuthenticated = false;
      profile = null;
    }
  }

  return {
    // Estado
    get isAuthenticated() { return isAuthenticated; },
    get isLoading() { return isLoading; },
    get profile() { return profile; },
    get error() { return error; },
    set error(value: string | null) { error = value; },
    
    // Acciones
    checkAuth,
    authenticate,
    logout,
    loadProfile
  };
}
