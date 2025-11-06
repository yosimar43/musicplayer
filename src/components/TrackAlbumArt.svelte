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
    sm: 'w-12 h-12',
    md: 'w-14 h-14',
    lg: 'w-20 h-20'
  };
  
  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32
  };
</script>

<div class="relative shrink-0 group/art">
  <Avatar class="{sizeClasses[size]} rounded-lg overflow-hidden ring-2 ring-transparent group-hover:ring-purple-500/30 transition-all duration-300">
    {#if isLoading}
      <Skeleton class="w-full h-full" />
    {:else if imageUrl}
      <AvatarImage 
        src={imageUrl} 
        alt={albumTitle}
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <AvatarFallback class="bg-linear-to-br from-purple-500/20 to-pink-500/20">
        <Music size={iconSizes[size]} class="text-purple-400/50" />
      </AvatarFallback>
    {:else}
      <AvatarFallback class="bg-linear-to-br from-purple-500/20 to-pink-500/20">
        <Music size={iconSizes[size]} class="text-purple-400/50" />
      </AvatarFallback>
    {/if}
  </Avatar>
  
  <!-- Play indicator overlay -->
  {#if isPlaying}
    <div class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
      <div class="flex gap-1 items-end h-6">
        <div class="w-1 bg-green-500 rounded-full animate-pulse" style="height: 60%; animation-delay: 0ms;"></div>
        <div class="w-1 bg-green-500 rounded-full animate-pulse" style="height: 100%; animation-delay: 150ms;"></div>
        <div class="w-1 bg-green-500 rounded-full animate-pulse" style="height: 40%; animation-delay: 300ms;"></div>
        <div class="w-1 bg-green-500 rounded-full animate-pulse" style="height: 80%; animation-delay: 450ms;"></div>
      </div>
    </div>
  {:else}
    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
      <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300">
        <Play size={16} class="text-black fill-black ml-0.5" />
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
