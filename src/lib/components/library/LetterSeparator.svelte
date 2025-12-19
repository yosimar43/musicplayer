<script lang="ts">
  import gsap from 'gsap';

  interface Props {
    letter: string;
    shouldAnimate?: boolean;
  }

  let { letter, shouldAnimate = false }: Props = $props();

  let letterRef = $state<HTMLSpanElement>();
  let previousLetter = $state('');

  // Animación cuando cambia la letra (solo si shouldAnimate es true)
  $effect(() => {
    if (!shouldAnimate) return;
    
    if (letter !== previousLetter && letterRef && previousLetter !== '') {
      // Animación de salida de la letra anterior
      const tl = gsap.timeline();
      
      tl.to(letterRef, {
        scale: 0.8,
        opacity: 0,
        y: -10,
        duration: 0.3,
        ease: 'back.in(1.7)',
        onComplete: () => {
          // Cambiar el texto después de la animación de salida
          if (letterRef) {
            letterRef.textContent = letter;
          }
        }
      })
      // Animación de entrada de la nueva letra
      .fromTo(letterRef, 
        { scale: 0.8, opacity: 0, y: 10 },
        { 
          scale: 1, 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          ease: 'back.out(1.7)' 
        }
      );
    } else if (letterRef && previousLetter === '') {
      // Primera carga - animación de entrada inicial
      gsap.fromTo(letterRef, 
        { scale: 0.8, opacity: 0, y: 10 },
        { 
          scale: 1, 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          ease: 'back.out(1.7)' 
        }
      );
    }
    
    previousLetter = letter;
  });
</script>

<div class="letter-separator" data-letter={letter}>
  <span class="letter-badge" bind:this={letterRef}>{letter}</span>
</div>

<style>
  .letter-separator {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 4px 0;
  }

  .letter-badge {
    font-size: 1.5rem;
    font-weight: 700;
    color: rgba(56, 189, 248, 1);
    width: 48px;
    height: min-content;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    will-change: transform, opacity;
    transform-origin: center center;
  }

 

  @media (max-width: 900px) {
    .letter-badge {
      width: 40px;
      height: 40px;
      font-size: 1.25rem;
    }
  }

  @media (max-width: 640px) {
    .letter-badge {
      width: 36px;
      height: 36px;
      font-size: 1.1rem;
    }
  }
</style>
