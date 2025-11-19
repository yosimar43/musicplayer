<script lang="ts">
  import { onMount } from 'svelte';

  // --- 1. Definición de Tipos y Datos ---
  interface CarouselItem {
    id: number;
    title: string;
    subtitle: string;
    bg: string;
  }

  const items: CarouselItem[] = [
    { id: 1, title: "Midnight Echoes", subtitle: "Luna Lux", bg: "linear-gradient(to bottom, #2c3e50, #3498db)" },
    { id: 2, title: "Stardust Serenade", subtitle: "Celius", bg: "linear-gradient(to bottom, #8e44ad, #c0392b)" },
    { id: 3, title: "Ocean Dreams", subtitle: "Aqua Tides", bg: "linear-gradient(to bottom, #e67e22, #d35400)" },
    { id: 4, title: "Fractured Reality", subtitle: "Broken Strings", bg: "linear-gradient(to bottom, #000000, #434343)" },
    { id: 5, title: "Cosmic Harmonies", subtitle: "Stellar Drift", bg: "linear-gradient(to bottom, #0984e3, #74b9ff)" },
    { id: 6, title: "Neon Horizon", subtitle: "Synthwave", bg: "linear-gradient(to bottom, #fd79a8, #e84393)" },
    { id: 7, title: "Deep Focus", subtitle: "Mindset", bg: "linear-gradient(to bottom, #00b894, #55efc4)" },
    { id: 8, title: "Solar Flare", subtitle: "Heatwave", bg: "linear-gradient(to bottom, #fab1a0, #ff7675)" },
    { id: 9, title: "Void Walker", subtitle: "Abyss", bg: "linear-gradient(to bottom, #2d3436, #636e72)" }
  ];

  // --- 2. Estado y Configuración ---
  let activeIndex = $state(0);
  const totalItems = items.length;

  // 0. Configuración
  const CARD_WIDTH   = 280;   
  const CARD_HEIGHT  = 380;
  // Factores ajustados para asegurar la visibilidad en el túnel
  const Y_FACTOR     = 0.30;    // Desplazamiento más suave
  const Z_DISTANCE   = 150;     
  const SCALE_DECAY  = 0.12;    
  const MAX_VISIBLE  = 8; 

  let sceneEl: HTMLDivElement; 
  // Altura inicial y reactiva
  let sceneHeight = $state(550); // Coincide con el CSS
  
  // --- 4. Lógica de cálculo dinámico de visibles (Derived Signal) ---
  const visibleCount = $derived(() => {
    let count = 1; 
    
    for (let d = 1; d < totalItems && d < MAX_VISIBLE; d++) {
        const yOffset = d * (CARD_HEIGHT * Y_FACTOR); 
        
        // Cálculo del punto más bajo de la tarjeta de la cola (d)
        // Punto más bajo = (Centro Escena) + (Offset Y) + (Mitad Tarjeta)
        // Condición: El punto más bajo no debe exceder la Altura de la Escena.
        const lowestPointFromTop = (sceneHeight / 2) + yOffset + (CARD_HEIGHT / 2);
        
        if (lowestPointFromTop <= sceneHeight) {
            count = d + 1;
        } else {
            break;
        }
    }
    return count;
  });

  // --- 5. Lógica de Navegación POR GRUPOS ---
  const safeMod = (n: number, m: number): number => ((n % m) + m) % m;

  const handleNext = () => {
    // Avanza por el número de elementos visibles (efecto de grupo)
    const step = visibleCount() > 0 ? visibleCount() : 1; 
    activeIndex = safeMod(activeIndex + step, totalItems);
  };

  const handlePrev = () => {
    // Retrocede por el número de elementos visibles (efecto de grupo)
    const step = visibleCount() > 0 ? visibleCount() : 1;
    activeIndex = safeMod(activeIndex - step, totalItems);
  };

  // --- 7. Medición del DOM con ResizeObserver ---
  onMount(() => {
    const ro = new ResizeObserver(() => {
      // Actualizar el estado de la señal
      if (sceneEl) sceneHeight = sceneEl.clientHeight;
    });

    if (sceneEl) {
      ro.observe(sceneEl);
    }
    
    return () => {
      if (sceneEl) ro.unobserve(sceneEl);
    };
  });


  // --- 6. Lógica de Estilo Z-Axis (Túnel Frontal Puro) ---
  const getCardStyle = (index: number, current: number) => {
    const distance = ((index - current) % totalItems + totalItems) % totalItems;

    let zIndex = 0, opacity = 0, pointerEvents = 'none';
    let transform = 'translate3d(0, 0, -1000px) scale(0.4)';
    let border = 'rgba(255,255,255,0.1)';
    let glow = 0;
    
    if (distance < visibleCount()) { 
      const yOffset = distance * (CARD_HEIGHT * Y_FACTOR); 
      const zOffset = -distance * Z_DISTANCE; 
      const scale   = 1 - distance * SCALE_DECAY; 

      zIndex        = 20 - distance;
      opacity       = 1 - distance * 0.18; 
      pointerEvents = distance === 0 ? 'auto' : 'none'; 
      border        = distance === 0 ? '#00d2d3' : 'rgba(255,255,255,0.2)';
      glow          = distance === 0 ? 0.8 : 0;
      
      // La clave es que el X es 0, confiando en la nueva anchura del .scene
      transform     = `translate3d(0, ${yOffset}px, ${zOffset}px) scale(${scale})`;
    }

    return `
      transform:${transform};
      z-index:${zIndex};
      opacity:${opacity};
      pointer-events:${pointerEvents};
      --border-color:${border};
      --glow-opacity:${glow};
    `;
  };
