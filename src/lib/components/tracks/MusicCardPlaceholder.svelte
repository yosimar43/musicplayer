<script lang="ts">
  /**
   * ✅ Placeholder minimal para slides "back" 
   * - Sin animaciones GSAP
   * - Sin timelines
   * - HTML/CSS puro y rápido
   * - Reducir CPU cuando no es visible
   */
</script>

<div class="placeholder-card" aria-hidden="true"></div>

<style>
  .placeholder-card {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
    border: 1px solid rgba(56, 189, 248, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>
