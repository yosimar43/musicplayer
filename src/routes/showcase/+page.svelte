<script lang="ts">
  import { onMount } from 'svelte';
  import { fadeIn, scaleIn, staggerItems, pulse, glow, slideInLeft, slideInRight, popIn } from '@/lib/animations';
  import { Button } from '$lib/components/ui/button';
  import { Play, Pause, Heart, Sparkles, Music } from 'lucide-svelte';

  let isPlaying = $state(false);

  onMount(() => {
    // Animaciones de entrada escalonadas
    fadeIn('.showcase-header');
    scaleIn('.glass-card');
    staggerItems('.demo-item');
    slideInLeft('.left-panel');
    slideInRight('.right-panel');
    
    // Efectos continuos
    setTimeout(() => {
      glow('.glow-element');
      pulse('.pulse-element');
    }, 1000);
  });
</script>

<div class="min-h-screen relative overflow-hidden pb-20" style="background: linear-gradient(to bottom right, #1e293b, #0f172a, #000000);">
  <!-- 🌌 Animated Background Orbs -->
  <div class="fixed inset-0 pointer-events-none">
    <div class="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[140px] animate-float"></div>
    <div class="absolute bottom-20 right-10 w-80 h-80 bg-blue-400/20 rounded-full blur-[120px] animate-float" style="animation-delay: 2s;"></div>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-300/10 rounded-full blur-[180px]"></div>
  </div>

  <div class="relative z-10 container mx-auto px-8 py-16 space-y-16">
    <!-- 🎨 Header -->
    <div class="showcase-header text-center space-y-6">
      <div class="inline-flex items-center gap-4 glass-strong px-8 py-4 rounded-2xl">
        <Sparkles size={32} class="text-cyan-400 glow-element" />
        <h1 class="text-6xl font-bold bg-clip-text text-transparent text-glow-strong" style="background-image: linear-gradient(to right, #67e8f9, #93c5fd, #67e8f9);">
          UI Showcase
        </h1>
      </div>
      <p class="text-xl text-slate-300 font-semibold tracking-wide">
        Glassmorphism + Anime.js v4 + Tailwind CSS
      </p>
    </div>

    <!-- 🎵 Music Player Demo -->
    <div class="glass-card max-w-4xl mx-auto p-8 rounded-3xl space-y-6">
      <h2 class="text-3xl font-bold text-white text-glow mb-6">Now Playing</h2>
      
      <div class="flex items-center gap-8">
        <!-- Album Art -->
        <div class="relative pulse-element">
          <div class="absolute inset-0 rounded-2xl blur-2xl opacity-50" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);"></div>
          <div class="relative w-48 h-48 rounded-2xl flex items-center justify-center shadow-2xl" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);">
            <Music size={64} class="text-white drop-shadow-lg" />
          </div>
        </div>

        <!-- Track Info -->
        <div class="flex-1 space-y-4">
          <div>
            <h3 class="text-3xl font-bold text-white mb-2">Believer</h3>
            <p class="text-xl text-slate-300">Imagine Dragons • Evolve</p>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-2">
            <div class="h-2 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full w-1/2 rounded-full shadow-lg shadow-cyan-500/50" style="background: linear-gradient(to right, #22d3ee, #3b82f6);"></div>
            </div>
            <div class="flex justify-between text-sm text-slate-400">
              <span>1:45</span>
              <span>3:24</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-4">
            <Button
              onclick={() => isPlaying = !isPlaying}
              class="w-14 h-14 rounded-full shadow-2xl shadow-cyan-500/50 hover:scale-110 transition-all"
              style="background: linear-gradient(to right, #06b6d4, #3b82f6);"
            >
              {#if isPlaying}
                <Pause size={24} fill="white" class="text-white" />
              {:else}
                <Play size={24} fill="white" class="text-white" />
              {/if}
            </Button>

            <Button
              class="w-12 h-12 glass hover:bg-white/20 rounded-full hover:scale-110 transition-all"
            >
              <Heart size={20} class="text-slate-300" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 📊 Glass Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each ['Tracks', 'Albums', 'Artists'] as item, i}
        <div class="demo-item glass hover-lift rounded-2xl p-6 space-y-4 cursor-pointer">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background: linear-gradient(to bottom right, #22d3ee, #3b82f6);">
            <Sparkles size={24} class="text-white" />
          </div>
          <h3 class="text-2xl font-bold text-white">{item}</h3>
          <p class="text-slate-300">Discover your favorite {item.toLowerCase()}</p>
          <div class="text-4xl font-bold text-cyan-400">{Math.floor(Math.random() * 1000)}</div>
        </div>
      {/each}
    </div>

    <!-- 🎯 Two Column Demo -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Left Panel -->
      <div class="left-panel glass-strong rounded-3xl p-8 space-y-6">
        <h2 class="text-3xl font-bold text-white text-glow">Glassmorphism</h2>
        <p class="text-lg text-slate-300 leading-relaxed">
          Modern UI with frosted glass effects, subtle borders, and depth through layering.
        </p>
        
        <div class="space-y-3">
          {#each ['Standard Glass', 'Strong Glass', 'Subtle Glass'] as type}
            <div class="p-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all cursor-pointer">
              <span class="text-white font-semibold">{type}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Right Panel -->
      <div class="right-panel glass-strong rounded-3xl p-8 space-y-6">
        <h2 class="text-3xl font-bold text-white text-glow">Animations</h2>
        <p class="text-lg text-slate-300 leading-relaxed">
          Fluid animations powered by Anime.js v4 with spring physics and natural easing.
        </p>
        
        <div class="grid grid-cols-2 gap-3">
          {#each ['Fade In', 'Scale In', 'Slide', 'Bounce', 'Glow', 'Pulse'] as animation}
            <div class="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 transition-all cursor-pointer text-center">
              <span class="text-white font-semibold text-sm">{animation}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- 🎨 Color Palette -->
    <div class="glass-card rounded-3xl p-8">
      <h2 class="text-3xl font-bold text-white text-glow mb-8">Color Palette</h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div class="space-y-3">
          <div class="h-24 rounded-xl shadow-xl" style="background: linear-gradient(to bottom right, #22d3ee, #06b6d4);"></div>
          <p class="text-white font-semibold">Cyan 400-500</p>
        </div>
        <div class="space-y-3">
          <div class="h-24 rounded-xl shadow-xl" style="background: linear-gradient(to bottom right, #60a5fa, #3b82f6);"></div>
          <p class="text-white font-semibold">Blue 400-500</p>
        </div>
        <div class="space-y-3">
          <div class="h-24 rounded-xl shadow-xl" style="background: linear-gradient(to bottom right, #334155, #1e293b);"></div>
          <p class="text-white font-semibold">Slate 700-800</p>
        </div>
        <div class="space-y-3">
          <div class="h-24 rounded-xl shadow-xl" style="background: linear-gradient(to bottom right, #e2e8f0, #cbd5e1);"></div>
          <p class="text-white font-semibold">Neutral 100-300</p>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Animaciones personalizadas adicionales */
  @keyframes float-gentle {
    0%, 100% {
      transform: translate(0, 0) rotate(0deg);
    }
    33% {
      transform: translate(15px, -15px) rotate(2deg);
    }
    66% {
      transform: translate(-10px, 10px) rotate(-2deg);
    }
  }

  .animate-float {
    animation: float-gentle 20s ease-in-out infinite;
  }
</style>
