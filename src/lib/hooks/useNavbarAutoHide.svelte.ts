import { uiStore } from '@/lib/stores/ui.store.svelte';

/**
 * Hook para manejar el auto-hide del navbar basado en la posición del mouse
 * Mueve la lógica del DOM fuera del store global
 */
export function useNavbarAutoHide(element: HTMLElement, activationDistance = 150) {
    $effect(() => {
        if (!element) return;

        const handleMouseMove = (event: MouseEvent) => {
            const rect = element.getBoundingClientRect();
            const mouseY = event.clientY;

            // Lógica de negocio delegada al store solo para actualizar estado
            // Si el mouse está cerca del navbar (o encima), mostrarlo
            const shouldHide = mouseY > rect.bottom + activationDistance;

            // Solo actualizar si cambia el estado para evitar renders innecesarios
            if (uiStore.navbarHidden !== shouldHide) {
                uiStore.setNavbarHidden(shouldHide);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    });
}
