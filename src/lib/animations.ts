/**
 * 🎨 Sistema de animaciones modular con Anime.js v4
 * Efectos reutilizables para toda la aplicación
 */

import { animate, stagger } from "animejs";

/**
 * 💫 Fade In con desplazamiento desde abajo
 */
export const fadeIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    translateY: [20, 0],
    easing: "easeOutQuad",
    duration: 800,
    delay: options?.delay || 0,
  });

/**
 * 🔍 Scale In - Aparición con escala suave
 */
export const scaleIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    scale: [0.9, 1],
    easing: "spring",
    delay: options?.delay || 0,
  });

/**
 * 📋 Stagger Items - Animación escalonada de listas
 */
export const staggerItems = (
  selector: string,
  options?: { delay?: number; staggerDelay?: number }
) =>
  animate(selector, {
    opacity: [0, 1],
    translateY: [15, 0],
    delay: stagger(options?.staggerDelay || 80),
    duration: 600,
    easing: "easeOutCubic",
  });

/**
 * ✨ Slide In from Left
 */
export const slideInLeft = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    translateX: [-40, 0],
    easing: "easeOutCubic",
    duration: 700,
    delay: options?.delay || 0,
  });

/**
 * ➡️ Slide In from Right
 */
export const slideInRight = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    translateX: [40, 0],
    easing: "easeOutCubic",
    duration: 700,
    delay: options?.delay || 0,
  });

/**
 * 🎵 Pulse - Efecto de pulso suave
 */
export const pulse = (selector: string, options?: { scale?: number }) =>
  animate(selector, {
    scale: [1, options?.scale || 1.05, 1],
    easing: "easeInOutQuad",
    duration: 1000,
    loop: true,
  });

/**
 * 🌟 Glow - Resplandor animado
 */
export const glow = (selector: string) =>
  animate(selector, {
    opacity: [0.6, 1, 0.6],
    easing: "easeInOutQuad",
    duration: 2000,
    loop: true,
  });

/**
 * 🎨 Rotate In - Rotación con fade
 */
export const rotateIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    rotate: [-10, 0],
    scale: [0.95, 1],
    easing: "spring",
    delay: options?.delay || 0,
  });

/**
 * 🎲 Random Float - Flotación aleatoria (para partículas)
 */
export const randomFloat = (selector: string) => {
  const randomY = Math.random() * 40 - 20; // -20 a 20
  const randomX = Math.random() * 30 - 15; // -15 a 15
  const randomDuration = Math.random() * 2000 + 3000; // 3000 a 5000
  
  return animate(selector, {
    translateY: [0, randomY],
    translateX: [0, randomX],
    easing: "easeInOutQuad",
    duration: randomDuration,
    direction: "alternate",
    loop: true,
  });
};

/**
 * 🌊 Wave - Efecto de onda
 */
export const wave = (selector: string, index: number) =>
  animate(selector, {
    scaleY: [0.5, 1, 0.5],
    easing: "easeInOutQuad",
    duration: 1200,
    delay: index * 100,
    loop: true,
  });

/**
 * 💥 Pop In - Aparición explosiva
 */
export const popIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    scale: [0.3, 1.1, 1],
    easing: "spring",
    duration: 800,
    delay: options?.delay || 0,
  });

/**
 * 🔄 Spin - Rotación continua
 */
export const spin = (selector: string, options?: { duration?: number }) =>
  animate(selector, {
    rotate: [0, 360],
    easing: "linear",
    duration: options?.duration || 2000,
    loop: true,
  });

/**
 * 📊 Progress Bar - Animación de barra de progreso
 */
export const progressBar = (selector: string, progress: number) =>
  animate(selector, {
    width: `${progress}%`,
    easing: "easeOutCubic",
    duration: 400,
  });

/**
 * 🎯 Bounce - Rebote suave
 */
export const bounce = (selector: string) =>
  animate(selector, {
    translateY: [0, -10, 0],
    easing: "easeOutBounce",
    duration: 600,
  });

/**
 * 🌈 Color Shift - Cambio de color animado (para borders/shadows)
 */
export const colorShift = (selector: string) =>
  animate(selector, {
    opacity: [0.7, 1, 0.7],
    easing: "easeInOutQuad",
    duration: 3000,
    loop: true,
  });

/**
 * 📤 Slide Up - Deslizamiento hacia arriba
 */
export const slideUp = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    translateY: [30, 0],
    easing: "easeOutCubic",
    duration: 600,
    delay: options?.delay || 0,
  });

/**
 * 🎪 Zoom In - Zoom dramático
 */
export const zoomIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    scale: [0.5, 1],
    easing: "easeOutBack",
    duration: 700,
    delay: options?.delay || 0,
  });

/**
 * 🎭 Flip In - Volteo animado
 */
export const flipIn = (selector: string, options?: { delay?: number }) =>
  animate(selector, {
    opacity: [0, 1],
    rotateY: [90, 0],
    easing: "easeOutCubic",
    duration: 800,
    delay: options?.delay || 0,
  });
