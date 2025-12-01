<script lang="ts">
  interface Props {
    letter: string;
  }

  let { letter }: Props = $props();
</script>

{#if letter}
  <div class="current-letter-indicator">
    {letter}
  </div>
{/if}

<style>
  .current-letter-indicator {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 5rem;
    font-weight: 700;
    color: rgba(56, 189, 248, 0.15);
    pointer-events: none;
    z-index: 0;
    user-select: none;
  }

  @media (max-width: 640px) {
    .current-letter-indicator {
      font-size: 3rem;
    }
  }
</style>
