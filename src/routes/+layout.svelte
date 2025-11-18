<script>
  import "./layout.css";
  
  let { children } = $props();
  
  import "../styles/app.css";
  import { player } from '@/lib/state';
  
  // Mostrar reproductor solo si hay una canción
  let hasTrack = $derived(!!player.current);
</script>

<div class="app-container">
  <!-- Fixed Navbar at Top -->
  <div class="navbar">
    hola soy un navbar
  </div>
  
  <main class="main-content">
    {@render children()}
  </main>
  

</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(to bottom, #082f49, #0c4a6e, #082f49);
  }

  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    border-bottom: 1px solid rgba(12, 74, 110, 0.5);
    background: rgba(8, 47, 73, 0.95);
    backdrop-filter: blur(12px);
  }

  .main-content {
    position: relative;
    z-index: 10;
    flex: 1;
    padding-top: 4rem;
    padding-bottom: 8rem;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
