/**
 * 🎵 SPOTIFY AUTH STORE - Estado Global de Autenticación
 *
 * PRINCIPIOS:
 * ✅ Solo estado reactivo ($state, $derived)
 * ✅ NO I/O operations directas
 * ✅ NO imports de hooks o servicios
 * ✅ Fácilmente testeable
 *
 * La lógica de autenticación se maneja en useSpotifyAuth hook
 */

import type { SpotifyUser } from '@/lib/utils/tauriCommands';

class SpotifyAuthStore {
  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADO REACTIVO
  // ═══════════════════════════════════════════════════════════════════════════

  isAuthenticated = $state(false);
  isLoading = $state(false);
  profile = $state<SpotifyUser | null>(null);
  error = $state<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // MUTADORES PUROS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Establece el estado de autenticación
   */
  setAuthenticated(authenticated: boolean) {
    this.isAuthenticated = authenticated;
  }

  /**
   * Establece el estado de carga
   */
  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  /**
   * Establece el perfil del usuario
   */
  setProfile(profile: SpotifyUser | null) {
    this.profile = profile;
  }

  /**
   * Establece un error
   */
  setError(error: string | null) {
    this.error = error;
  }

  /**
   * Resetea el estado completo
   */
  reset() {
    this.isAuthenticated = false;
    this.isLoading = false;
    this.profile = null;
    this.error = null;
  }
}

export const spotifyAuthStore = new SpotifyAuthStore();