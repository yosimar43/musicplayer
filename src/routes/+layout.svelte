<script>
  let { children } = $props();
  import "../styles/app.css";
  import MusicPlayerApp from "@/components/musicplayerapp.svelte";
</script>

<div class="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-violet-900">
  <main class="container mx-auto p-4">
    {@render children()}
  </main>
  
  <!-- Fixed Music Player at Bottom -->
  <div class="fixed bottom-0 left-0 right-0 p-4">
    <MusicPlayerApp />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
  }
</style>