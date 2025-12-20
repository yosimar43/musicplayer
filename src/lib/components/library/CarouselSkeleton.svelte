<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let containerRef = $state<HTMLDivElement>();
  let ctx: gsap.Context | null = null;

  // Generar array de 20 elementos para el grid
  const skeletonCards = Array.from({ length: 20 }, (_, i) => i);

  onMount(() => {
    ctx = gsap.context(() => {
      // Animación de entrada escalonada
      gsap.from('.skeleton-card', {
        opacity: 0,
        scale: 0.8,
        y: 20,
        duration: 0.5,
        stagger: 0.03,
        ease: 'back.out(1.7)'
      });

      // Animación de pulso continuo
      gsap.to('.skeleton-pulse', {
        opacity: 0.5,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: {
          amount: 0.8,
          from: 'random'
        }
      });

      // Animación del indicador de letra
      gsap.from('.skeleton-letter-indicator', {
        opacity: 0,
        scale: 0.9,
        duration: 0.6,
        ease: 'back.out(1.7)'
      });

      // Animación del mensaje de carga
      gsap.from('.loading-message', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'back.out(1.7)'
      });

      gsap.from('.loading-icon', {
        scale: 0,
        rotation: -180,
        duration: 0.6,
        stagger: 0.2,
        ease: 'back.out(1.7)'
      });

      gsap.from('.loading-text', {
        opacity: 0,
        y: 10,
        duration: 0.8,
        delay: 0.4,
        ease: 'power2.out'
      });

      // Animación continua de los iconos (flotando)
      gsap.to('.loading-icon', {
        y: -8,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        stagger: 0.3,
        ease: 'sine.inOut'
      });

      // Efecto shiny en el texto
      gsap.to('.loading-text', {
        backgroundPosition: '200% 0',
        duration: 2,
        repeat: -1,
        ease: 'linear'
      });
    }, containerRef);

    return () => {
      ctx?.revert();
      ctx = null;
    };
  });
</script>

<div bind:this={containerRef} class="carousel-skeleton">

  <div class="skeleton-slide">
    <!-- Skeleton del header de letra -->
    <div class="skeleton-slide-header">
      <div class="skeleton-separator skeleton-pulse"></div>
    </div>

    <!-- Grid de skeleton cards -->
    <div class="skeleton-grid">
      {#each skeletonCards as i (i)}
        <div class="skeleton-card" style="animation-delay: {i * 0.02}s">
          <!-- Círculo del álbum -->
          <div class="skeleton-circle skeleton-pulse"></div>
          <!-- Líneas de texto -->
          <div class="skeleton-text-wrapper">
            <div class="skeleton-text skeleton-pulse"></div>
            <div class="skeleton-text-small skeleton-pulse"></div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Loading Message Overlay -->
    <div class="loading-message">
      <div class="loading-icons">
        <div class="loading-icon">🎵</div>
        <div class="loading-icon">🎶</div>
        <div class="loading-icon">🎵</div>
      </div>
      <div class="loading-text">Cargando información...</div>
    </div>
  </div>
</div>

<style>
  .carousel-skeleton {
    position: relative;
    width: 100%;
    max-width: 1200px;
    height: calc(100vh - 180px);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }



  .skeleton-slide {
    position: relative;
    width: 100%;
    max-width: 900px;
    height: 100%;
    border-radius: 16px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
    border: 1px solid rgba(56, 189, 248, 0.4);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 50px rgba(34, 211, 238, 0.3);
  }

  .skeleton-slide-header {
    padding: 20px;
    background: linear-gradient(to bottom, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.85));
    backdrop-filter: blur(12px);
  }

  .skeleton-separator {
    width: 120px;
    height: 32px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.1),
      rgba(148, 163, 184, 0.2),
      rgba(148, 163, 184, 0.1)
    );
    border-radius: 8px;
    margin: 0 auto;
  }

  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 120px));
    gap: 12px 16px;
    padding: 20px;
    width: 100%;
    justify-content: center;
    max-height: calc(100% - 72px);
    overflow: hidden;
  }

  .skeleton-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .skeleton-card:nth-child(even) {
    margin-top: 25px;
  }

  .skeleton-circle {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(148, 163, 184, 0.15),
      rgba(148, 163, 184, 0.25),
      rgba(148, 163, 184, 0.15)
    );
    border: 2px solid rgba(148, 163, 184, 0.2);
  }

  .skeleton-text-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .skeleton-text {
    width: 80%;
    height: 12px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.1),
      rgba(148, 163, 184, 0.2),
      rgba(148, 163, 184, 0.1)
    );
    border-radius: 4px;
    margin: 0 auto;
  }

  .skeleton-text-small {
    width: 60%;
    height: 10px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.08),
      rgba(148, 163, 184, 0.15),
      rgba(148, 163, 184, 0.08)
    );
    border-radius: 4px;
    margin: 0 auto;
  }

  .skeleton-pulse {
    animation: skeleton-shimmer 2s ease-in-out infinite;
    background-size: 200% 100%;
  }

  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @media (max-width: 768px) {
    .carousel-skeleton {
      height: calc(100vh - 150px);
      padding: 10px;
    }

    .skeleton-grid {
      grid-template-columns: repeat(auto-fill, minmax(90px, 110px));
      gap: 10px 14px;
      padding: 16px;
    }

    .skeleton-circle {
      width: 90px;
      height: 90px;
    }

    .skeleton-card:nth-child(even) {
      margin-top: 20px;
    }
  }

  @media (max-width: 480px) {
    .carousel-skeleton {
      height: calc(100vh - 130px);
      padding: 5px;
    }

    .skeleton-grid {
      grid-template-columns: repeat(auto-fill, minmax(80px, 100px));
      gap: 8px 12px;
      padding: 12px;
    }

    .skeleton-circle {
      width: 80px;
      height: 80px;
    }

    .skeleton-card:nth-child(even) {
      margin-top: 16px;
    }
  }

  /* Loading Message Styles */
  .loading-message {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    z-index: 10;
    pointer-events: none;
  }

  .loading-icons {
    display: flex;
    gap: 12px;
  }

  .loading-icon {
    font-size: 24px;
    filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
    animation: icon-glow 2s ease-in-out infinite alternate;
  }

  .loading-icon:nth-child(1) {
    animation-delay: 0s;
  }

  .loading-icon:nth-child(2) {
    animation-delay: 0.3s;
  }

  .loading-icon:nth-child(3) {
    animation-delay: 0.6s;
  }

  @keyframes icon-glow {
    0% {
      filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6));
      transform: scale(1);
    }
    100% {
      filter: drop-shadow(0 0 16px rgba(34, 211, 238, 1));
      transform: scale(1.1);
    }
  }

  .loading-text {
    font-size: 16px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.9);
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.9),
      rgba(34, 211, 238, 0.9),
      rgba(148, 163, 184, 0.9)
    );
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-align: center;
    filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.3));
  }

  @media (max-width: 768px) {
    .loading-icon {
      font-size: 20px;
    }

    .loading-text {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .loading-icon {
      font-size: 18px;
    }

    .loading-text {
      font-size: 12px;
    }
  }
</style>
