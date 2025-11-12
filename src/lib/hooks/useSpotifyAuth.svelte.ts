import { invoke } from '@tauri-apps/api/core';

export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  product: string | null;
  followers: number;
  images: string[];
}

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
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      
      if (isAuthenticated) {
        await loadProfile();
      }
      
      return isAuthenticated;
    } catch (err: any) {
      console.error('❌ Error verificando autenticación:', err);
      error = err.toString();
      isAuthenticated = false;
      return false;
    }
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  async function loadProfile(): Promise<void> {
    try {
      profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Error cargando perfil';
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
      await invoke('spotify_authenticate');
      isAuthenticated = true;
      await loadProfile();
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Error de autenticación';
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
      await invoke('spotify_logout');
      isAuthenticated = false;
      profile = null;
      error = null;
    } catch (err: any) {
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
