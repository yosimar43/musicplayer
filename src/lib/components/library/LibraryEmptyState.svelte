<script lang="ts">
  import ShinyText from '$lib/components/ui/ShinyText.svelte';
  
  interface Props {
    title?: string;
    subtitle?: string;
  }

  let { 
    title = "No hay canciones", 
    subtitle = "Carga tu biblioteca de música desde el menú" 
  }: Props = $props();
</script>

<div class="empty-state">
  <div class="empty-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  </div>
  <ShinyText text={title} />
  <p class="empty-subtitle">{subtitle}</p>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 60px 20px;
    min-height: 60vh;
  }

  .empty-icon {
    width: 80px;
    height: 80px;
    color: rgba(255, 255, 255, 0.2);
    margin-bottom: 10px;
  }

  .empty-icon svg {
    width: 100%;
    height: 100%;
  }

  .empty-subtitle {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1rem;
    font-weight: 300;
    margin: 0;
  }
</style>