</script>

---

<main class="container">
  <div class="ambient-light"></div>

  <div class="scene" bind:this={sceneEl}>
    {#each items as item, i (item.id)}
      <div 
        class="card" 
        style="{getCardStyle(i, activeIndex)}"
      >
        <div class="card-visual" style="background: {item.bg}">
          <div class="glass-reflection"></div>
          <span class="track-number">#{item.id < 10 ? `0${item.id}` : item.id}</span>
        </div>
        
        <div class="card-info">
          <h3>{item.title}</h3>
          <p>{item.subtitle}</p>
        </div>
      </div>
    {/each}
  </div>

  <div class="controls">
    <button onclick={handlePrev}>&larr;</button>
    <button onclick={handleNext}>&rarr;</button>
  </div>
  
  <p class="status">
    Visible: **{visibleCount()}** / Total: **{totalItems}**
  </p>
</main>

---

<style>
  /* Reset y Base */
  :global(body) {
    margin: 0;
    background-color: #05101c;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: white;
    overflow: hidden;
  }

  .container {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    perspective: 1200px;
  }

  .ambient-light {
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, rgba(0, 210, 211, 0.1), transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* 💡 SOLUCIÓN A SU PROBLEMA: EL ANCHO ES MAYOR QUE LA TARJETA */
  .scene {
    position: relative;
    background: #00d2d3;
    width: 100%;
    height: 550px;    /* Suficiente espacio vertical para la cascada */
    transform-style: preserve-3d;
    margin-bottom: 3rem;
  }

  /* --- Estilos de la Tarjeta --- */
  .card {
    position: absolute;
    width: 280px;    
    height: 380px;   
    
    /* Centrado explícito (CRUCIAL para el 3D) */
    left: 50%;
    top: 50%;
    margin-left: -140px; /* -width/2 */
    margin-top: -190px;  /* -height/2 */
    
    border-radius: 24px;
    
    /* Variables dinámicas */
    border: 2px solid var(--border-color);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 
                0 0 30px rgba(0, 210, 211, var(--glow-opacity));
    
    background: #000;
    
    /* Transiciones suaves */
    transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), 
                opacity 0.6s ease, 
                box-shadow 0.6s ease,
                border-color 0.6s ease;
    
    display: flex;
    flex-direction: column;
    overflow: hidden;
    will-change: transform, opacity;
  }

  .card-visual {
    flex: 1;
    position: relative;
    width: 100%;
    overflow: hidden;
  }

  .track-number {
    position: absolute;
    top: 15px;
    right: 20px;
    font-size: 2.5rem;
    font-weight: 900;
    color: rgba(255,255,255,0.15);
    letter-spacing: -2px;
  }

  .glass-reflection {
    position: absolute;
    top: 0;
    left: 0;
    width: 150%;
    height: 100%;
    background: linear-gradient(
      115deg, 
      transparent 30%, 
      rgba(255,255,255,0.1) 45%, 
      rgba(255,255,255,0.2) 50%, 
      transparent 55%
    );
    transform: translateX(-20%);
  }

  .card-info {
    padding: 20px;
    background: rgba(10, 20, 30, 0.95);
    text-align: center;
    border-top: 1px solid rgba(255,255,255,0.1);
  }

  h3 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #ecf0f1;
  }

  p {
    margin: 6px 0 0 0;
    font-size: 0.9rem;
    color: #00d2d3;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 600;
  }

  /* --- Controles --- */
  .controls {
    display: flex;
    gap: 30px;
    z-index: 50;
  }

  button {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
  }

  button:hover {
    background: #00d2d3;
    border-color: #00d2d3;
    color: #05101c;
    box-shadow: 0 0 25px rgba(0, 210, 211, 0.6);
    transform: scale(1.1);
  }
  
  button:active {
    transform: scale(0.95);
  }
  
  .status {
    margin-top: 15px;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }
</style>