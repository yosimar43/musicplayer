<script lang="ts">
  import { usePlayer } from "@/lib/hooks";
  import { useUI } from "@/lib/hooks";
  import { playerStore } from "@/lib/stores/player.store.svelte";
  import type { Track } from "@/lib/stores/library.store.svelte";
  import gsap from "gsap";
  import { onDestroy } from "svelte";

  let {
    track,
    index,
    visible,
    onclick,
  }: { track: Track; index: number; visible: boolean; onclick?: () => void } =
    $props();
  const player = usePlayer();
  const ui = useUI();

  let cardRef = $state<HTMLElement>();
  let hoverTimeline: gsap.core.Timeline | null = null;

  $effect(() => {
    if (visible && cardRef) {
      // Animación solo cuando visible en viewport
      gsap.set(cardRef, { opacity: 0, y: 20 });
      gsap.to(cardRef, {
        opacity: 1,
        y: 0,
        duration: 0.3,
        delay: (index % 10) * 0.05,
      });
    }
  });

  function handleMouseEnter() {
    hoverTimeline?.kill();
    hoverTimeline = gsap.timeline({
      defaults: { duration: 0.2, overwrite: true },
    });
    if (cardRef) {
      hoverTimeline
        .to(cardRef, { scale: 1.02, ease: "power2.out" }, 0)
        .to(
          cardRef.querySelector(".album-art"),
          { filter: "brightness(1.1)" },
          0,
        );
    }
  }

  function handleMouseLeave() {
    hoverTimeline?.kill();
    if (cardRef) {
      gsap.to(cardRef, { scale: 1, duration: 0.2 });
      gsap.to(cardRef.querySelector(".album-art"), {
        filter: "brightness(1)",
        duration: 0.2,
      });
    }
  }

  onDestroy(() => {
    hoverTimeline?.kill();
    hoverTimeline = null;
    hoverTimeline = null;
  });

  import { draggable } from "@neodrag/svelte";
  import type { DragEventData } from "@neodrag/svelte";

  let position = $state({ x: 0, y: 0 });

  function handleDragEnd(data: DragEventData) {
    const playerBar = document.getElementById("floating-player-bar");
    if (playerBar) {
      const playerRect = playerBar.getBoundingClientRect();
      const cardRect = data.rootNode.getBoundingClientRect();

      // Chequear intersección
      const intersects =
        cardRect.right > playerRect.left &&
        cardRect.left < playerRect.right &&
        cardRect.bottom > playerRect.top &&
        cardRect.top < playerRect.bottom;

      if (intersects) {
        player.enqueueNext(track);
      }
    }

    // Snap back always
    position = { x: 0, y: 0 };
  }
</script>

<div
  bind:this={cardRef}
  class="track-card"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  {onclick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onclick?.()}
  use:draggable={{
    position,
    onDragEnd: handleDragEnd,
    transform: ({ offsetX, offsetY, rootNode }) => {
      // Boost Z-index while dragging
      rootNode.style.zIndex = offsetX === 0 && offsetY === 0 ? "" : "9999";
      // Apply transform manually to avoid conflicts or ensure smoothness if desired
      // Neodrag does it by default, but let's just let it handle it
      // But we need to ensure background color is solid
      rootNode.style.background =
        offsetX === 0 && offsetY === 0 ? "" : "rgba(30, 41, 59, 1)";
      return `translate(${offsetX}px, ${offsetY}px)`;
    },
  }}
>
  <!-- Skeleton si loading -->
  {#if playerStore.isTransitioning && player.current?.path === track.path}
    <div class="skeleton animate-pulse"></div>
  {:else}
    <!-- Album art lazy load -->
    <div class="album-art-wrapper">
      <img
        class="album-art"
        src={track.albumArt || "/placeholder.webp"}
        alt={track.title}
        loading="lazy"
      />
    </div>
  {/if}

  <div class="track-info">
    <h3>{track.title}</h3>
    <p>{track.artist}</p>
  </div>
</div>

<style>
  .track-card {
    display: flex;
    align-items: center;
    padding: 10px;
    gap: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
    height: 70px; /* Fixed height for virtual scroll */
    box-sizing: border-box;
  }
  .track-card:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .album-art-wrapper {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .album-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .track-info {
    flex: 1;
    overflow: hidden;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .skeleton {
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
  }
</style>
