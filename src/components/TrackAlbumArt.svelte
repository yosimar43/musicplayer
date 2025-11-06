<script lang="ts">
  import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Play, Music } from 'lucide-svelte';
  
  interface Props {
    imageUrl: string | null;
    isLoading: boolean;
    isPlaying: boolean;
    albumTitle?: string;
    size?: 'sm' | 'md' | 'lg';
  }
  
  let { imageUrl, isLoading, isPlaying, albumTitle = 'Album', size = 'md' }: Props = $props();
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-18 h-18'
  };
  
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28
  };
</script>

<div class="relative shrink-0 group/art">
  <Avatar class="{sizeClasses[size]} rounded-lg overflow-hidden ring-2 ring-transparent group-hover:ring-cyan-400/60 transition-all duration-300 shadow-lg shadow-black/20">
    {#if isLoading}
      <Skeleton class="w-full h-full bg-sky-800/50" />
    {:else if imageUrl}
      <AvatarImage 
        src={imageUrl} 
        alt={albumTitle}
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <AvatarFallback class="bg-linear-to-br from-cyan-400/30 to-blue-500/30">
        <Music size={iconSizes[size]} class="text-cyan-300/60" />
      </AvatarFallback>
    {:else}
      <AvatarFallback class="bg-linear-to-br from-cyan-400/30 to-blue-500/30">
        <Music size={iconSizes[size]} class="text-cyan-300/60" />
      </AvatarFallback>
    {/if}
  </Avatar>
  
  <!-- Play indicator overlay -->
  {#if isPlaying}
    <div class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <div class="flex gap-1 items-end h-6">
        <div class="w-1 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style="height: 60%; animation-delay: 0ms;"></div>
        <div class="w-1 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style="height: 100%; animation-delay: 150ms;"></div>
        <div class="w-1 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style="height: 40%; animation-delay: 300ms;"></div>
        <div class="w-1 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style="height: 80%; animation-delay: 450ms;"></div>
      </div>
    </div>
  {:else}
    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center backdrop-blur-sm">
      <div class="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/60 transform scale-0 group-hover:scale-100 transition-transform duration-300">
        <Play size={16} class="text-white fill-white ml-0.5" />
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes pulse {
    0%, 100% {
      height: 40%;
    }
    50% {
      height: 100%;
    }
  }
</style>
