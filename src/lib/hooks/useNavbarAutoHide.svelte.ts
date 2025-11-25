import { uiStore } from '@/lib/stores/ui.store.svelte';

/**
 * Hook para manejar el auto-hide del navbar usando IntersectionObserver.
 * Crea un elemento "sentinel" invisible en el top de la página para detectar el scroll.
 * 
 * @param element - Referencia al navbar (no usado directamente para detección, pero útil para cleanup si se desmonta)
 * @param threshold - Margen superior en pixeles antes de activar el modo mini (default 100px)
 */
export function useNavbarAutoHide(element: HTMLElement | undefined, threshold = 100) {
    $effect(() => {
        if (typeof document === 'undefined') return;

        // 1. Crear o reutilizar el sentinel
        let sentinel = document.getElementById('navbar-sentinel');
        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.id = 'navbar-sentinel';
            sentinel.style.position = 'absolute';
            sentinel.style.top = '0';
            sentinel.style.left = '0';
            sentinel.style.width = '100%';
            sentinel.style.height = '1px';
            sentinel.style.pointerEvents = 'none';
            sentinel.style.zIndex = '-1';
            document.body.prepend(sentinel);
        }

        // 2. Configurar IntersectionObserver
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Si el sentinel es visible, estamos en el top -> Mostrar Full
                // Si NO es visible, hemos scrolleado -> Mostrar Mini
                const isTop = entry.isIntersecting;

                // Actualizar store solo si cambia
                if (uiStore.navbarHidden === isTop) {
                    uiStore.setNavbarHidden(!isTop);
                }
            },
            {
                root: null, // Viewport
                rootMargin: `${threshold}px 0px 0px 0px`, // Offset para activar
                threshold: 0 // Activar apenas salga del margen
            }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
            // Opcional: remover sentinel si queremos limpieza total, 
            // pero dejarlo es seguro y performante.
        };
    });
}
