<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Plus, Play } from "lucide-svelte";

  const playlists = [
    { name: "Favorites", count: 24, color: "from-red-500 to-pink-500" },
    { name: "Chill Vibes", count: 18, color: "from-blue-500 to-cyan-500" },
    { name: "Workout Mix", count: 32, color: "from-orange-500 to-yellow-500" },
    { name: "Focus", count: 15, color: "from-green-500 to-emerald-500" },
  ];
</script>

<div class="py-6">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-white">Playlists</h1>
    <Button>
      <Plus size={18} class="mr-2" />
      New Playlist
    </Button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {#each playlists as playlist}
      <Card.Root class="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer group">
        <Card.Content class="p-6">
          <div class="aspect-square bg-linear-to-br {playlist.color} rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
            <span class="text-white text-6xl">♪</span>
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              <Button size="icon" class="opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 rounded-full bg-green-500 hover:bg-green-600 hover:scale-110">
                <Play size={24} fill="white" />
              </Button>
            </div>
          </div>
          <h3 class="text-white font-semibold text-lg mb-1">{playlist.name}</h3>
          <p class="text-gray-400 text-sm">{playlist.count} songs</p>
        </Card.Content>
      </Card.Root>
    {/each}
  </div>
</div>
