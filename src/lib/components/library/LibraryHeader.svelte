<script lang="ts">
  interface Props {
    title?: string;
    count: number;
  }

  let { title = "Tu Biblioteca", count }: Props = $props();
</script>

<header class="tracks-header">
  <h2 class="tracks-title">{title}</h2>
  <span class="tracks-count">{count.toLocaleString()}</span>
</header>

<style>
  .tracks-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 20px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 1200px;
  }

  .tracks-title {
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .tracks-count {
    color: rgba(56, 189, 248, 0.8);
    font-size: 0.9rem;
    font-weight: 500;
    background: rgba(56, 189, 248, 0.1);
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid rgba(56, 189, 248, 0.2);
  }

  @media (max-width: 640px) {
    .tracks-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .tracks-title {
      font-size: 1.25rem;
    }
  }
</style>
