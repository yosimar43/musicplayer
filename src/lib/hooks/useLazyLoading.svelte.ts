import type { MusicFile } from '$lib/types';

export interface LazyLoadingConfig {
  itemsPerPage?: number;
  scrollThreshold?: number;
}

/**
 * Hook para manejar lazy loading y navegación alfabética de tracks
 */
export function useLazyLoading(
  getTracks: () => MusicFile[],
  config: LazyLoadingConfig = {}
) {
  const { itemsPerPage = 30, scrollThreshold = 300 } = config;

  // Estado
  let displayCount = $state(itemsPerPage);
  let isLoadingMore = $state(false);
  let currentLetter = $state("");
  let scrollContainer = $state<HTMLElement | null>(null);

  // Tracks ordenados alfabéticamente por título
  const sortedTracks = $derived(
    [...getTracks()].sort((a, b) => {
      const titleA = (a.title || "").toLowerCase();
      const titleB = (b.title || "").toLowerCase();
      return titleA.localeCompare(titleB);
    })
  );

  // Tracks visibles (lazy loaded)
  const visibleTracks = $derived(sortedTracks.slice(0, displayCount));
  const hasMoreTracks = $derived(displayCount < sortedTracks.length);

  // Agrupar tracks por letra inicial
  const tracksByLetter = $derived.by(() => {
    const groups: Record<string, MusicFile[]> = {};
    for (const track of sortedTracks) {
      const firstChar = (track.title || "#")[0].toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(track);
    }
    return groups;
  });

  // Letras disponibles en orden
  const availableLetters = $derived(
    Object.keys(tracksByLetter).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    })
  );

  // Cargar más tracks
  const loadMore = () => {
    if (isLoadingMore || !hasMoreTracks) return;
    isLoadingMore = true;
    
    setTimeout(() => {
      displayCount = Math.min(displayCount + itemsPerPage, sortedTracks.length);
      isLoadingMore = false;
    }, 100);
  };

  // Detectar letra actual basándose en scroll
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

  // Scroll a una letra específica
  const scrollToLetter = (letter: string) => {
    if (!scrollContainer) return;
    
    const target = scrollContainer.querySelector(`[data-letter="${letter}"]`);
    if (target) {
      const letterIndex = sortedTracks.findIndex(t => {
        const firstChar = (t.title || "#")[0].toUpperCase();
        const trackLetter = /[A-Z]/.test(firstChar) ? firstChar : "#";
        return trackLetter === letter;
      });
      
      if (letterIndex >= displayCount) {
        displayCount = Math.min(letterIndex + itemsPerPage, sortedTracks.length);
        requestAnimationFrame(() => {
          const newTarget = scrollContainer?.querySelector(`[data-letter="${letter}"]`);
          newTarget?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    currentLetter = letter;
  };

  // Handler de scroll
  const handleScroll = () => {
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom < scrollThreshold && hasMoreTracks && !isLoadingMore) {
      loadMore();
    }
    
    updateCurrentLetter();
  };

  // Obtener la letra de un track (devuelve null si no es el primero de su grupo)
  const getTrackLetter = (track: MusicFile, index: number): string | null => {
    const firstChar = (track.title || "#")[0].toUpperCase();
    const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
    
    if (index === 0) return letter;
    
    const prevTrack = visibleTracks[index - 1];
    const prevFirstChar = (prevTrack?.title || "#")[0].toUpperCase();
    const prevLetter = /[A-Z]/.test(prevFirstChar) ? prevFirstChar : "#";
    
    return letter !== prevLetter ? letter : null;
  };

  // Inicializar
  const initialize = () => {
    if (availableLetters.length > 0 && !currentLetter) {
      currentLetter = availableLetters[0];
    }
  };

  // Resetear estado
  const reset = () => {
    displayCount = itemsPerPage;
    currentLetter = availableLetters[0] || "";
  };

  // Bind del container
  const bindContainer = (element: HTMLElement) => {
    scrollContainer = element;
  };

  return {
    // Estado
    get sortedTracks() { return sortedTracks; },
    get visibleTracks() { return visibleTracks; },
    get hasMoreTracks() { return hasMoreTracks; },
    get isLoadingMore() { return isLoadingMore; },
    get currentLetter() { return currentLetter; },
    get availableLetters() { return availableLetters; },
    get tracksByLetter() { return tracksByLetter; },
    
    // Acciones
    loadMore,
    scrollToLetter,
    handleScroll,
    getTrackLetter,
    initialize,
    reset,
    bindContainer
  };
}
