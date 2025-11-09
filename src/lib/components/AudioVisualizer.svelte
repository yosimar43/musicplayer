<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { audioVisualizer } from '@/lib/utils/audioVisualizer';
  import { player } from '@/lib/state';

  interface Props {
    mode?: 'bars' | 'wave' | 'circular';
    color?: string;
    barCount?: number;
    height?: number;
  }

  let { 
    mode = 'bars', 
    color = '#22d3ee', 
    barCount = 64,
    height = 128 
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let animationId: number;
  let isActive = $state(false);

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    
    // Ajustar resolución del canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Iniciar visualización si hay audio reproduciéndose
    if (player.isPlaying && audioVisualizer.initialized) {
      startVisualization();
    }
  });

  // Reaccionar a cambios en isPlaying
  $effect(() => {
    if (player.isPlaying && audioVisualizer.initialized) {
      startVisualization();
    } else {
      stopVisualization();
    }
  });

  function startVisualization() {
    if (isActive) return;
    isActive = true;
    
    const animate = () => {
      if (!isActive) return;

      if (mode === 'bars') {
        drawBars();
      } else if (mode === 'wave') {
        drawWave();
      } else if (mode === 'circular') {
        drawCircular();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  function stopVisualization() {
    isActive = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    clearCanvas();
  }

  function drawBars() {
    const dataArray = audioVisualizer.getFrequencyData();
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    clearCanvas();

    const barWidth = width / barCount;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step];
      const barHeight = (value / 255) * height;
      const x = i * barWidth;
      const y = height - barHeight;

      // Gradiente vertical
      const gradient = ctx.createLinearGradient(x, y, x, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '40'); // 25% opacity

      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }
  }

  function drawWave() {
    const dataArray = audioVisualizer.getWaveformData();
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    clearCanvas();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0; // 0-2
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }

  function drawCircular() {
    const dataArray = audioVisualizer.getFrequencyData();
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;
    
    clearCanvas();

    const bars = 64;
    const step = Math.floor(dataArray.length / bars);

    for (let i = 0; i < bars; i++) {
      const value = dataArray[i * step];
      const barHeight = (value / 255) * radius;
      const angle = (i / bars) * Math.PI * 2;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  }

  onDestroy(() => {
    stopVisualization();
  });
</script>

<canvas 
  bind:this={canvas} 
  class="w-full rounded-lg"
  style="height: {height}px;"
></canvas>

<style>
  canvas {
    background: transparent;
  }
</style>
