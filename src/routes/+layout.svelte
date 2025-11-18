<script>
	import NavBarApp from './../lib/components/app/NavBarApp.svelte';
  import "./layout.css";
  
  let { children } = $props();
  
  import "../styles/app.css";
  import { player } from '@/lib/state';
  
  let hasTrack = $derived(!!player.current);
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
  @import "tailwindcss";

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  /* Fondo profundo azul-gris con gradiente premium */
  .app-container {
    @apply flex flex-col min-h-screen 
      bg-linear-to-b 
      from-slate-900 
      via-slate-800 
      to-slate-700;
  }

  /* Navbar con glassmorphism oscuro y brillos suaves celestes */
  .navbar {
    @apply fixed top-0 left-0 right-0 z-50 
      border-b border-slate-600/40
      bg-linear-to-r 
      from-slate-800/80 
      to-slate-700/70 
      backdrop-blur-xl
      shadow-2xl shadow-cyan-400/20;
  }

  .main-content {
    @apply relative z-10 flex-1 pt-16 pb-32;
  }
</style>
<!--  -->