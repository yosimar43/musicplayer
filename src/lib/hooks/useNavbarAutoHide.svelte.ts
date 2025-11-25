import { uiStore } from '@/lib/stores/ui.store.svelte';

/**
 * Hook para detectar proximidad del mouse al navbar.
 * Detecta si el mouse está en la zona superior (0-25% de la altura de la pantalla).
 * 
 * @param element - Elemento del navbar (no usado, pero mantenido para compatibilidad)
 * @param activationDistance - No usado, pero mantenido para compatibilidad
 * @returns Estado reactivo con isMouseNear
 */
export function useNavbarAutoHide(navElement: HTMLElement | undefined, activationDistance = 150) {
    let isHidden = $state(true); // Start as hidden

    $effect(() => {
        if (typeof window === 'undefined' || !navElement) return;

        const handleMouseMove = (event: MouseEvent) => {
            const navRect = navElement.getBoundingClientRect();
            const mouseY = event.clientY;

            // Si el mouse está dentro del navbar o cerca (150px)
            const isNear = mouseY <= navRect.bottom + activationDistance;

            if (isHidden !== !isNear) {
                isHidden = !isNear;
                console.log('🎯 Navbar hidden:', isHidden, 'Mouse Y:', mouseY, 'Nav Bottom:', navRect.bottom);
            }
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    });

    return {
        get isHidden() {
            return isHidden;
        }
    };
}
