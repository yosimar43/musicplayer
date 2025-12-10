<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";

  interface Props {
    letters: string[];
    currentLetter: string;
    onLetterClick: (letter: string) => void;
  }

  let { letters, currentLetter, onLetterClick }: Props = $props();
  
  // Debug: verificar letras recibidas
  $effect(() => {
    console.log('🔤 AlphabetNav letters:', letters);
  });
  
  // Refs
  let navRef = $state<HTMLElement>();
  let letterRefs = $state<(HTMLButtonElement | undefined)[]>([]);
  
  // Asegurar que letterRefs tenga el tamaño correcto
  $effect(() => {
    if (letters.length !== letterRefs.length) {
      letterRefs = new Array(letters.length).fill(undefined);
    }
  });
  
  // Estado
  let isHovering = $state(false);
  let hoveredIndex = $state<number | null>(null);
  let previousActiveIndex = $state<number>(-1);
  
  // ✅ Defaults compartidos para evitar duplicación
  const animDefaults = { ease: "power2.out", overwrite: "auto" as const };
  
  // ✅ Efecto optimizado con batching: animar letra activa + reset anterior en una sola pasada
  $effect(() => {
    if (!letterRefs.length || !letters.length) return;
    
    const activeIndex = letters.indexOf(currentLetter);
    if (activeIndex === -1 || activeIndex === previousActiveIndex) return;
    
    const activeBtn = letterRefs[activeIndex];
    if (!activeBtn) return;
    
    // ✅ Batching: agrupar ambas animaciones en un solo RAF
    requestAnimationFrame(() => {
      const targets = [];
      const configs: gsap.TweenVars[] | { scale: number; z: number; rotateY: number; duration: number; ease: string; overwrite: boolean; }[] = [];
      
      // Animar nueva letra activa (si no está en hover)
      if (hoveredIndex !== activeIndex) {
        targets.push(activeBtn);
        configs.push({
          scale: 1.3,
          z: 20,
          rotateY: 0,
          duration: 0.15,
          ease: "power2.out",
          overwrite: true
        });
      }
      
      // Reset letra anterior (si existe y no está en hover)
      if (previousActiveIndex !== -1 && previousActiveIndex !== activeIndex) {
        const prevBtn = letterRefs[previousActiveIndex];
        if (prevBtn && hoveredIndex !== previousActiveIndex) {
          targets.push(prevBtn);
          configs.push({
            scale: 1,
            z: 0,
            rotateY: 0,
            duration: 0.15,
            ease: "power2.out",
            overwrite: true
          });
        }
      }
      
      // ✅ Ejecutar todas las animaciones juntas (más eficiente)
      targets.forEach((target, i) => gsap.to(target, configs[i]));
      
      previousActiveIndex = activeIndex;
    });
  });
  
  // Handlers de hover para efecto 3D (optimizado)
  const handleMouseEnter = (index: number) => {
    hoveredIndex = index;
    const btn = letterRefs[index];
    if (!btn) return;
    
    // Animar independientemente de si es activa (evita bloqueo)
    gsap.to(btn, {
      scale: letters[index] === currentLetter ? 1.35 : 1.2,
      z: 15,
      rotateY: -10,
      duration: 0.12, // Reducido de 0.15s para feedback más rápido
      ...animDefaults
    });
  };
  
  const handleMouseLeave = (index: number) => {
    const btn = letterRefs[index];
    if (!btn) return;
    
    // Resetear después de pequeño delay
    setTimeout(() => {
      hoveredIndex = null;
    }, 50);
    
    // Si es la letra activa, volver a escala activa
    const isActive = letters[index] === currentLetter;
    gsap.to(btn, {
      scale: isActive ? 1.3 : 1,
      z: isActive ? 20 : 0,
      rotateY: 0,
      duration: 0.2,
      ...animDefaults
    });
  };
  
  // Hover en toda la nav
  const handleNavEnter = () => {
    isHovering = true;
    if (!navRef) return;
    gsap.to(navRef, {
      x: -4,
      scale: 1.02,
      duration: 0.2,
      ...animDefaults
    });
  };
  
  const handleNavLeave = () => {
    isHovering = false;
    setTimeout(() => {
      hoveredIndex = null;
    }, 100);
    if (!navRef) return;
    gsap.to(navRef, {
      x: 0,
      scale: 1,
      duration: 0.2,
      ...animDefaults
    });
  };
  
  // Click con feedback (optimizado)
  const handleClick = (letter: string, index: number) => {
    const btn = letterRefs[index];
    if (!btn) {
      onLetterClick(letter);
      return;
    }
    
    // Pulse animation más rápida
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .to(btn, { scale: 0.9, duration: 0.08, ease: "power2.in" }) // Reducido de 0.1s
      .to(btn, { scale: 1.3, duration: 0.2, ease: "elastic.out(1, 0.5)" }); // Reducido de 0.3s
    
    onLetterClick(letter);
  };
  
  // ✅ Cleanup de animaciones al desmontar
  const killAllAnimations = () => {
    if (navRef) gsap.killTweensOf(navRef);
    letterRefs.forEach(ref => {
      if (ref) gsap.killTweensOf(ref);
    });
  };
  
  onMount(() => {
    if (!navRef) return;
    
    // Inicializar estilos 3D
    gsap.set(navRef, { transformStyle: "preserve-3d", perspective: 800 });
    const validRefs = letterRefs.filter(ref => ref !== undefined);
    if (validRefs.length > 0) {
      gsap.set(validRefs, { transformStyle: "preserve-3d" });
    }
    
    // Animación de entrada escalonada
    if (validRefs.length > 0) {
      gsap.from(validRefs, {
        opacity: 0,
        x: 20,
        rotateY: 45,
        stagger: 0.02,
        duration: 0.5,
        ease: "power2.out",
        delay: 0.3,
      });
    }
    
    // ✅ Cleanup al desmontar
    return () => killAllAnimations();
  });
