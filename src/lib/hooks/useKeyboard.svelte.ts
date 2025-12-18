/**
 * ⌨️ HOOK DE TECLADO GLOBAL: Maneja todos los eventos de teclado de forma centralizada
 * Permite registro de handlers para teclas específicas desde cualquier hook/componente
 * Singleton para evitar listeners duplicados
 */

import { untrack } from 'svelte';

type KeyboardHandler = (e: KeyboardEvent) => void;

class KeyboardManager {
  private handlers = new Map<string, Set<KeyboardHandler>>();
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) return;

    window.addEventListener('keydown', this.handleKeydown);
    this.isInitialized = true;
    // Keyboard manager initialized
  }

  cleanup() {
    if (!this.isInitialized) return;

    window.removeEventListener('keydown', this.handleKeydown);
    this.handlers.clear();
    this.isInitialized = false;
    // Keyboard manager cleaned up
  }

  addHandler(key: string, handler: KeyboardHandler) {
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(handler);
  }

  removeHandler(key: string, handler: KeyboardHandler) {
    const keyHandlers = this.handlers.get(key);
    if (keyHandlers) {
      keyHandlers.delete(handler);
      if (keyHandlers.size === 0) {
        this.handlers.delete(key);
      }
    }
  }

  private handleKeydown = (e: KeyboardEvent) => {
    const keyHandlers = this.handlers.get(e.key);
    if (keyHandlers) {
      // Si estamos en un input o textarea, no procesar atajos de 'n' y 'p' para permitir escribir
      const activeElement = document.activeElement;
      if ((e.key === 'n' || e.key === 'p') && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
        return; // No procesar el atajo
      }
      
      // Evitar que se procesen múltiples veces si hay handlers
      for (const handler of keyHandlers) {
        untrack(() => handler(e));
      }
    }
  };
}

const keyboardManager = new KeyboardManager();

let _instance: KeyboardHookReturn | null = null;

export interface KeyboardHookReturn {
  initialize: () => void;
  cleanup: () => void;
  addHandler: (key: string, handler: KeyboardHandler) => void;
  removeHandler: (key: string, handler: KeyboardHandler) => void;
}

/**
 * ⌨️ Hook para manejar eventos de teclado globales
 * Centraliza todos los eventos de teclado para reutilización
 */
export function useKeyboard(): KeyboardHookReturn {
  if (_instance) return _instance;

  _instance = {
    initialize: () => keyboardManager.initialize(),
    cleanup: () => keyboardManager.cleanup(),
    addHandler: (key: string, handler: KeyboardHandler) => keyboardManager.addHandler(key, handler),
    removeHandler: (key: string, handler: KeyboardHandler) => keyboardManager.removeHandler(key, handler),
  };

  return _instance;
}