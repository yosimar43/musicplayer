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

  // Removed: import { draggable } from "@neodrag/svelte";
  // Removed: import type { DragEventData } from "@neodrag/svelte";

  // Right-click to enqueue track
  function handleRightClick(e: MouseEvent) {
    e.preventDefault();
    player.enqueueNext(track);
    console.log('🎵 Canción agregada al hacer right-click:', track.title);

    // Add 360° spin animation
    if (cardRef) {
      gsap.fromTo(cardRef,
        { rotationY: 0 },
        {
          rotationY: 360,
          duration: 0.8,
          ease: "power2.out",
          onComplete: () => {
            // Reset rotation to avoid accumulation
            if (cardRef) gsap.set(cardRef, { rotationY: 0 });
          }
        }
      );
    }
  }
</script>

<div
  bind:this={cardRef}
  class="track-card"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  {onclick}
  oncontextmenu={handleRightClick}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === "Enter" && onclick?.()}
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
