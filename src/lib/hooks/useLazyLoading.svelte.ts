import type { MusicFile } from '$lib/types';

export interface LazyLoadingConfig {
  itemsPerPage?: number;
  scrollThreshold?: number;
  infiniteLoop?: boolean; // Nuevo: scroll infinito circular
}

/**
 * Hook para manejar lazy loading y navegación alfabética de tracks
 * OPTIMIZADO: Cachea ordenamiento y agrupación para evitar recálculos
 * NUEVO: Soporte para scroll infinito circular
 */
export function useLazyLoading(
  getTracks: () => MusicFile[],
  config: LazyLoadingConfig = {}
) {
  const { itemsPerPage = 30, scrollThreshold = 300, infiniteLoop = true } = config;

  // Estado
  let displayCount = $state(itemsPerPage);
  let isLoadingMore = $state(false);
  let currentLetter = $state("");
  let scrollContainer = $state<HTMLElement | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE: Solo recalcular cuando cambia la lista de tracks
  // ═══════════════════════════════════════════════════════════════════════════
  let cachedTracksLength = $state(0);
  let cachedSortedTracks = $state<MusicFile[]>([]);
  let cachedTracksByLetter = $state<Record<string, MusicFile[]>>({});
  let cachedAvailableLetters = $state<string[]>([]);

  // Efecto para recalcular cache solo cuando cambian los tracks
  $effect(() => {
    const tracks = getTracks();
    
    if (tracks.length === cachedTracksLength) return;
    
    cachedTracksLength = tracks.length;
    
    // Ordenar tracks: A-Z primero, luego # (números/símbolos) al final
    cachedSortedTracks = [...tracks].sort((a, b) => {
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      
      const firstCharA = titleA[0] || "";
      const firstCharB = titleB[0] || "";
      
      const isLetterA = /[a-z]/i.test(firstCharA);
      const isLetterB = /[a-z]/i.test(firstCharB);
      
      // Si uno es letra y otro no, la letra va primero
      if (isLetterA && !isLetterB) return -1;
      if (!isLetterA && isLetterB) return 1;
      
      // Ambos son letras o ambos son símbolos/números: ordenar normalmente
      return titleA.localeCompare(titleB);
    });

    const groups: Record<string, MusicFile[]> = {};
    for (const track of cachedSortedTracks) {
      const firstChar = (track.title || "#")[0].toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(track);
    }
    cachedTracksByLetter = groups;

    cachedAvailableLetters = Object.keys(groups).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });

    if (!currentLetter && cachedAvailableLetters.length > 0) {
      currentLetter = cachedAvailableLetters[0];
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL INFINITO CIRCULAR
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Para scroll infinito, mostramos todos los tracks siempre
  // pero creamos la ilusión de infinito reposicionando el scroll
  const visibleTracks = $derived(
    infiniteLoop ? cachedSortedTracks : cachedSortedTracks.slice(0, displayCount)
  );
  
  const hasMoreTracks = $derived(
    infiniteLoop ? false : displayCount < cachedSortedTracks.length
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  const loadMore = () => {
    if (infiniteLoop || isLoadingMore || !hasMoreTracks) return;
    isLoadingMore = true;
    
    requestAnimationFrame(() => {
      displayCount = Math.min(displayCount + itemsPerPage, cachedSortedTracks.length);
      isLoadingMore = false;
    });
  };

  const updateCurrentLetter = () => {
    if (!scrollContainer) return;
    
    const cards = scrollContainer.querySelectorAll('[data-letter]');
    const containerTop = scrollContainer.scrollTop + 100;
    
    let foundLetter = "";
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const cardTop = rect.top - scrollContainer.getBoundingClientRect().top + scrollContainer.scrollTop;
      
      if (cardTop <= containerTop) {
        foundLetter = (card as HTMLElement).dataset.letter || "";
      } else {
        break;
      }
    }
    
    if (foundLetter && foundLetter !== currentLetter) {
      currentLetter = foundLetter;
    }
  };

  const scrollToLetter = (letter: string) => {
    if (!scrollContainer) return;
    
    const target = scrollContainer.querySelector(`[data-letter="${letter}"]`);
    if (target) {
      if (!infiniteLoop) {
        const letterIndex = cachedSortedTracks.findIndex(t => {
          const firstChar = (t.title || "#")[0].toUpperCase();
          const trackLetter = /[A-Z]/.test(firstChar) ? firstChar : "#";
          return trackLetter === letter;
        });
        
        if (letterIndex >= displayCount) {
          displayCount = Math.min(letterIndex + itemsPerPage, cachedSortedTracks.length);
          requestAnimationFrame(() => {
            const newTarget = scrollContainer?.querySelector(`[data-letter="${letter}"]`);
            newTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
          return;
        }
      }
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    currentLetter = letter;
  };

  // Handler de scroll con detección de bordes para loop infinito
  let scrollTicking = false;
  
  const handleScroll = () => {
    if (!scrollContainer) return;
    
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer!;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        // Scroll infinito circular (solo al llegar al final)
        if (infiniteLoop && cachedSortedTracks.length > 0) {
          // Llegamos al final -> saltar al inicio
          if (distanceFromBottom < 5) {
            scrollContainer!.scrollTo({
              top: 1, // No 0 para evitar loop infinito
              behavior: 'auto'
            });
            currentLetter = cachedAvailableLetters[0] || "";
          }
        } else {
          // Lazy loading tradicional
          if (distanceFromBottom < scrollThreshold && hasMoreTracks && !isLoadingMore) {
            loadMore();
          }
        }
        
        updateCurrentLetter();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };

  const getTrackLetter = (track: MusicFile, index: number): string | null => {
    const firstChar = (track.title || "#")[0].toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
    
    if (index === 0) return letter;
    
    const prevTrack = visibleTracks[index - 1];
    const prevFirstChar = (prevTrack?.title || "#")[0].toUpperCase();
    const prevLetter = /[A-Z]/.test(prevFirstChar) ? prevFirstChar : "#";
    
    return letter !== prevLetter ? letter : null;
  };

  const initialize = () => {
    if (cachedAvailableLetters.length > 0 && !currentLetter) {
      currentLetter = cachedAvailableLetters[0];
    }
  };

  const reset = () => {
    displayCount = itemsPerPage;
    currentLetter = cachedAvailableLetters[0] || "";
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Ir al inicio
  const scrollToTop = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      currentLetter = cachedAvailableLetters[0] || "";
    }
  };

  // Ir al final
  const scrollToBottom = () => {
    if (scrollContainer) {
      scrollContainer.scrollTo({ 
        top: scrollContainer.scrollHeight, 
        behavior: 'smooth' 
      });
      currentLetter = cachedAvailableLetters[cachedAvailableLetters.length - 1] || "";
    }
  };

  const bindContainer = (element: HTMLElement) => {
    scrollContainer = element;
  };

  return {
    // Estado
    get sortedTracks() { return cachedSortedTracks; },
    get visibleTracks() { return visibleTracks; },
    get hasMoreTracks() { return hasMoreTracks; },
    get isLoadingMore() { return isLoadingMore; },
    get currentLetter() { return currentLetter; },
    get availableLetters() { return cachedAvailableLetters; },
    get tracksByLetter() { return cachedTracksByLetter; },
    get isInfiniteLoop() { return infiniteLoop; },
    
    // Acciones
    loadMore,
    scrollToLetter,
    handleScroll,
    getTrackLetter,
    initialize,
    reset,
    scrollToTop,
    scrollToBottom,
    bindContainer
  };
}
