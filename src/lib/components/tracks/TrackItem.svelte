<script lang="ts">
  import type { SpotifyTrackWithDownload } from '@/lib/hooks/useSpotifyTracks.svelte';
  import gsap from 'gsap';
  import { onMount } from 'svelte';

  let {
    track,
    onDownload
  }: {
    track: SpotifyTrackWithDownload;
    onDownload?: () => void;
  } = $props();

  let trackRef = $state<HTMLElement>();
  let ctx: gsap.Context | null = null;

  onMount(() => {
    // Crear contexto GSAP para animaciones
    if (trackRef) {
      ctx = gsap.context(() => {
        // Animación de entrada
        gsap.from(trackRef!, {
          opacity: 0,
          y: 10,
          duration: 0.3,
          ease: "power2.out"
        });
      }, trackRef);
    }

    return () => ctx?.revert();
  });

  // 🎵 Formatear duración
  const formattedDuration = $derived(formatDuration(track.durationMs));

  // 🎵 Estado de descarga
  const downloadIcon = $derived(getDownloadIcon(track.downloadState));
  const downloadText = $derived(getDownloadText(track.downloadState));
  const isDownloading = $derived(track.downloadState === 'downloading');
  const isDownloaded = $derived(track.downloadState === 'completed');
  const showDownloadButton = $derived(track.downloadState !== 'completed'); // No mostrar botón si ya está descargada

  function formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function getDownloadIcon(state?: string): string {
    switch (state) {
      case 'downloading': return '⟳';
      case 'downloaded': return '✅';
      case 'error': return '❌';
      default: return '⬇️';
    }
  }

  function getDownloadText(state?: string): string {
    switch (state) {
      case 'downloading': return 'Descargando...';
      case 'downloaded': return 'Descargada';
      case 'error': return 'Error';
      default: return 'Descargar';
    }
  }

  function handleMouseEnter() {
    if (!trackRef) return;
    gsap.to(trackRef, {
      scale: 1.01,
      ease: "power2.out",
      duration: 0.2,
      overwrite: true
    });
  }

  function handleMouseLeave() {
    if (!trackRef) return;
    gsap.to(trackRef, {
      scale: 1,
      ease: "power2.out",
      duration: 0.2,
      overwrite: true
    });
  }

  function handleDownload() {
    if (onDownload && !isDownloading) {
      // Animación de click
      if (trackRef) {
        gsap.to(trackRef, {
          scale: 0.98,
          duration: 0.1,
          ease: "power2.out",
          yoyo: true,
          repeat: 1,
          overwrite: true
        });
      }
      onDownload();
    }
  }

  // Animación para botones
  function animateButton(button: HTMLElement, isHover: boolean) {
    gsap.to(button, {
      scale: isHover ? 1.1 : 1,
      duration: 0.2,
      ease: "power2.out",
      overwrite: true
    });
  }
</script>

<div
  bind:this={trackRef}
  class="track-item"
  role="button"
  tabindex="0"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- 🎵 Portada del álbum -->
  <div class="album-art-container">
    {#if track.albumImage}
      <img
        src={track.albumImage}
        alt="Portada de {track.album}"
        class="album-art"
        loading="lazy"
      />
    {:else}
      <div class="album-art-placeholder">
        🎵
      </div>
    {/if}
  </div>

  <!-- 📋 Información de la canción -->
  <div class="track-info">
    <div class="track-title">{track.name}</div>
    <div class="track-artists">
      {track.artists.join(', ')}
    </div>
    <div class="track-album">{track.album}</div>
  </div>

  <!-- ⏱️ Duración -->
  <div class="track-duration">
    {formattedDuration}
  </div>

  <!-- 🔗 Enlaces externos -->
  <div class="track-actions">
    {#if track.externalUrl}
      <a
        href={track.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="action-link spotify-link"
        title="Abrir en Spotify"
      >
        <span class="action-icon">🎵</span>
      </a>
    {/if}

    {#if showDownloadButton}
      <button
        class="download-btn"
        onclick={handleDownload}
        disabled={isDownloading}
        title={downloadText}
        class:downloading={isDownloading}
        class:error={track.downloadState === 'error'}
      >
        {#if isDownloading}
          <span class="downloading-spinner action-icon">{downloadIcon}</span>
        {:else}
          <span class="action-icon">{downloadIcon}</span>
        {/if}
      </button>
    {:else if isDownloaded}
      <!-- Mostrar indicador de descargado sin botón -->
      <div class="downloaded-indicator" title="Ya descargada">
        <span class="action-icon">✅</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .track-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--background-secondary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    margin-bottom: 0.5rem;
    cursor: pointer;
  }

  .track-item:hover {
    background: var(--background-hover);
    border-color: var(--primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .album-art-container {
    flex-shrink: 0;
    width: 50px;
    height: 50px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--background-tertiary);
  }

  .album-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.2s ease;
  }

  .album-art-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: var(--text-muted);
    background: var(--background-tertiary);
  }

  .track-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
  }

  .track-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .track-artists {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .track-album {
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .track-duration {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }

  .track-actions {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-shrink: 0;
  }

  .action-link,
  .download-btn,
  .downloaded-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .action-link.spotify-link {
    background: linear-gradient(135deg, #1DB954, #1aa34a);
    color: white;
    border: none;
    box-shadow: 0 2px 8px rgba(29, 185, 84, 0.3);
  }

  .action-link.spotify-link:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);
  }

  .download-btn {
    background: var(--background-tertiary);
    border: 2px solid var(--border-color);
    color: var(--text-muted);
    font-weight: 500;
  }

  .download-btn:hover:not(:disabled) {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 16px rgba(0, 123, 255, 0.3);
  }

  .download-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .download-btn.downloading {
    background: linear-gradient(135deg, #ffc107, #ff8c00);
    border-color: #ffc107;
    animation: pulse 2s infinite;
  }

  .download-btn.error {
    background: linear-gradient(135deg, #dc3545, #c82333);
    border-color: #dc3545;
    color: white;
  }

  .downloaded-indicator {
    background: linear-gradient(135deg, #28a745, #20c997);
    color: white;
    border: 2px solid #28a745;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
  }

  .action-icon {
    font-size: 1.2rem;
    line-height: 1;
    transition: transform 0.2s ease;
  }

  .action-link:hover .action-icon,
  .download-btn:hover:not(:disabled) .action-icon {
    transform: scale(1.1);
  }

  .downloading-spinner {
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @media (max-width: 768px) {
    .track-item {
      gap: 0.75rem;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .album-art-container {
      width: 50px;
      height: 50px;
    }

    .track-title {
      font-size: 0.9rem;
    }

    .track-artists,
    .track-album {
      font-size: 0.8rem;
    }

    .track-duration {
      font-size: 0.8rem;
    }

    .track-actions {
      gap: 0.5rem;
    }

    .action-link,
    .download-btn,
    .downloaded-indicator {
      width: 36px;
      height: 36px;
    }

    .action-icon {
      font-size: 1.1rem;
    }
  }
</style>