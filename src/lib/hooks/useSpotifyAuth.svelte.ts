import { TauriCommands, type SpotifyUser } from '@/lib/utils/tauriCommands';
import { spotifyAuthStore } from '@/lib/stores';

const { checkSpotifyAuth, getSpotifyProfile, authenticateSpotify, logoutSpotify } = TauriCommands;

// Re-exportar tipo para compatibilidad
export type SpotifyUserProfile = SpotifyUser;

/**
 * Hook para manejar autenticación de Spotify
 * Gestiona el estado de autenticación y perfil del usuario usando store global
 *
 * No necesita singleton porque:
 * - No tiene event listeners externos (addEventListener, Tauri listen)
 * - El estado vive en el store global, compartido entre todas las instancias
 */
export function useSpotifyAuth() {

  /**
   * Verifica si el usuario está autenticado
   */
  async function checkAuth(): Promise<boolean> {
    try {
      spotifyAuthStore.setLoading(true);
      const authenticated = await checkSpotifyAuth();
      spotifyAuthStore.setAuthenticated(authenticated);

      if (authenticated) {
        await loadProfile();
      }

      return authenticated;
    } catch (err) {
      console.error('❌ Error verificando autenticación:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      spotifyAuthStore.setError(errorMsg);
      spotifyAuthStore.setAuthenticated(false);
      return false;
    } finally {
      spotifyAuthStore.setLoading(false);
    }
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  async function loadProfile(): Promise<void> {
    try {
      const profile = await getSpotifyProfile();
      spotifyAuthStore.setProfile(profile);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error cargando perfil';
      spotifyAuthStore.setError(errorMsg);
      console.error('❌ Error cargando perfil:', errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Autentica al usuario con Spotify OAuth
   */
  async function authenticate(): Promise<void> {
    if (spotifyAuthStore.isLoading) {
      console.warn('⚠️ Autenticación ya en progreso');
      return;
    }

    console.log('🔐 Iniciando autenticación con Spotify...');
    spotifyAuthStore.setLoading(true);
    spotifyAuthStore.setError(null);

    try {
      console.log('📤 Llamando comando Tauri spotify_authenticate...');
      const result = await authenticateSpotify();
      console.log('✅ Comando Tauri completado:', result);
      
      spotifyAuthStore.setAuthenticated(true);
      console.log('✅ Estado de autenticación actualizado a true');
      
      await loadProfile();
      console.log('🎉 Perfil cargado exitosamente');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
      spotifyAuthStore.setError(errorMsg);
      spotifyAuthStore.setAuthenticated(false);
      console.error('❌ Error de autenticación:', errorMsg);
      throw new Error(errorMsg);
    } finally {
      spotifyAuthStore.setLoading(false);
    }
  }

  /**
   * Cierra sesión y limpia el estado
   */
  async function logout(): Promise<void> {
    try {
      await logoutSpotify();
      spotifyAuthStore.reset();
    } catch (err) {
      console.error('❌ Error cerrando sesión:', err);
      // Aún así limpiamos el estado
      spotifyAuthStore.reset();
    }
  }

  return {
    // Estado (desde store global)
    get isAuthenticated() { return spotifyAuthStore.isAuthenticated; },
    get isLoading() { return spotifyAuthStore.isLoading; },
    get profile() { return spotifyAuthStore.profile; },
    get error() { return spotifyAuthStore.error; },

    // Acciones
    checkAuth,
    authenticate,
    logout,
    loadProfile
  };
}
