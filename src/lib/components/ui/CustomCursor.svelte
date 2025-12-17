<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';

  let cursor: HTMLDivElement;
  let width = 26;
  let amount = 20;
  let sineDots = Math.floor(amount * 0.3);
  let idleTimeout = 150;
  let dots: Dot[] = [];
  let mousePosition = { x: 0, y: 0 };
  let idle = false;
  let timeoutID: any;

  // Colors from the app theme (Sky to Indigo)
  const startColor = "rgb(56, 189, 248)"; // Sky 400
  const endColor = "rgb(99, 102, 241)";   // Indigo 500

  class Dot {
    index: number;
    anglespeed: number;
    x: number;
    y: number;
    scale: number;
    range: number;
    limit: number;
    element: HTMLSpanElement;
    lockX: number = 0;
    lockY: number = 0;
    angleX: number = 0;
    angleY: number = 0;
    xSet: (value: number) => void;
    ySet: (value: number) => void;

    constructor(index: number) {
      this.index = index;
      this.anglespeed = 0.05;
      this.x = 0;
      this.y = 0;
      this.scale = 1 - 0.05 * index;
      this.range = width / 2 - width / 2 * this.scale + 2;
      this.limit = width * 0.75 * this.scale;
      this.element = document.createElement("span");
      
      // Performance optimization: will-change
      this.element.style.willChange = "transform";
      
      // Gradient color
      const color = gsap.utils.interpolate(startColor, endColor, index / amount);
      this.element.style.backgroundColor = color;

      gsap.set(this.element, { scale: this.scale, x: 0, y: 0 });
      
      // Use quickSetter for performance
      this.xSet = gsap.quickSetter(this.element, "x", "px") as (value: number) => void;
      this.ySet = gsap.quickSetter(this.element, "y", "px") as (value: number) => void;

      if (cursor) cursor.appendChild(this.element);
    }

    lock() {
      this.lockX = this.x;
      this.lockY = this.y;
      this.angleX = Math.PI * 2 * Math.random();
      this.angleY = Math.PI * 2 * Math.random();
    }

    draw() {
      if (!idle || this.index <= sineDots) {
        this.xSet(this.x);
        this.ySet(this.y);
      } else {
        this.angleX += this.anglespeed;
        this.angleY += this.anglespeed;
        this.y = this.lockY + Math.sin(this.angleY) * this.range;
        this.x = this.lockX + Math.sin(this.angleX) * this.range;
        this.xSet(this.x);
        this.ySet(this.y);
      }
    }
  }

  function startIdleTimer() {
    timeoutID = setTimeout(goInactive, idleTimeout);
    idle = false;
  }

  function resetIdleTimer() {
    clearTimeout(timeoutID);
    startIdleTimer();
  }

  function goInactive() {
    idle = true;
    for (let dot of dots) {
      dot.lock();
    }
  }

  function buildDots() {
    dots = [];
    if (!cursor) return;
    cursor.innerHTML = ''; 
    for (let i = 0; i < amount; i++) {
      let dot = new Dot(i);
      dots.push(dot);
    }
  }

  const onMouseMove = (event: MouseEvent) => {
    mousePosition.x = event.clientX - width / 2;
    mousePosition.y = event.clientY - width / 2;
    resetIdleTimer();
  };

  const onTouchMove = (event: TouchEvent) => {
    mousePosition.x = event.touches[0].clientX - width / 2;
    mousePosition.y = event.touches[0].clientY - width / 2;
    resetIdleTimer();
  };

  const render = () => {
    positionCursor();
  };

  const positionCursor = () => {
    let x = mousePosition.x;
    let y = mousePosition.y;
    dots.forEach((dot, index, dots) => {
      let nextDot = dots[index + 1] || dots[0];
      dot.x = x;
      dot.y = y;
      dot.draw();
      if (!idle || index <= sineDots) {
        const dx = (nextDot.x - dot.x) * 0.35;
        const dy = (nextDot.y - dot.y) * 0.35;
        x += dx;
        y += dy;
      }
    });
  };

  onMount(() => {
    const ctx = gsap.context(() => {
        buildDots();
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("touchmove", onTouchMove);
        startIdleTimer();
        gsap.ticker.add(render);

        // Add hover effect for interactive elements
        const interactiveElements = document.querySelectorAll('button, [role="button"], a, .clickable, input, textarea, select');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.filter = 'url("#goo") brightness(1.2) saturate(1.5) drop-shadow(0 0 12px #38bdf8)';
            });
            el.addEventListener('mouseleave', () => {
                cursor.style.filter = 'url("#goo")';
            });
        });
    });

    return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("touchmove", onTouchMove);
        clearTimeout(timeoutID);
        ctx.revert();
        gsap.ticker.remove(render);
    };
  });
</script>

<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="800" style="display: none;">
  <defs>
    <filter id="goo">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
      <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" result="goo" />
      <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
    </filter>
  </defs>
</svg>

<div id="cursor" class="Cursor" bind:this={cursor}></div>

<style>
  :global(body) {
    cursor: none;
  }

  .Cursor {
    pointer-events: none !important;
    position: fixed;
    display: block;
    border-radius: 0;
    transform-origin: center center;
    mix-blend-mode: normal;
    top: 0;
    left: 0;
    z-index: 2147483647;
    filter: url("#goo");
    will-change: transform;
    transition: filter 0.2s cubic-bezier(.4,0,.2,1);
  }

  /* Button hover effect for cursor: scale up trail */
  /* Handled via JavaScript event listeners */

  /* Hide default cursor on interactive elements */
  :global(button),
  :global([role="button"]),
  :global(a),
  :global(.clickable),
  :global(input),
  :global(textarea),
  :global(select) {
    cursor: none !important;
  }

  /* Since spans are created dynamically, we need global or deep selector */
  :global(.Cursor span) {
    position: absolute;
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 20px;
    /* background-color: white; Removed to allow inline styles */
    transform-origin: center center;
    transform: translate(-50%, -50%);
  }
  
  @media (hover: none) {
      .Cursor {
          display: none;
      }
      :global(body) {
          cursor: auto;
      }
  }
</style>
