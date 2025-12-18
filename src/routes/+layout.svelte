<script lang="ts">
  import { onMount } from "svelte";
  import NavBarApp from "./../lib/components/app/NavBarApp.svelte";
  import SearchModal from "./../lib/components/app/SearchModal.svelte";
  import FloatingPlayer from "@/lib/components/player/FloatingPlayer.svelte";
  import CustomCursor from "@/lib/components/ui/CustomCursor.svelte";
  import "../styles/app.css";
  import "./layout.css";
  import { playerStore } from "@/lib/stores/player.store.svelte";
  import { useMasterHook } from "@/lib/hooks/useMasterHook.svelte";
  import gsap from 'gsap';

  let { children } = $props();

  // ✅ Usar useMasterHook para inicialización coordinada
  const master = useMasterHook();

  let hasTrack = $derived(!!playerStore.current);
  let isSearchOpen = $state(false);

  // Auto-cargar aplicación
  onMount(() => {
    // Inicialización async
    (async () => {

      try {
        // ✅ Inicializar aplicación completa con useMasterHook
        await master.initializeApp();
      } catch (error) {
        console.error('❌ Error initializing app:', error);
      }

      // Agregar atajo de teclado para búsqueda
      const handleKeydown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'k') {
          e.preventDefault();
          isSearchOpen = !isSearchOpen;
        }
      };
      window.addEventListener('keydown', handleKeydown);

      // GSAP Context para animaciones de fondo optimizadas
      const ctx = gsap.context(() => {
        const orbs = document.querySelectorAll('.orb');
        const orbData = Array.from(orbs).map(() => ({
          xOff: Math.random() * 100,
          yOff: Math.random() * 100,
          speed: 0.2 + Math.random() * 0.3,
          range: 30 + Math.random() * 20
        }));

        let lastTime = 0;

        // Throttled ticker a ~30fps
        gsap.ticker.add((time) => {
          if (time - lastTime < 0.033) return; // ~30fps
          lastTime = time;

          orbs.forEach((orb, i) => {
            const data = orbData[i];
            const x = Math.sin(time * data.speed + data.xOff) * data.range;
            const y = Math.cos(time * data.speed + data.yOff) * data.range;
            gsap.set(orb, { x, y });
          });
        });
      });

      // ✅ OPTIMIZACIÓN: Cleanup mejorado para memory leaks
      return () => {
        ctx.revert(); // Limpiar GSAP

        // Cleanup en orden inverso
        try {
          master.player.cleanup?.();
        } catch (e) {
          // Error cleanup player
        }

        try {
          master.library.cleanup?.();
        } catch (e) {
          // Error cleanup library
        }

        // Limpiar caches de sessionStorage si existen
        if (typeof window !== 'undefined') {
          try {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
              if (key.startsWith('carousel_')) {
                sessionStorage.removeItem(key);
              }
            });
          } catch (e) {
            // Error clearing sessionStorage
          }
        }

        // Cleanup completed
      };
    })().catch(error => {
      console.error('❌ Error in layout initialization:', error);
    });
  });
</script>

<div class="app-container">
  <!-- Background effects layer -->
  <div class="background-effects" aria-hidden="true">
    <!-- Ambient orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>
    <!-- Amber orbs -->
    <div class="orb orb-amber-1"></div>
    <div class="orb orb-amber-2"></div>
    <div class="orb orb-amber-3"></div>
    <!-- Fuchsia orbs -->
    <div class="orb orb-fuchsia-1"></div>
    <div class="orb orb-fuchsia-2"></div>
    <div class="orb orb-fuchsia-3"></div>
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

  <footer class="footer">
    
    <FloatingPlayer />
  </footer>
  <!-- Floating Player -->
  <CustomCursor />

  <!-- Search Modal -->
  <SearchModal isOpen={isSearchOpen} onClose={() => isSearchOpen = false} />

  <!-- Debug Panel -->
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
    @apply relative flex min-h-screen flex-col pb-5 items-center ;
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
    /* animation: float-orb 20s ease-in-out infinite; */
    will-change: transform;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%);
    top: -15%;
    left: -10%;
    /* animation-delay: 0s;
    animation-duration: 25s; */
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, transparent 70%);
    bottom: -10%;
    right: -5%;
    /* animation-delay: -8s;
    animation-duration: 22s; */
  }

  .orb-3 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, transparent 70%);
    top: 25%;
    left: 60%;
    /* animation-delay: -15s;
    animation-duration: 28s; */
  }

  /* Amber orbs - tonos cálidos */
  .orb-amber-1 {
    width: 450px;
    height: 450px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%);
    top: 10%;
    right: 15%;
    /* animation-delay: -5s;
    animation-duration: 30s; */
  }

  .orb-amber-2 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%);
    top: 35%;
    left: 20%;
    animation-delay: -12s;
    animation-duration: 26s;
  }

  .orb-amber-3 {
    width: 380px;
    height: 380px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.32) 0%, transparent 70%);
    top: 45%;
    right: 40%;
    animation-delay: -18s;
    animation-duration: 24s;
  }

  /* Fuchsia orbs - tonos vibrantes */
  .orb-fuchsia-1 {
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(217, 70, 239, 0.35) 0%, transparent 70%);
    top: 20%;
    left: 10%;
    animation-delay: -7s;
    animation-duration: 27s;
  }

  .orb-fuchsia-2 {
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(217, 70, 239, 0.3) 0%, transparent 70%);
    top: 55%;
    right: 25%;
    animation-delay: -14s;
    animation-duration: 29s;
  }

  .orb-fuchsia-3 {
    width: 390px;
    height: 390px;
    background: radial-gradient(circle, rgba(217, 70, 239, 0.33) 0%, transparent 70%);
    top: 38%;
    right: 5%;
    animation-delay: -20s;
    animation-duration: 23s;
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
    @apply relative z-10  h-[80vh] pt-12 pb-32 w-3/4 overflow-hidden ; 
  }


  .footer{
    @apply fixed bottom-0 w-full flex justify-center pb-4 z-50;
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
