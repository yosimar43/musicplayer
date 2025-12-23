<script lang="ts">
  import { useSpotifyAuth } from '@/lib/hooks';
  import { spotifyAuthStore } from '@/lib/stores';

  const auth = useSpotifyAuth();

  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
</script>

<!-- Spotify Auth UI - Global -->
<div class="spotify-auth-ui">
  {#if !spotifyAuthStore.isAuthenticated}
    <!-- Estado no autenticado -->
    <div class="auth-prompt">
      <div class="auth-content">
        <div class="spotify-logo">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.09 11.64-.84 16.2 1.381.48.18.78.84.6 1.44-.18.42-.84.78-1.44.42z"/>
          </svg>
        </div>
        <h3>Conecta con Spotify</h3>
        <p>Accede a tus canciones favoritas y playlists</p>
        <button
          class="auth-button"
          onclick={auth.authenticate}
          disabled={spotifyAuthStore.isLoading}
        >
          {#if spotifyAuthStore.isLoading}
            <div class="loading-spinner"></div>
            Conectando...
          {:else}
            Iniciar sesión con Spotify
          {/if}
        </button>
        {#if spotifyAuthStore.error}
          <p class="error-message">{spotifyAuthStore.error}</p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Estado autenticado - Mini perfil -->
    <div class="auth-status">
      <div class="user-info">
        {#if spotifyAuthStore.profile?.images?.[0]}
          <img
            src={spotifyAuthStore.profile.images[0]}
            alt="Profile"
            class="profile-image"
          />
        {:else}
          <div class="profile-placeholder">
            {spotifyAuthStore.profile?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
        {/if}
        <span class="user-name">
          {spotifyAuthStore.profile?.displayName || 'Usuario'}
        </span>
      </div>
      <button
        class="logout-button"
        onclick={auth.logout}
        title="Cerrar sesión"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .spotify-auth-ui {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
  }

  .auth-prompt {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    min-width: 300px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  }

  .auth-content {
    text-align: center;
  }

  .spotify-logo {
    width: 48px;
    height: 48px;
    color: #1db954;
    margin: 0 auto 16px;
  }

  .auth-content h3 {
    color: white;
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .auth-content p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    margin: 0 0 20px 0;
  }

  .auth-button {
    background: #1db954;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 12px 24px;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 auto;
  }

  .auth-button:hover:not(:disabled) {
    background: #1aa34a;
    transform: translateY(-1px);
  }

  .auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    color: #ef4444;
    font-size: 0.75rem;
    margin: 8px 0 0 0;
  }

  .auth-status {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .profile-image {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }

  .profile-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #1db954;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .user-name {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .logout-button {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logout-button:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  .logout-button svg {
    width: 16px;
    height: 16px;
  }
</style>