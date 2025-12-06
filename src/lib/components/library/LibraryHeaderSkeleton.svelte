<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let containerRef = $state<HTMLDivElement>();
  let ctx: gsap.Context | null = null;

  onMount(() => {
    ctx = gsap.context(() => {
      // Animación de pulso para los skeletons
      gsap.to('.skeleton-pulse', {
        opacity: 0.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.1
      });
    }, containerRef);

    return () => {
      ctx?.revert();
      ctx = null;
    };
  });
</script>

<div bind:this={containerRef} class="library-header-skeleton">
  <div class="header-content">
    <!-- Skeleton del título -->
    <div class="title-section">
      <div class="skeleton-title skeleton-pulse"></div>
      <div class="skeleton-count skeleton-pulse"></div>
    </div>

    <!-- Skeleton de los botones -->
    <div class="buttons-section">
      <div class="skeleton-button skeleton-pulse"></div>
      <div class="skeleton-button skeleton-pulse"></div>
    </div>
  </div>
</div>

<style>
  .library-header-skeleton {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.98) 0%,
      rgba(15, 23, 42, 0.95) 50%,
      rgba(15, 23, 42, 0) 100%
    );
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 0 32px;
  }

  .header-content {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .title-section {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .skeleton-title {
    width: 180px;
    height: 32px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.1),
      rgba(148, 163, 184, 0.2),
      rgba(148, 163, 184, 0.1)
    );
    border-radius: 8px;
  }

  .skeleton-count {
    width: 80px;
    height: 24px;
    background: linear-gradient(
      90deg,
      rgba(148, 163, 184, 0.08),
      rgba(148, 163, 184, 0.15),
      rgba(148, 163, 184, 0.08)
    );
    border-radius: 6px;
  }

  .buttons-section {
    display: flex;
    gap: 12px;
  }

  .skeleton-button {
    width: 48px;
    height: 48px;
    background: linear-gradient(
      135deg,
      rgba(56, 189, 248, 0.1),
      rgba(99, 102, 241, 0.1)
    );
    border-radius: 50%;
  }

  .skeleton-pulse {
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
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
    .library-header-skeleton {
      padding: 0 20px;
    }

    .skeleton-title {
      width: 140px;
      height: 28px;
    }

    .skeleton-count {
      width: 60px;
      height: 20px;
    }

    .skeleton-button {
      width: 44px;
      height: 44px;
    }
  }

  @media (max-width: 480px) {
    .library-header-skeleton {
      padding: 0 16px;
    }

    .skeleton-title {
      width: 120px;
      height: 24px;
    }

    .skeleton-count {
      display: none;
    }

    .skeleton-button {
      width: 40px;
      height: 40px;
    }
  }
</style>
