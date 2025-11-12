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
      console.log('🔐 Verificando autenticación...');
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      
      if (isAuthenticated) {
        console.log('✅ Usuario autenticado');
        await loadProfile();
      } else {
        console.log('❌ Usuario no autenticado');
      }
      
      return isAuthenticated;
    } catch (err: any) {
      console.error('❌ Error checking authentication:', err);
      error = err.toString();
      return false;
    }
  }

  /**
   * Carga el perfil del usuario autenticado
   */
  async function loadProfile(): Promise<void> {
    try {
      profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
      console.log('👤 Perfil cargado:', profile?.display_name);
    } catch (err: any) {
      error = err.toString();
      console.error('❌ Error loading profile:', err);
      throw err;
    }
  }

  /**
   * Autentica al usuario con Spotify OAuth
   */
  async function authenticate(): Promise<void> {
    isLoading = true;
    error = null;
    
    try {
      await invoke('spotify_authenticate');
      isAuthenticated = true;
      await loadProfile();
      console.log('✅ Autenticación exitosa');
    } catch (err: any) {
      error = err.toString();
      console.error('❌ Error authenticating:', err);
      throw err;
    } finally {
      isLoading = false;
    }
  }

  /**
   * Cierra sesión (limpia estado local)
   */
  function logout(): void {
    isAuthenticated = false;
    profile = null;
    console.log('👋 Sesión cerrada');
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
