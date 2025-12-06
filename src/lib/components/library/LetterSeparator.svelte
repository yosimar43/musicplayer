<script lang="ts">
  interface Props {
    letter: string;
  }

  let { letter }: Props = $props();
</script>

<div class="letter-separator" data-letter={letter}>
  <span class="letter-badge">{letter}</span>
</div>

<style>
  .letter-separator {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 4px 0;
  }

  .letter-badge {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgba(56, 189, 248, 1);
    width: 48px;
    height: min-content;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

 

  @media (max-width: 900px) {
    .letter-badge {
      width: 40px;
      height: 40px;
      font-size: 1.25rem;
    }
  }

  @media (max-width: 640px) {
    .letter-badge {
      width: 36px;
      height: 36px;
      font-size: 1.1rem;
    }
  }
</style>
