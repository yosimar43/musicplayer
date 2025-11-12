<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { animate, stagger } from 'animejs';
  import * as Card from "@/lib/components/ui/card";
  import * as Table from "@/lib/components/ui/table";
  import { Button } from "@/lib/components/ui/button";
  import { Heart, Play, Clock, Music, Loader2, AlertCircle, TrendingUp, Pause, ExternalLink, Search, Filter, Download, RefreshCw, ChevronDown, BarChart3, Timer, LayoutGrid, Users, Sparkles, Disc, Album, User, ListMusic, Star, CheckCircle2 } from "lucide-svelte";
  import StatsCard from "@/lib/components/StatsCard.svelte";
  import PlaylistSlider from "@/lib/components/PlaylistSlider.svelte";
  import AnimatedBackground from "@/lib/components/AnimatedBackground.svelte";
  import { fadeIn, scaleIn, slideInLeft, slideInRight, staggerItems } from '@/lib/animations';
  import { formatDuration, getPopularityColor, getPopularityBgColor, getErrorMessage, markDownloadedTracks, normalizeTrackName } from '@/lib/utils/common';
  import { library } from '@/lib/state/library.svelte';
  import { searchStore } from '@/lib/stores/searchStore.svelte';

  interface SpotifyUserProfile {
    id: string;
    display_name: string | null;
    email: string | null;
    country: string | null;
    product: string | null;
    followers: number;
    images: string[];
  }

  interface SpotifyTrack {
    id: string | null;
    name: string;
    artists: string[];
    album: string;
    album_image: string | null;
    duration_ms: number;
    popularity: number | null;
    preview_url: string | null;
    external_url: string | null;
    isDownloaded?: boolean; // ✅ Campo para marcar si ya está descargada
  }

  interface SpotifyPlaylist {
    id: string;
    name: string;
    description: string | null;
    owner: string;
    tracks_total: number;
    images: string[];
    public: boolean | null;
  }

  let profile = $state<SpotifyUserProfile | null>(null);
  let savedTracks = $state<SpotifyTrack[]>([]);
  let playlists = $state<SpotifyPlaylist[]>([]);
  let isLoading = $state(false);
  let isLoadingTracks = $state(false);
  let loadingProgress = $state(0);
  let isAuthenticated = $state(false);
  let error = $state<string | null>(null);
  let activeView = $state<'liked' | 'playlists'>('liked');
  let playingTrackId = $state<string | null>(null);
  let sortBy = $state<'name' | 'artist' | 'album' | 'duration' | 'popularity'>('name');
  let sortOrder = $state<'asc' | 'desc'>('asc');
  let showFilters = $state(false);
  let filterPopularity = $state<'all' | 'high' | 'medium' | 'low'>('all');
  let showProfileCard = $state(true); // Controlar visibilidad del card de perfil
  
  // Virtual scrolling optimization
  let displayLimit = $state(100); // Mostrar solo 100 tracks inicialmente
  let showLoadMore = $state(true);
  let listenersSetup = false; // Flag para evitar duplicar listeners
  
  // 🎧 Download functionality
  let isDownloading = $state(false);
  let downloadProgress = $state<any[]>([]);
  let downloadStats = $state({ downloaded: 0, failed: 0, total: 0 });
  let spotdlInstalled = $state<boolean | null>(null);
  let showDownloadPanel = $state(false);
  
  // 🔒 Flags para prevenir cargas duplicadas
  let isInitialized = $state(false);
  let eventUnlisteners: Array<() => void> = [];

  onMount(() => {
    // Prevenir inicialización múltiple
    if (isInitialized) {
      console.log('⚠️ Ya inicializado, evitando carga duplicada');
      return;
    }
    
    console.log('🎵 Inicializando componente playlists...');
    
    // Configurar listeners de eventos una sola vez
    (async () => {
      if (!listenersSetup) {
        eventUnlisteners = await setupTrackStreamListeners();
        listenersSetup = true;
      }
      
      await checkAuth();
      isInitialized = true;
      
      // Animaciones de entrada
      setTimeout(() => {
        fadeIn('.page-header', { delay: 100 });
        slideInLeft('.stats-section', { delay: 200 });
        slideInRight('.playlists-section', { delay: 300 });
        scaleIn('.action-buttons', { delay: 400 });
      }, 50);
    })();
    
    // Cleanup al desmontar
    return () => {
      console.log('🧹 Limpiando listeners de eventos...');
      eventUnlisteners.forEach(unlisten => unlisten());
      eventUnlisteners = [];
    };
  });

  async function setupTrackStreamListeners(): Promise<Array<() => void>> {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisteners: Array<() => void> = [];
    
    console.log('🎧 Configurando listeners de eventos Spotify...');
    
    // Listener para el inicio del streaming
    const unlistenStart = await listen<{ total: number }>('spotify-tracks-start', (event) => {
      console.log(`🚀 Iniciando carga de ${event.payload.total} canciones`);
      savedTracks = [];
      loadingProgress = 0;
    });
    unlisteners.push(unlistenStart);
    
    // 🎧 Download listeners
    const unlistenDownloadProgress = await listen<any>('download-progress', (event) => {
      const data = event.payload;
      downloadProgress = [...downloadProgress, data];
      
      // Animar entrada del nuevo item
      setTimeout(() => {
        animate('.download-item', {
          translateY: [-8, 0],
          opacity: [0, 1],
          easing: 'easeOutQuad',
          duration: 350,
        });
      }, 50);
      
      console.log(`📥 [${data.index}/${data.total}] ${data.song}: ${data.status}`);
    });
    
    const unlistenSegmentFinished = await listen<any>('download-segment-finished', (event) => {
      console.log(`✅ ${event.payload.message}`);
    });
    unlisteners.push(unlistenSegmentFinished);
    
    const unlistenDownloadFinished = await listen<any>('download-finished', (event) => {
      const data = event.payload;
      isDownloading = false;
      downloadStats.downloaded = data.total_downloaded;
      downloadStats.failed = data.total_failed;
      
      // Animación de completado
      animate('.download-panel', {
        backgroundColor: ['rgba(6, 182, 212, 0.1)', 'rgba(14, 165, 233, 0.2)', 'rgba(6, 182, 212, 0.1)'],
        easing: 'easeInOutSine',
        duration: 1000
      });
      
      console.log(`🎉 ${data.message} - ${data.total_downloaded} descargadas, ${data.total_failed} fallidas`);
    });
    unlisteners.push(unlistenDownloadFinished);
    
    const unlistenDownloadError = await listen<any>('download-error', (event) => {
      console.error(`❌ Error de descarga: ${event.payload.message}`);
      error = event.payload.message;
      isDownloading = false;
      
      // Animación de error
      animate('.download-panel', {
        backgroundColor: ['rgba(239, 68, 68, 0.1)', 'rgba(220, 38, 38, 0.2)', 'rgba(239, 68, 68, 0.1)'],
        easing: 'easeInOutSine',
        duration: 800
      });
    });
    unlisteners.push(unlistenDownloadError);
    
    // Listener para cada batch de canciones
    const unlistenBatch = await listen<{ tracks: SpotifyTrack[], progress: number, loaded: number, total: number }>('spotify-tracks-batch', (event) => {
      const { tracks, progress, loaded, total } = event.payload;
      
      // Agregar las nuevas canciones
      savedTracks = [...savedTracks, ...tracks];
      loadingProgress = progress;
      
      console.log(`📥 Batch recibido: +${tracks.length} canciones (${loaded}/${total} - ${progress}%)`);
    });
    unlisteners.push(unlistenBatch);
    
    // Listener para la finalización
    const unlistenComplete = await listen<{ total: number }>('spotify-tracks-complete', (event) => {
      console.log(`✅ ¡Carga completa! ${event.payload.total} canciones cargadas`);
      
      // 🔍 Comparar con biblioteca local y marcar canciones ya descargadas
      console.log('🔍 Comparando con biblioteca local...');
      const localTracks = library.tracks.map(t => ({
        title: t.title,
        artist: t.artist
      }));
      
      savedTracks = markDownloadedTracks(savedTracks, localTracks);
      
      const downloadedCount = savedTracks.filter(t => t.isDownloaded).length;
      console.log(`✅ ${downloadedCount} de ${savedTracks.length} canciones ya están descargadas`);
      
      isLoadingTracks = false;
      loadingProgress = 100;
      
      // Iniciar animaciones después de cargar
      setTimeout(() => {
        initAnimations();
      }, 100);
    });
    unlisteners.push(unlistenComplete);
    
    // Listener para errores
    const unlistenError = await listen<{ message: string }>('spotify-tracks-error', (event) => {
      console.error('❌ Error en streaming:', event.payload.message);
      error = event.payload.message;
      isLoadingTracks = false;
      loadingProgress = 0;
    });
    unlisteners.push(unlistenError);
    
    console.log(`✅ ${unlisteners.length} listeners de eventos configurados`);
    return unlisteners;
  }

  async function checkAuth() {
    try {
      console.log('🔐 Verificando autenticación...');
      isAuthenticated = await invoke<boolean>('spotify_is_authenticated');
      
      if (isAuthenticated) {
        console.log('✅ Usuario autenticado, cargando datos...');
        // Cargar perfil
        profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
        console.log('👤 Perfil cargado:', profile.display_name);
        
        await loadAll();
      } else {
        console.log('❌ Usuario no autenticado');
      }
    } catch (err) {
      console.error('❌ Error checking authentication:', err);
    }
  }

  async function authenticate() {
    isLoading = true;
    error = null;
    try {
      await invoke('spotify_authenticate');
      isAuthenticated = true;
      // Cargar perfil después de autenticar
      profile = await invoke<SpotifyUserProfile>('spotify_get_profile');
      await loadAll();
    } catch (err: any) {
      error = err.toString();
      console.error('Error authenticating:', err);
    } finally {
      isLoading = false;
    }
  }

  async function loadAll() {
    isLoading = true;
    try {
      await Promise.all([loadSavedTracks(), loadPlaylists()]);
    } finally {
      isLoading = false;
    }
  }
  
  /**
   * 🔄 Fuerza recarga completa de datos (ignorando cache)
   */
  async function forceReload() {
    console.log('🔄 Forzando recarga completa...');
    
    // Limpiar datos existentes
    savedTracks = [];
    playlists = [];
    loadingProgress = 0;
    
    // Recargar todo
    isLoading = true;
    try {
      await Promise.all([
        invoke('spotify_stream_all_liked_songs'),
        invoke<SpotifyPlaylist[]>('spotify_get_playlists', { limit: 50 })
          .then(data => playlists = data)
      ]);
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error en recarga forzada:', err);
    } finally {
      isLoading = false;
    }
  }

  async function loadSavedTracks() {
    // Prevenir múltiples cargas simultáneas
    if (isLoadingTracks) {
      console.log('⚠️ Ya hay una carga de tracks en progreso, ignorando llamada duplicada');
      return;
    }
    
    // Si ya hay tracks cargados, preguntar si recargar
    if (savedTracks.length > 0) {
      console.log(`✅ Ya hay ${savedTracks.length} tracks cargados, evitando recarga automática`);
      return;
    }
    
    isLoadingTracks = true;
    error = null;
    savedTracks = [];
    loadingProgress = 0;
    
    try {
      console.log('🎵 Cargando TODAS las canciones guardadas con streaming progresivo...');
      
      // Usar el nuevo comando de streaming que envía datos progresivamente
      await invoke('spotify_stream_all_liked_songs');
      
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error loading tracks:', err);
      isLoadingTracks = false;
      loadingProgress = 0;
    }
  }

  async function loadPlaylists() {
    // Si ya hay playlists cargadas, evitar recarga
    if (playlists.length > 0) {
      console.log(`✅ Ya hay ${playlists.length} playlists cargadas, evitando recarga automática`);
      return;
    }
    
    error = null;
    try {
      console.log('📋 Cargando playlists...');
      playlists = await invoke<SpotifyPlaylist[]>('spotify_get_playlists', { limit: 50 });
      console.log(`✅ ${playlists.length} playlists cargadas`);
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('Error loading playlists:', err);
    }
  }



  function handleSort(column: typeof sortBy) {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'asc';
    }
  }

  let filteredTracks = $derived.by(() => {
    let tracks = savedTracks;
    
    // 🔍 Búsqueda optimizada con normalización
    const query = searchStore.query.trim();
    if (query) {
      const normalizedQuery = normalizeTrackName(query);
      
      tracks = tracks.filter(t => {
        const normalizedText = normalizeTrackName(`${t.name} ${t.artists.join(' ')} ${t.album}`);
        return normalizedText.includes(normalizedQuery);
      });
    }
    
    // Filtrar por popularidad
    if (filterPopularity !== 'all') {
      tracks = tracks.filter(t => {
        const pop = t.popularity || 0;
        switch (filterPopularity) {
          case 'high': return pop >= 70;
          case 'medium': return pop >= 40 && pop < 70;
          case 'low': return pop < 40;
          default: return true;
        }
      });
    }

    // Ordenar (sin mutar el array original)
    return [...tracks].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'artist':
          comparison = a.artists[0].localeCompare(b.artists[0]);
          break;
        case 'album':
          comparison = a.album.localeCompare(b.album);
          break;
        case 'duration':
          comparison = a.duration_ms - b.duration_ms;
          break;
        case 'popularity':
          comparison = (a.popularity || 0) - (b.popularity || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  });

  // Tracks a mostrar con paginación virtual
  let hasActiveFilters = $derived(searchStore.query.trim() || filterPopularity !== 'all');
  let displayedTracks = $derived(hasActiveFilters ? filteredTracks : filteredTracks.slice(0, displayLimit));
  
  function loadMoreTracks() {
    displayLimit += 100;
  }
  
  // Reiniciar límite cuando cambian los filtros
  $effect(() => {
    if (hasActiveFilters) displayLimit = 100;
  });

  let totalDuration = $derived(savedTracks.reduce((acc, t) => acc + t.duration_ms, 0));
  let averagePopularity = $derived(
    savedTracks.length > 0
      ? Math.round(savedTracks.reduce((acc, t) => acc + (t.popularity || 0), 0) / savedTracks.length)
      : 0
  );
  
  // 🎵 Contador de canciones ya descargadas
  let downloadedCount = $derived(savedTracks.filter(t => t.isDownloaded).length);
  let downloadedPercentage = $derived(
    savedTracks.length > 0
      ? Math.round((downloadedCount / savedTracks.length) * 100)
      : 0
  );

  // Estadísticas adicionales
  let topArtist = $derived.by(() => {
    if (savedTracks.length === 0) return { name: '-', count: 0 };
    const artistCounts = new Map<string, number>();
    savedTracks.forEach(track => {
      track.artists.forEach(artist => {
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      });
    });
    const sorted = Array.from(artistCounts.entries()).sort((a, b) => b[1] - a[1]);
    return { name: sorted[0]?.[0] || '-', count: sorted[0]?.[1] || 0 };
  });

  let uniqueArtists = $derived(new Set(savedTracks.flatMap(t => t.artists)).size);
  let uniqueAlbums = $derived(new Set(savedTracks.map(t => t.album)).size);

  async function playPreview(track: SpotifyTrack) {
    console.log('🎵 Seleccionada:', track.name, '-', track.artists.join(', '));
  }

  // � DOWNLOAD FUNCTIONS
  async function checkSpotdlInstallation() {
    try {
      const version = await invoke<string>('check_spotdl_installed');
      spotdlInstalled = true;
      console.log('✅ spotdl instalado:', version);
    } catch (err: any) {
      spotdlInstalled = false;
      error = err.toString();
      console.error('❌ spotdl no disponible:', err);
    }
  }

  async function downloadAllTracks() {
    // Prevenir múltiples descargas simultáneas
    if (isDownloading) {
      console.log('⚠️ Ya hay una descarga en progreso');
      return;
    }

    if (filteredTracks.length === 0) {
      error = 'No hay canciones para descargar';
      return;
    }

    // 🔍 Filtrar canciones que NO están descargadas
    const tracksToDownload = filteredTracks.filter(t => !t.isDownloaded);
    const alreadyDownloaded = filteredTracks.length - tracksToDownload.length;
    
    if (tracksToDownload.length === 0) {
      error = '✅ Todas las canciones ya están descargadas';
      console.log('✅ No hay canciones nuevas para descargar');
      return;
    }
    
    if (alreadyDownloaded > 0) {
      console.log(`ℹ️ Omitiendo ${alreadyDownloaded} canciones ya descargadas`);
    }

    // Verificar spotdl
    await checkSpotdlInstallation();
    if (!spotdlInstalled) {
      error = 'spotdl no está instalado. Por favor instala con: pip install spotdl';
      return;
    }

    console.log(`🚀 Iniciando descarga de ${tracksToDownload.length} canciones nuevas...`);
    isDownloading = true;
    downloadProgress = [];
    downloadStats = { downloaded: 0, failed: 0, total: tracksToDownload.length };
    showDownloadPanel = true;
    error = null;

    // Obtener carpeta de música del sistema
    let musicFolder: string;
    try {
      console.log('🔍 Obteniendo carpeta de música para descarga masiva...');
      musicFolder = await invoke<string>('get_default_music_folder');
      console.log('✅ Carpeta de música:', musicFolder);
    } catch (err: any) {
      console.error('❌ Error obteniendo carpeta de música:', err);
      error = 'No se pudo obtener la carpeta de música del sistema';
      isDownloading = false;
      return;
    }

    // Extraer URLs de Spotify (solo canciones NO descargadas)
    const urls = tracksToDownload
      .filter(t => t.external_url)
      .map(t => t.external_url!);

    console.log(`🎧 Iniciando descarga de ${urls.length} canciones en: ${musicFolder}`);

    try {
      await invoke('download_spotify_tracks_segmented', {
        urls,
        segmentSize: 10,
        delay: 2,
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3',
        outputDir: musicFolder
      });
    } catch (err: any) {
      error = getErrorMessage(err);
      isDownloading = false;
      console.error('❌ Error en descarga masiva:', err);
    }
  }

  async function downloadSingleTrack(track: SpotifyTrack) {
    console.log('🔍 [downloadSingleTrack] Iniciando descarga individual...');
    console.log('🔍 Track recibido:', {
      name: track.name,
      artists: track.artists,
      external_url: track.external_url
    });

    if (!track.external_url) {
      console.error('❌ Track sin URL externa');
      return;
    }

    // Verificar spotdl si no lo hemos hecho
    if (spotdlInstalled === null) {
      console.log('🔍 Verificando instalación de spotdl...');
      await checkSpotdlInstallation();
      if (!spotdlInstalled) {
        error = 'spotdl no está instalado. Por favor instala con: pip install spotdl';
        console.error('❌ spotdl no disponible, abortando descarga');
        return;
      }
      console.log('✅ spotdl verificado y disponible');
    }

    showDownloadPanel = true;
    console.log('🔍 Panel de descarga mostrado');

    // Obtener carpeta de música del sistema
    let musicFolder: string;
    try {
      console.log('🔍 Obteniendo carpeta de música del sistema...');
      musicFolder = await invoke<string>('get_default_music_folder');
      console.log('✅ Carpeta de música:', musicFolder);
    } catch (err: any) {
      console.error('❌ Error obteniendo carpeta de música:', err);
      error = 'No se pudo obtener la carpeta de música del sistema';
      return;
    }

    console.log(`🎧 Descargando: ${track.name} - ${track.artists.join(', ')}`);
    console.log('🔍 Parámetros de invocación:', {
      url: track.external_url,
      outputTemplate: '{artist}/{album}/{title}',
      format: 'mp3',
      outputDir: musicFolder
    });

    try {
      console.log('🔍 Llamando a invoke("download_single_spotify_track")...');
      const result = await invoke<string>('download_single_spotify_track', {
        url: track.external_url,
        outputTemplate: '{artist}/{album}/{title}',
        format: 'mp3',
        outputDir: musicFolder
      });
      
      console.log('✅ Respuesta recibida del backend:', result);
      console.log('🔍 Iniciando animación de confirmación...');
      
      // Animar confirmación
      animate('.download-panel', {
        scale: [1, 1.02, 1],
        easing: 'easeInOutQuad',
        duration: 400
      });
      
      console.log('✅ Descarga individual completada exitosamente');
    } catch (err: any) {
      error = getErrorMessage(err);
      console.error('❌ Error descargando track:', err);
      
      // Mostrar ayuda si es error de YouTube
      if (err.toString().includes('YouTube') || err.toString().includes('YT-DLP')) {
        console.log('💡 Solución: Actualiza yt-dlp y spotdl ejecutando:');
        console.log('   pip install --upgrade yt-dlp spotdl');
      }
    }
  }

  function clearDownloadProgress() {
    downloadProgress = [];
    downloadStats = { downloaded: 0, failed: 0, total: 0 };
  }

  // �🎬 ANIMACIONES CON ANIME.JS
  let animationsInitialized = false;

  function initAnimations() {
    if (animationsInitialized) return;
    animationsInitialized = true;

    // Animación del header con fade in y slide up
    animate('.animate-header', {
      opacity: [0, 1],
      translateY: [-50, 0],
      duration: 1200,
      ease: 'out(3)'
    });

    // Animación del card de perfil
    animate('.animate-profile-card', {
      opacity: [0, 1],
      scale: [0.95, 1],
      translateY: [20, 0],
      duration: 800,
      delay: 300,
      ease: 'out(2)'
    });

    // Animación de la tabla con fade in
    animate('.animate-table', {
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 1000,
      delay: 400,
      ease: 'out(2)'
    });
    
    // Animación de las filas de la tabla con stagger
    animate('.table-row', {
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 600,
      delay: stagger(50, {start: 600}),
      ease: 'out(2)'
    });
  }

  function animateViewChange() {
    // Animación al cambiar de vista (tabs)
    animate('.animate-content', {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 600,
      ease: 'out(2)'
    });
  }

  onMount(() => {
    checkAuth();
    
    // Inicializar animaciones después de un breve delay para asegurar que el DOM esté listo
    setTimeout(() => {
      initAnimations();
    }, 150);
  });

  // Re-animar cuando cambia la vista
  $effect(() => {
    if (activeView) {
      setTimeout(() => {
        animateViewChange();
      }, 50);
    }
  });
</script>

<AnimatedBackground />

<div class="relative z-10 pb-8">
  <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
    
    <!-- Header con glassmorphism y animación mejorada -->
    <div class="animate-header relative mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-cyan-500/15 via-blue-500/15 to-purple-500/15 backdrop-blur-2xl border border-cyan-400/30 p-8 shadow-2xl shadow-cyan-500/30">
      <!-- Efecto de brillo animado -->
      <div class="absolute inset-0 bg-linear-to-r from-transparent via-cyan-400/10 to-transparent animate-shimmer"></div>
      <div class="absolute inset-0 bg-linear-to-br from-cyan-400/5 to-blue-400/5"></div>
      
      <div class="relative z-10">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-2xl bg-linear-to-br from-cyan-400 to-blue-500 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-cyan-500/50 animate-pulse-slow">
              <Heart class="text-white" size={36} fill="white" />
            </div>
            <div>
              <h1 class="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-200 via-blue-200 to-purple-200 mb-2 drop-shadow-lg">
                Mi Biblioteca Musical
              </h1>
              <p class="text-cyan-100/80 text-lg flex items-center gap-2">
                <Sparkles size={18} class="text-cyan-300" />
                Explora y gestiona tu colección de Spotify
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Button
              onclick={() => forceReload()}
              disabled={isLoading || isLoadingTracks}
              class="bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-sm text-cyan-100 border-cyan-400/30 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Recargar datos de Spotify"
            >
              <RefreshCw size={18} class={isLoading || isLoadingTracks ? 'animate-spin' : ''} />
            </Button>
            
            {#if savedTracks.length > 0}
              <Button
                onclick={downloadAllTracks}
                disabled={isDownloading || !isAuthenticated}
                class="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold shadow-xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                title={isDownloading ? 'Descarga en progreso...' : 'Descargar todas las canciones guardadas'}
              >
                {#if isDownloading}
                  <Loader2 size={18} class="animate-spin" />
                  Descargando... ({downloadStats.downloaded}/{downloadStats.total})
                {:else}
                  <Download size={18} />
                  Descargar Todas ({savedTracks.length})
                {/if}
              </Button>
              
              <Button
                onclick={() => showDownloadPanel = !showDownloadPanel}
                variant="ghost"
                class="text-cyan-100 hover:bg-cyan-500/20"
              >
                <ChevronDown size={18} class={showDownloadPanel ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </Button>
            {/if}
          </div>
        </div>
      </div>
    </div>

  <!-- Card de Perfil de Spotify (animado) -->
  {#if isAuthenticated && profile && showProfileCard}
    <div class="animate-profile-card mb-8 relative overflow-hidden rounded-3xl bg-linear-to-br from-green-500/10 via-emerald-500/10 to-cyan-500/10 backdrop-blur-xl border border-green-400/20 p-8 shadow-2xl shadow-green-500/20">
      <!-- Efecto de brillo animado -->
      <div class="absolute inset-0 bg-linear-to-r from-transparent via-green-400/5 to-transparent animate-shimmer"></div>
      
      <!-- Botón para cerrar -->
      <button
        onclick={() => showProfileCard = false}
        class="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
      >
        ✕
      </button>

      <div class="relative z-10">
        <!-- Sección de perfil centrada -->
        <div class="text-center mb-8">
          <!-- Imagen de perfil -->
          {#if profile.images && profile.images[0]}
            <div class="inline-block mb-4">
              <img 
                src={profile.images[0]} 
                alt={profile.display_name || 'Profile'} 
                class="w-32 h-32 rounded-full shadow-2xl border-4 border-green-400/40 mx-auto"
              />
            </div>
          {:else}
            <div class="mb-4 w-32 h-32 bg-linear-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-green-400/40 mx-auto">
              <User size={56} class="text-white" />
            </div>
          {/if}

          <!-- Nombre del usuario -->
          <h2 class="text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {profile.display_name || 'Usuario de Spotify'}
          </h2>

          <!-- Información compacta -->
          <div class="flex items-center justify-center gap-6 text-sm text-green-200/90">
            {#if profile.country}
              <span class="flex items-center gap-1.5">
                <span class="text-lg">🌍</span>
                {profile.country}
              </span>
            {/if}
            <span class="flex items-center gap-1.5">
              <span class="text-lg">👥</span>
              {profile.followers} seguidores
            </span>
            {#if profile.product}
              <span class="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/30 rounded-full text-green-300 font-bold border border-green-400/30">
                <span class="text-lg">⭐</span>
                {profile.product.toUpperCase()}
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if !isAuthenticated}
    <!-- Not Authenticated -->
    <Card.Root class="bg-white/5 border-white/10">
      <Card.Content class="p-12 text-center">
        <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Music class="text-green-400" size={40} />
        </div>
        <h2 class="text-2xl font-bold text-white mb-2">Conecta tu cuenta de Spotify</h2>
        <p class="text-gray-400 mb-6">Autoriza la aplicación para ver tus canciones favoritas y playlists</p>
        <Button 
          onclick={authenticate}
          disabled={isLoading}
          class="bg-green-500 hover:bg-green-600"
        >
          {#if isLoading}
            <Loader2 size={18} class="mr-2 animate-spin" />
            Autenticando...
          {:else}
            <Music size={18} class="mr-2" />
            Conectar con Spotify
          {/if}
        </Button>
        
        {#if error}
          <div class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p class="text-red-400 text-sm">{error}</p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {:else if isLoading}
    <!-- Loading -->
    <div class="flex flex-col items-center justify-center py-32">
      <div class="relative">
        <div class="w-24 h-24 border-4 border-cyan-500/20 rounded-full"></div>
        <div class="w-24 h-24 border-4 border-t-cyan-400 rounded-full animate-spin absolute top-0"></div>
      </div>
      {#if isLoadingTracks && loadingProgress > 0}
        <div class="text-center mt-8">
          <p class="text-white text-xl font-semibold mb-3">Cargando tu biblioteca...</p>
          <div class="bg-sky-900/30 rounded-full h-4 w-80 overflow-hidden backdrop-blur-sm border border-cyan-500/20 shadow-inner">
            <div 
              class="h-full bg-linear-to-r from-cyan-400 via-blue-400 to-purple-400 transition-all duration-500 ease-out rounded-full shadow-lg shadow-cyan-500/50 relative overflow-hidden"
              style="width: {loadingProgress}%"
            >
              <!-- Efecto de brillo animado en la barra -->
              <div class="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <div class="flex items-center justify-center gap-3 mt-4">
            <p class="text-cyan-400 text-3xl font-bold">{loadingProgress}%</p>
            <p class="text-gray-300 text-lg">• {savedTracks.length.toLocaleString()} canciones</p>
          </div>
          <p class="text-gray-400 text-sm mt-2 flex items-center justify-center gap-2">
            <span class="inline-block w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            Streaming progresivo activo
          </p>
        </div>
      {:else}
        <p class="text-gray-400 mt-6 text-lg">Conectando con Spotify...</p>
      {/if}
    </div>
  {:else}
    <!-- Stats Cards con componente reutilizable -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6 mb-8">
      <StatsCard 
        icon={Heart}
        value={savedTracks.length.toLocaleString()}
        label="Canciones Guardadas"
        color="cyan"
        index={0}
      />
      
      <StatsCard 
        icon={CheckCircle2}
        value="{downloadedCount} ({downloadedPercentage}%)"
        label="En Biblioteca"
        color="purple"
        index={1}
      />
      
      <StatsCard 
        icon={Music}
        value={playlists.length}
        label="Playlists"
        color="blue"
        index={2}
      />
      
      <StatsCard 
        icon={Clock}
        value="{Math.floor(totalDuration / 3600000)}h {Math.floor((totalDuration % 3600000) / 60000)}m"
        label="Tiempo Total"
        color="purple"
        index={3}
      />
      
      <StatsCard 
        icon={TrendingUp}
        value="{averagePopularity}%"
        label="Popularidad Media"
        color="violet"
        index={4}
      />
      
      <StatsCard 
        icon={Users}
        value={uniqueArtists}
        label="Artistas Únicos"
        color="cyan"
        index={5}
      />
      
      <StatsCard 
        icon={Disc}
        value={uniqueAlbums}
        label="Álbumes"
        color="blue"
        index={6}
      />
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <Button
        variant={activeView === 'liked' ? 'default' : 'ghost'}
        onclick={() => activeView = 'liked'}
        class={activeView === 'liked' 
          ? 'bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
          : 'text-cyan-200/60 hover:text-white hover:bg-cyan-500/10'}
      >
        <Heart size={18} class="mr-2" />
        Canciones Favoritas ({savedTracks.length})
      </Button>
      <Button
        variant={activeView === 'playlists' ? 'default' : 'ghost'}
        onclick={() => activeView = 'playlists'}
        class={activeView === 'playlists' 
          ? 'bg-linear-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white shadow-lg shadow-blue-500/20' 
          : 'text-cyan-200/60 hover:text-white hover:bg-blue-500/10'}
      >
        <Music size={18} class="mr-2" />
        Mis Playlists ({playlists.length})
      </Button>
    </div>

    {#if error}
      <Card.Root class="bg-red-500/20 border-red-500/50 mb-6 backdrop-blur-sm">
        <Card.Content class="p-4 flex items-center gap-3">
          <AlertCircle class="text-red-400" size={24} />
          <p class="text-red-200">{error}</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- 🎧 Download Progress Panel -->
    {#if showDownloadPanel && (downloadProgress.length > 0 || isDownloading)}
      <Card.Root class="download-panel mb-6 bg-linear-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10 border-blue-400/30 backdrop-blur-xl shadow-2xl shadow-blue-500/20">
        <Card.Header class="pb-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-linear-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                {#if isDownloading}
                  <Loader2 size={20} class="text-white animate-spin" />
                {:else}
                  <Download size={20} class="text-white" />
                {/if}
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Progreso de Descarga</h3>
                <p class="text-cyan-200/70 text-sm">
                  {#if isDownloading}
                    Descargando {downloadProgress.length} de {downloadStats.total}...
                  {:else}
                    ✅ {downloadStats.downloaded} descargadas, ❌ {downloadStats.failed} fallidas
                  {/if}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              {#if !isDownloading && downloadProgress.length > 0}
                <Button
                  onclick={clearDownloadProgress}
                  variant="ghost"
                  size="sm"
                  class="text-cyan-200/70 hover:text-white hover:bg-cyan-500/20"
                >
                  Limpiar
                </Button>
              {/if}
              <button
                onclick={() => showDownloadPanel = false}
                class="text-cyan-200/70 hover:text-white transition-colors"
              >
                <ChevronDown size={18} class="rotate-180" />
              </button>
            </div>
          </div>
        </Card.Header>
        <Card.Content class="pt-0">
          <!-- Progress bar -->
          {#if isDownloading && downloadStats.total > 0}
            <div class="mb-4 bg-sky-900/40 rounded-full h-2 overflow-hidden">
              <div 
                class="h-full bg-linear-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
                style="width: {(downloadProgress.length / downloadStats.total) * 100}%"
              ></div>
            </div>
          {/if}
          
          <!-- Download list with scroll -->
          <div class="max-h-[280px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
            {#each downloadProgress as item}
              <div class="download-item glass bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center hover:bg-white/10 transition-all">
                <div class="flex-1 min-w-0">
                  <p class="text-white/90 font-medium text-sm truncate">{item.song}</p>
                  <p class="text-cyan-300/60 text-xs">
                    [{item.index}/{item.total}] {item.status}
                  </p>
                </div>
                <div class="ml-3 shrink-0">
                  {#if item.status.startsWith('✅')}
                    <div class="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span class="text-green-400 text-xs">✓</span>
                    </div>
                  {:else if item.status.startsWith('❌') || item.status.startsWith('⚠️')}
                    <div class="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span class="text-red-400 text-xs">✕</span>
                    </div>
                  {:else}
                    <Loader2 size={16} class="text-cyan-400 animate-spin" />
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Liked Songs View -->
    {#if activeView === 'liked'}
      <!-- Filters Bar -->
      <div class="animate-content mb-6 space-y-4">
        <div class="flex flex-col md:flex-row gap-4">
          <Button
            onclick={() => showFilters = !showFilters}
            variant="outline"
            class="border-cyan-500/30 text-cyan-200 bg-cyan-500/10 hover:text-cyan-100 backdrop-blur-sm px-6"
          >
            <Filter size={18} class="mr-2" />
            Filtros
            <ChevronDown size={16} class="ml-2 transition-transform {showFilters ? 'rotate-180' : ''}" />
          </Button>
        </div>

        {#if showFilters}
          <Card.Root class="bg-sky-900/30 border-cyan-500/20 backdrop-blur-sm">
            <Card.Content class="p-6">
              <div class="flex flex-wrap gap-4 items-center">
                <span class="text-cyan-200/80 text-sm font-semibold">Popularidad:</span>
                <div class="flex gap-2">
                  {#each [
                    { value: 'all', label: 'Todas', color: 'cyan' },
                    { value: 'high', label: 'Alta (70+)', color: 'green' },
                    { value: 'medium', label: 'Media (40-70)', color: 'yellow' },
                    { value: 'low', label: 'Baja (<40)', color: 'red' }
                  ] as filter}
                    <button
                      onclick={() => filterPopularity = filter.value as any}
                      class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
                        filterPopularity === filter.value
                          ? filter.value === 'all' 
                            ? 'bg-cyan-500/30 text-white shadow-lg border border-cyan-400/30' 
                            : filter.value === 'high'
                              ? 'bg-green-500/30 text-green-200 shadow-lg border border-green-400/30'
                              : filter.value === 'medium'
                                ? 'bg-yellow-500/30 text-yellow-200 shadow-lg border border-yellow-400/30'
                                : 'bg-red-500/30 text-red-200 shadow-lg border border-red-400/30'
                          : 'bg-sky-900/30 text-cyan-200/60 hover:bg-sky-800/40'
                      }"
                    >
                      {filter.label}
                    </button>
                  {/each}
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        {/if}
      </div>

      <!-- Tracks Table con animación -->
      <Card.Root class="animate-table bg-sky-900/30 border-cyan-500/20 backdrop-blur-sm shadow-2xl shadow-cyan-500/5">
        <Card.Content class="p-0">
          <div class="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row class="border-cyan-500/20 hover:bg-cyan-500/5 bg-sky-900/40">
                  <Table.Head class="w-12 text-cyan-200/70 font-semibold">#</Table.Head>
                  <Table.Head class="w-[35%]">
                    <button 
                      onclick={() => handleSort('name')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      <Music size={16} />
                      Título 
                      {#if sortBy === 'name'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-[20%] hidden md:table-cell">
                    <button 
                      onclick={() => handleSort('artist')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      🎤 Artista 
                      {#if sortBy === 'artist'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-[20%] hidden lg:table-cell">
                    <button 
                      onclick={() => handleSort('album')} 
                      class="flex items-center gap-2 hover:text-white transition-colors font-semibold text-cyan-200/90"
                    >
                      💿 Álbum 
                      {#if sortBy === 'album'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-24 text-center hidden xl:table-cell">
                    <button 
                      onclick={() => handleSort('popularity')} 
                      class="flex items-center gap-2 hover:text-white transition-colors mx-auto font-semibold text-cyan-200/90"
                    >
                      <TrendingUp size={14} />
                      Pop
                      {#if sortBy === 'popularity'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-20 text-right">
                    <button 
                      onclick={() => handleSort('duration')} 
                      class="flex items-center gap-2 hover:text-white transition-colors ml-auto font-semibold text-cyan-200/90"
                    >
                      <Clock size={14} />
                      {#if sortBy === 'duration'}
                        <span class="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      {/if}
                    </button>
                  </Table.Head>
                  <Table.Head class="w-20 text-center text-cyan-200/70 font-semibold">
                    <ExternalLink size={14} class="mx-auto" />
                  </Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each displayedTracks as track, i}
                  <Table.Row class="table-row border-cyan-500/10 hover:bg-cyan-500/5 transition-all group backdrop-blur-sm">
                    <Table.Cell class="font-medium text-cyan-200/60">
                      <span class="group-hover:hidden">{i + 1}</span>
                      <button
                        onclick={() => playPreview(track)}
                        class="hidden group-hover:flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-600 hover:scale-110 transition-all shadow-lg shadow-cyan-500/30"
                      >
                        {#if playingTrackId === track.id}
                          <Pause size={14} class="text-white" fill="white" />
                        {:else}
                          <Play size={14} class="text-white" fill="white" />
                        {/if}
                      </button>
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center gap-3">
                        {#if track.album_image}
                          <div class="relative group/img shrink-0">
                            <img 
                              src={track.album_image} 
                              alt={track.album}
                              class="w-10 h-10 rounded-lg object-cover shadow-lg group-hover:shadow-cyan-500/50 transition-all"
                            />
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                              <Play size={14} class="text-white" fill="white" />
                            </div>
                          </div>
                        {:else}
                          <div class="w-10 h-10 rounded-lg bg-sky-800/30 flex items-center justify-center shrink-0">
                            <Music size={16} class="text-cyan-400/50" />
                          </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                          <p class="text-white font-semibold truncate group-hover:text-cyan-300 transition-colors text-sm">
                            {track.name}
                          </p>
                          <p class="text-cyan-300/50 text-xs truncate md:hidden">{track.artists.slice(0, 2).join(', ')}</p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell class="text-cyan-100/80 text-sm hidden md:table-cell">
                      <span class="truncate block">{track.artists.slice(0, 2).join(', ')}</span>
                    </Table.Cell>
                    <Table.Cell class="text-cyan-200/60 text-sm hidden lg:table-cell">
                      <span class="truncate block">{track.album}</span>
                    </Table.Cell>
                    <Table.Cell class="text-center hidden xl:table-cell">
                      {#if track.popularity !== null}
                        <div class="flex items-center justify-center gap-2">
                          <div class="w-16 h-2 bg-sky-800/40 rounded-full overflow-hidden">
                            <div 
                              class="h-full rounded-full transition-all {getPopularityColor(track.popularity)}"
                              style="width: {track.popularity}%; background-color: {
                                track.popularity >= 70 ? '#22c55e' :
                                track.popularity >= 40 ? '#eab308' : '#ef4444'
                              }"
                            ></div>
                          </div>
                          <span class="text-xs font-semibold {getPopularityColor(track.popularity)} min-w-6 text-right">
                            {track.popularity}
                          </span>
                        </div>
                      {:else}
                        <span class="text-cyan-400/30">-</span>
                      {/if}
                    </Table.Cell>
                    <Table.Cell class="text-right text-cyan-200/70 font-mono text-xs">
                      {formatDuration(track.duration_ms)}
                    </Table.Cell>
                    <Table.Cell>
                      <div class="flex items-center justify-center gap-1">
                        {#if track.isDownloaded}
                          <!-- ✅ Badge de canción ya descargada -->
                          <div class="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                            <Music size={12} class="text-green-400" />
                            <span class="text-green-300 text-xs font-semibold">En biblioteca</span>
                          </div>
                        {:else if track.external_url}
                          <Button 
                            onclick={() => {
                              console.log('🖱️ Click en botón de descarga detectado');
                              console.log('🔍 Track a descargar:', track);
                              downloadSingleTrack(track);
                            }}
                            variant="ghost" 
                            size="sm" 
                            class="opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500/20 hover:text-blue-300 h-8 w-8 p-0"
                            title="Descargar canción"
                          >
                            <Download size={14} />
                          </Button>
                        {/if}
                        {#if track.external_url}
                          <a href={track.external_url} target="_blank" rel="noopener noreferrer">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              class="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/20 hover:text-cyan-300 h-8 w-8 p-0"
                              title="Abrir en Spotify"
                            >
                              <ExternalLink size={14} />
                            </Button>
                          </a>
                        {/if}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {:else}
                  <Table.Row>
                    <Table.Cell colspan={8} class="text-center py-12">
                      <div class="flex flex-col items-center gap-3">
                        <div class="w-16 h-16 rounded-full bg-sky-900/30 flex items-center justify-center">
                          <Search class="text-cyan-400/50" size={32} />
                        </div>
                        <p class="text-cyan-200/60 text-lg">
                          No hay canciones guardadas
                        </p>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Load More Button (solo si hay más canciones para mostrar) -->
      {#if filterPopularity === 'all' && displayedTracks.length < filteredTracks.length}
        <div class="flex justify-center mt-6">
          <Button
            onclick={() => loadMoreTracks()}
            class="bg-cyan-500/20 hover:bg-cyan-500/30 backdrop-blur-sm text-cyan-100 border-cyan-400/30 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-105 px-8 py-6"
          >
            <ChevronDown size={20} class="mr-2" />
            Cargar 100 canciones más ({displayedTracks.length} de {filteredTracks.length})
          </Button>
        </div>
      {/if}

      <!-- Footer Info -->
      <div class="mt-6 flex items-center justify-between text-sm">
        <p class="text-cyan-300/50">
          Mostrando <span class="text-white font-semibold">{filteredTracks.length}</span> de 
          <span class="text-white font-semibold">{savedTracks.length}</span> canciones
        </p>
        {#if filteredTracks.length < savedTracks.length}
          <Button
            onclick={() => { filterPopularity = 'all'; }}
            variant="ghost"
            size="sm"
            class="text-cyan-400 hover:text-cyan-300"
          >
            Limpiar filtros
          </Button>
        {/if}
      </div>
    {/if}

    <!-- Playlists View con slider animado -->
    {#if activeView === 'playlists'}
      <div class="animate-content">
        <h2 class="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <ListMusic class="text-cyan-300" size={24} />
          </div>
          Tus Playlists
        </h2>
        
        {#if playlists.length > 0}
          <PlaylistSlider playlists={playlists} />
        {:else}
          <div class="text-center py-16">
            <div class="w-20 h-20 rounded-full bg-sky-900/30 flex items-center justify-center mx-auto mb-4 backdrop-blur-xl border border-cyan-400/20">
              <Music class="text-cyan-400/50" size={40} />
            </div>
            <p class="text-cyan-200/60 text-lg">No hay playlists disponibles</p>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
  
  </div>
</div>

<style>
  /* 🎨 Optimizaciones de rendimiento */
  .table-row {
    will-change: transform, opacity;
    backface-visibility: hidden;
  }
  
  /* Glassmorphism mejorado */
  .backdrop-blur-xl {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .backdrop-blur-sm {
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }
  
  .backdrop-blur-2xl {
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
  }
  
  /* Animación de shimmer para el header */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 3s ease-in-out infinite;
  }
  
  /* Pulso lento para el ícono del header */
  @keyframes pulse-slow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }
  
  /* Transiciones suaves globales */
  * {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }

  /* 🎧 Download panel styles */
  .download-item {
    backdrop-filter: blur(12px);
    will-change: transform, opacity;
  }

  .download-panel {
    will-change: background-color;
  }

  /* Custom scrollbar for download list */
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: rgba(6, 182, 212, 0.3);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: rgba(6, 182, 212, 0.5);
  }

  /* Glass effect */
  .glass {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
</style>

