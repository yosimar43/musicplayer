<script lang="ts">
  interface Props {
    letters: string[];
    currentLetter: string;
    onLetterClick: (letter: string) => void;
  }

  let { letters, currentLetter, onLetterClick }: Props = $props();
</script>

{#if letters.length > 0}
  <nav class="alphabet-nav" aria-label="Navegación alfabética">
    {#each letters as letter}
      <button
        class="alphabet-letter"
        class:active={currentLetter === letter}
        onclick={() => onLetterClick(letter)}
        aria-label={`Ir a ${letter}`}
      >
        {letter}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .alphabet-nav {
    position: fixed;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 4px;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 100;
  }

  .alphabet-letter {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }

  .alphabet-letter:hover {
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.1);
  }

  .alphabet-letter.active {
    color: rgba(56, 189, 248, 1);
    background: rgba(56, 189, 248, 0.15);
  }

  @media (max-width: 900px) {
    .alphabet-nav {
      right: 4px;
      padding: 6px 3px;
    }

    .alphabet-letter {
      width: 20px;
      height: 20px;
      font-size: 10px;
    }
  }

  @media (max-width: 640px) {
    .alphabet-nav {
      gap: 1px;
      padding: 4px 2px;
    }

    .alphabet-letter {
      width: 18px;
      height: 18px;
      font-size: 9px;
    }
  }

  @media (max-width: 400px) {
    .alphabet-letter {
      width: 16px;
      height: 16px;
      font-size: 8px;
    }
  }
</style>