</script>

{#if letters.length > 0}
  <nav 
    bind:this={navRef}
    class="alphabet-nav" 
    class:hovering={isHovering}
    aria-label="Navegación alfabética"
    onmouseenter={handleNavEnter}
    onmouseleave={handleNavLeave}
  >
    <!-- Glow indicator para la letra activa -->
    <div class="active-glow" aria-hidden="true"></div>
    
    {#each letters as letter, i}
      <button
        bind:this={letterRefs[i]}
        class="alphabet-letter"
        class:active={currentLetter === letter}
        class:neighbor={hoveredIndex !== null && Math.abs(hoveredIndex - i) === 1}
        onclick={() => handleClick(letter, i)}
        onmouseenter={() => handleMouseEnter(i)}
        onmouseleave={() => handleMouseLeave(i)}
        aria-label={`Ir a ${letter}`}
      >
        <span class="letter-text">{letter}</span>
      </button>
    {/each}
  </nav>
{/if}

<style>
  .alphabet-nav {
    position: fixed;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 10px 6px;
    background: linear-gradient(
      135deg,
      rgba(15, 23, 42, 0.85) 0%,
      rgba(30, 41, 59, 0.75) 100%
    );
    backdrop-filter: blur(12px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset,
      0 -2px 8px rgba(56, 189, 248, 0.1) inset;
    z-index: 100;
    transform-style: preserve-3d;
    perspective: 800px;
  }
  
  .alphabet-nav:hover {
    will-change: transform;
  }

  .alphabet-nav.hovering {
    box-shadow: 
      0 12px 40px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(56, 189, 248, 0.15) inset,
      0 0 20px rgba(56, 189, 248, 0.1);
  }

  .active-glow {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    pointer-events: none;
    opacity: 0.5;
    background: radial-gradient(
      ellipse at center,
      rgba(56, 189, 248, 0.15) 0%,
      transparent 70%
    );
  }

  .alphabet-letter {
    position: relative;
    width: 22px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.4);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: color 0.15s ease;
    padding: 0;
    transform-style: preserve-3d;
  }
  
  .alphabet-letter:hover {
    will-change: transform;
  }

  .letter-text {
    position: relative;
    z-index: 2;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .alphabet-letter:hover {
    color: rgba(255, 255, 255, 0.95);
  }

  .alphabet-letter.neighbor {
    color: rgba(255, 255, 255, 0.6);
  }

  .alphabet-letter.active {
    color: #38bdf8;
    text-shadow: 
      0 0 6px rgba(56, 189, 248, 1),
      0 0 12px rgba(56, 189, 248, 0.8),
      0 0 20px rgba(56, 189, 248, 0.5),
      0 0 30px rgba(56, 189, 248, 0.3);
    -webkit-text-stroke: 0.5px rgba(56, 189, 248, 0.6);
  }

  @media (max-width: 900px) {
    .alphabet-nav {
      right: 6px;
      padding: 8px 5px;
    }

    .alphabet-letter {
      width: 20px;
      height: 16px;
      font-size: 9px;
    }
  }

  @media (max-width: 640px) {
    .alphabet-nav {
      gap: 0px;
      padding: 6px 4px;
      border-radius: 16px;
    }

    .alphabet-letter {
      width: 18px;
      height: 14px;
      font-size: 8px;
      border-radius: 4px;
    }
  }

  @media (max-width: 400px) {
    .alphabet-letter {
      width: 16px;
      height: 12px;
      font-size: 7px;
    }
  }
</style>
