<script lang="ts">
  let { 
    text = "", 
    subtext = false,
    truncate = false,
    className = "" 
  } = $props();
</script>

<div class="shiny-text-container {className}" class:subtext={subtext} class:truncate={truncate}>
  <span class="text-layer shadow-layer">{text}</span>
  <span class="text-layer gradient-layer">{text}</span>
  
  <!-- Sparkles -->
  <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
  </svg>
  <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
  </svg>
  <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
  </svg>
  <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
  </svg>
  <svg class="sparkle" viewBox="0 0 10 10" aria-hidden="true">
    <path d="M5 0C5 0 6.5 3.5 10 5C6.5 6.5 5 10 5 10C5 10 3.5 6.5 0 5C3.5 3.5 5 0 5 0Z" />
  </svg>
</div>

<style>
  /* Variables mapped to App Theme (Cyan/Blue) */
  .shiny-text-container {
    --color: #22d3ee; /* Cyan-400 */
    --shadow: #0369a1; /* Sky-700 */
    --glare: rgba(255, 255, 255, 0.9);
    --font-size: 1.125rem;
    
    position: relative;
    display: inline-block;
    text-decoration: none;
    color: transparent;
    cursor: default;
    
    /* Hover state variables */
    --hover: 0;
    --pos: 0;
  }

  .shiny-text-container.subtext {
    --font-size: 0.875rem;
    --color: #94a3b8; /* Slate-400 */
    --shadow: #334155; /* Slate-700 */
  }

  .shiny-text-container:hover {
    --hover: 1;
    --pos: 1;
  }

  /* Truncate support */
  .shiny-text-container.truncate {
    display: block;
    max-width: 100%;
  }

  .shiny-text-container.truncate .text-layer {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Text Layers */
  .text-layer {
    display: inline-block;
    font-size: var(--font-size);
    font-weight: 700;
    transition: all 0.2s;
    white-space: nowrap;
    line-height: 1.2;
  }

  /* Shadow Layer (Bottom) */
  .shadow-layer {
    color: transparent;
    text-shadow:
      calc(var(--hover) * (var(--font-size) * -0)) calc(var(--hover) * (var(--font-size) * 0)) var(--shadow),
      calc(var(--hover) * (var(--font-size) * -0.02)) calc(var(--hover) * (var(--font-size) * 0.02)) var(--shadow),
      calc(var(--hover) * (var(--font-size) * -0.04)) calc(var(--hover) * (var(--font-size) * 0.04)) var(--shadow),
      calc(var(--hover) * (var(--font-size) * -0.06)) calc(var(--hover) * (var(--font-size) * 0.06)) var(--shadow);
    transform: translate(calc(var(--hover) * (var(--font-size) * 0.10)), calc(var(--hover) * (var(--font-size) * -0.10)));
  }

  /* Gradient Layer (Top) */
  .gradient-layer {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      108deg,
      transparent 0 55%,
      var(--glare) 55% 60%,
      transparent 60% 70%,
      var(--glare) 70% 85%,
      transparent 85%
    ) calc(var(--pos) * -200%) 0% / 200% 100%, var(--color);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    z-index: 2;
    transform: translate(calc(var(--hover) * (var(--font-size) * 0.10)), calc(var(--hover) * (var(--font-size) * -0.10)));
    transition: transform 0.2s, background-position 0s;
  }

  .shiny-text-container:hover .gradient-layer {
    transition: transform 0.2s, background-position 1.5s 0.25s;
  }

  /* Sparkles */
  .sparkle {
    position: absolute;
    z-index: 3;
    width: calc(var(--font-size) * 0.5);
    aspect-ratio: 1;
    pointer-events: none;
    transform: translate(-50%, -50%) scale(0);
  }

  .sparkle path {
    fill: var(--glare);
  }

  .shiny-text-container:hover .sparkle {
    animation: sparkle 0.75s calc((var(--delay-step) * var(--d)) * 1s) both;
  }

  @keyframes sparkle {
    50% {
      transform: translate(-50%, -50%) scale(var(--s, 1));
    }
  }

  /* Sparkle Positioning */
  .sparkle { --delay-step: 0.15; }
  .sparkle:nth-of-type(1) { top: 20%; left: 0%; --s: 1.1; --d: 1; }
  .sparkle:nth-of-type(2) { top: 80%; left: 15%; --s: 1.25; --d: 2; }
  .sparkle:nth-of-type(3) { top: 40%; left: 45%; --s: 1.1; --d: 3; }
  .sparkle:nth-of-type(4) { top: 60%; left: 75%; --s: 0.9; --d: 2; }
  .sparkle:nth-of-type(5) { top: 30%; left: 100%; --s: 0.8; --d: 4; }
</style>