<script lang="ts">
  import type { SpotifyTrackWithDownload } from '@/lib/hooks/useSpotifyTracks.svelte';
  import gsap from 'gsap';
  import { onMount } from 'svelte';

  let {
    track,
    showDownloadButton = false,
    onDownload
  }: {
    track: SpotifyTrackWithDownload;
    showDownloadButton?: boolean;
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
      onDownload();
    }
  }
</script>

<div
  bind:this={trackRef}
  class="track-item"
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
        class="action-link"
        title="Abrir en Spotify"
      >
        🎵
      </a>
    {/if}

    {#if showDownloadButton}
      <button
        class="download-btn"
        onclick={handleDownload}
        disabled={isDownloading}
        title={downloadText}
      >
        {#if isDownloading}
          <span class="downloading-spinner">{downloadIcon}</span>
        {:else}
          {downloadIcon}
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  .track-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--background-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    transition: all 0.2s ease;
  }

  .track-item:hover {
    background: var(--background-hover);
    border-color: var(--primary-color);
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
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .action-link,
  .download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    transition: all 0.2s ease;
    font-size: 1rem;
  }

  .action-link:hover {
    background: var(--background-hover);
    color: var(--primary-color);
  }

  .download-btn {
    background: var(--background-tertiary);
    border: 1px solid var(--border-color);
  }

  .download-btn:hover:not(:disabled) {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .download-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .downloading-spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .track-item {
      gap: 0.75rem;
      padding: 0.75rem;
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

    .action-link,
    .download-btn {
      width: 28px;
      height: 28px;
      font-size: 0.9rem;
    }
  }
</style>