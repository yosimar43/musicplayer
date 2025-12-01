<script>
  import { onMount } from "svelte";
  import NavBarApp from "./../lib/components/app/NavBarApp.svelte";
  import "../styles/app.css";
  import "./layout.css";
  import { playerStore } from "@/lib/stores/player.store.svelte";
  import { useLibrary } from "@/lib/hooks/useLibrary.svelte";
  import { usePlayer } from "@/lib/hooks/usePlayer.svelte";
  import { usePlayerPersistence } from "@/lib/hooks/usePlayerPersistence.svelte";

  let { children } = $props();

  // Inicializar hooks
  const library = useLibrary();
  const player = usePlayer();

  // Persistir volumen del reproductor
  usePlayerPersistence();

  let hasTrack = $derived(!!playerStore.current);

  // Auto-cargar biblioteca si existe última carpeta
  onMount(() => {
    // Inicializar reproductor
    player.initialize();
    
    // Inicializar biblioteca con listeners y cargar
    (async () => {
      await library.initialize();
      
      if (library.currentFolder) {
        try {
          console.log(
            "🎵 Auto-cargando biblioteca desde:",
            library.currentFolder,
          );
          await library.loadLibrary();
        } catch (err) {
          console.log("ℹ️ No se pudo auto-cargar biblioteca:", err);
          // Silently fail - usuario puede cargar manualmente
        }
      }
    })();
    
    // Cleanup al desmontar
    return () => {
      library.cleanup();
      player.cleanup();
    };
  });
</script>

<div class="app-container">
  <!-- NavBar fija -->
  <div class="navbar">
    <NavBarApp />
  </div>

  <main class="main-content">
    {@render children()}
  </main>
</div>

<style>
  @reference 'tailwindcss';

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Fondo profundo azul-gris con gradiente premium */
  .app-container {
    @apply flex min-h-screen flex-col bg-linear-to-b from-slate-900 via-slate-800 to-slate-700 pb-15;
  }

  /* Navbar con glassmorphism oscuro y brillos suaves celestes */
  .navbar {
    @apply fixed top-0 right-0 left-0 z-50 border-b border-slate-600/40 bg-linear-to-r from-slate-800/80 to-slate-700/70 shadow-2xl shadow-cyan-400/20 backdrop-blur-xl;
  }

  /* Main content sin altura fija, solo flex-1 y padding */
  .main-content {
    @apply relative z-10 mt-auto h-[80vh] pt-12 pb-15 ;
  }
</style>
