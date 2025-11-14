import { TauriCommands, type SpotifyUser } from '@/lib/utils/tauriCommands';

// Re-exportar tipo para compatibilidad
export type SpotifyUserProfile = SpotifyUser;

/**
 * Hook para manejar autenticación de Spotify
 * Gestiona el estado de autenticación y perfil del usuario
 */
export function useSpotifyAuth() {
  let isAuthenticated = $state(false);
  let isLoading = $state(false);
  let profile = $state<SpotifyUserProfile | null>(null);
  let error = $state<string | null>(null);

  /**
   * Verifica si el usuario está autenticado
   */
  async function checkAuth(): Promise<boolean> {
    try {
      isAuthenticated = await TauriCommands.checkSpotifyAuth();
      
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
      profile = await TauriCommands.getSpotifyProfile();
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
      await TauriCommands.authenticateSpotify();
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
      await TauriCommands.logoutSpotify();
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
