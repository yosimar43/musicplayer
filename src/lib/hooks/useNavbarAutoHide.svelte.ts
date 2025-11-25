import { uiStore } from '@/lib/stores/ui.store.svelte';

/**
 * Hook para detectar proximidad del mouse al navbar usando mouseenter/mouseleave en un elemento.
 * Detecta cuando el mouse entra o sale de la zona de activación.
 * 
 * @param element - Elemento que actúa como zona de activación
 * @returns Estado reactivo con isMouseNear
 */
export function useNavbarAutoHide(element: HTMLElement | undefined) {
    let isMouseNear = $state(false);

    $effect(() => {
        if (typeof window === 'undefined' || !element) return;

        const handleMouseEnter = () => {
            isMouseNear = true;
        };

        const handleMouseLeave = () => {
            isMouseNear = false;
        };

        element.addEventListener('mouseenter', handleMouseEnter);
        element.addEventListener('mouseleave', handleMouseLeave);

        // Cleanup
        return () => {
            element.removeEventListener('mouseenter', handleMouseEnter);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    });

    return {
        get isMouseNear() {
            return isMouseNear;
        }
    };
}
