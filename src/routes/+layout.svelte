<script>
  import { onMount } from "svelte";
  import NavBarApp from "./../lib/components/app/NavBarApp.svelte";
  import "../styles/app.css";
  import "./layout.css";
  import { playerStore } from "@/lib/stores/player.store.svelte";
  import { useLibrary } from "@/lib/hooks/useLibrary.svelte";
  import { usePlayer } from "@/lib/hooks/usePlayer.svelte";

  let { children } = $props();

  // Inicializar hooks
  const library = useLibrary();
  const player = usePlayer();

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
  <!-- Background effects layer -->
  <div class="background-effects" aria-hidden="true">
    <!-- Ambient orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <!-- Grid lines subtle -->
    <div class="grid-overlay"></div>
    <!-- Noise texture -->
    <div class="noise-overlay"></div>
  </div>

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
    @apply relative flex min-h-screen flex-col py-5 items-center ;
    background: 
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.15), transparent),
      radial-gradient(ellipse 60% 40% at 100% 100%, rgba(14, 165, 233, 0.1), transparent),
      radial-gradient(ellipse 50% 30% at 0% 80%, rgba(99, 102, 241, 0.08), transparent),
      linear-gradient(to bottom, #0f172a 0%, #1e293b 50%, #334155 100%);
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     BACKGROUND EFFECTS - Elementos que dan profundidad
     ═══════════════════════════════════════════════════════════════════════════ */
  
  .background-effects {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  /* Orbes de luz ambient - flotan suavemente */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    animation: float-orb 20s ease-in-out infinite;
    will-change: transform;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%);
    top: -15%;
    left: -10%;
    animation-delay: 0s;
    animation-duration: 25s;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
    bottom: -10%;
    right: -5%;
    animation-delay: -8s;
    animation-duration: 22s;
  }

  .orb-3 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, transparent 70%);
    top: 40%;
    left: 60%;
    animation-delay: -15s;
    animation-duration: 28s;
  }

  @keyframes float-orb {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    25% {
      transform: translate(30px, -20px) scale(1.05);
    }
    50% {
      transform: translate(-20px, 30px) scale(0.95);
    }
    75% {
      transform: translate(20px, 20px) scale(1.02);
    }
  }

  /* Grid overlay sutil - da sensación de profundidad */
  .grid-overlay {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse 70% 50% at 50% 50%, black 20%, transparent 70%);
    opacity: 0.5;
  }

  /* Noise texture - añade grano cinematográfico */
  .noise-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    mix-blend-mode: overlay;
  }

  /* Navbar con glassmorphism oscuro y brillos suaves celestes */
  .navbar {
    @apply  top-0 right-0 left-0 z-50 ;
  }

  /* Main content sin altura fija, solo flex-1 y padding */
  .main-content {
    @apply relative z-10 mt-auto h-[80vh] pt-12 pb-15 w-3/4 overflow-hidden;
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     REDUCIR ANIMACIONES SI EL USUARIO PREFIERE
     ═══════════════════════════════════════════════════════════════════════════ */
  @media (prefers-reduced-motion: reduce) {
    .orb {
      animation: none;
    }
  }
</style>
