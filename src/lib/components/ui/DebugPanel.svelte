<script lang="ts">
  import { debugLogger } from '@/lib/utils/audioManager';
  import { audioManager } from '@/lib/utils/audioManager';
  import { usePlayer } from '@/lib/hooks/usePlayer.svelte';

  let { isInitialized } = $props();
  let showDebug = $state(false);
  let logs = $state<string[]>([]);

  const player = usePlayer();

  console.log('🔍 DebugPanel component initialized');

  function updateLogs() {
    logs = debugLogger.getLogs();
    console.log('🔍 DebugPanel: Updated logs, count:', logs.length);
  }

  function clearLogs() {
    debugLogger.clearLogs();
    logs = [];
  }

  function toggleDebug() {
    console.log('🔍 Debug button clicked, current showDebug:', showDebug);
    showDebug = !showDebug;
    console.log('🔍 Debug panel showDebug set to:', showDebug);
    if (showDebug) {
      updateLogs();
    }
  }

  // Auto-update logs every second when debug is open
  $effect(() => {
    console.log('🔍 DebugPanel: $effect triggered, showDebug:', showDebug);
    if (showDebug) {
      const interval = setInterval(updateLogs, 1000);
      return () => clearInterval(interval);
    }
  });
</script>

{#if showDebug}
  {@const _ = console.log('🔍 DebugPanel: Rendering debug panel')}
  <div class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div class="bg-gray-900 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
      <div class="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 class="text-xl font-bold text-white">🔍 Debug Panel</h2>
        <div class="flex gap-2">
          <button
            onclick={clearLogs}
            class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            🗑️ Clear
          </button>
          <button
            onclick={updateLogs}
            class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            🔄 Refresh
          </button>
          <button
            onclick={toggleDebug}
            class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
          >
            ✕ Close
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <div class="mb-4 p-3 bg-gray-800 rounded">
          <h3 class="text-lg font-semibold text-white mb-2">📊 System Status</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-400">Audio Initialized:</span>
              <span class="ml-2 {audioManager.isInitialized() ? 'text-green-400' : 'text-red-400'}">
                {audioManager.isInitialized() ? '✅' : '❌'}
              </span>
            </div>
            <div>
              <span class="text-gray-400">Player Initialized:</span>
              <span class="ml-2 {isInitialized ? 'text-green-400' : 'text-red-400'}">
                {isInitialized ? '✅' : '❌'}
              </span>
            </div>
            <div>
              <span class="text-gray-400">Audio Ready:</span>
              <span class="ml-2 {audioManager.isReady() ? 'text-green-400' : 'text-red-400'}">
                {audioManager.isReady() ? '✅' : '❌'}
              </span>
            </div>
            <div>
              <span class="text-gray-400">Current Track:</span>
              <span class="ml-2 text-white">
                {player.current?.title || 'None'}
              </span>
            </div>
            <div>
              <span class="text-gray-400">Duration:</span>
              <span class="ml-2 text-white">
                {audioManager.getDuration().toFixed(1)}s
              </span>
            </div>
            <div>
              <span class="text-gray-400">Current Time:</span>
              <span class="ml-2 text-white">
                {audioManager.getCurrentTime().toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 rounded p-3">
          <h3 class="text-lg font-semibold text-white mb-2">📝 Debug Logs ({logs.length})</h3>
          <div class="space-y-1 max-h-96 overflow-y-auto">
            {#each logs as log}
              <div class="text-xs font-mono text-gray-300 bg-gray-700 p-2 rounded">
                {log}
              </div>
            {/each}
            {#if logs.length === 0}
              <div class="text-gray-500 text-center py-4">
                No logs yet. Try playing a song to see debug information.
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Debug Toggle Button -->
<button
  onclick={toggleDebug}
  class="fixed bottom-4 right-4 z-50 bg-red-600 hover:bg-red-500 text-white p-4 rounded-full shadow-lg border-2 border-white"
  title="Toggle Debug Panel"
>
  🔍
</button>