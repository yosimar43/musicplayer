/**
 * 🎨 Variantes comunes reutilizables con tailwind-variants
 * Extrae clases que se repiten ≥3 veces en el proyecto
 */

import { tv } from 'tailwind-variants';

/**
 * Variante para superficies glassmorphism
 */
export const surfaceVariants = tv({
  base: 'backdrop-blur-xl border border-white/20 transition-all',
  variants: {
    variant: {
      glass: 'bg-white/10 shadow-2xl',
      'glass-strong': 'bg-white/15 shadow-2xl',
      'glass-subtle': 'bg-white/5 shadow-lg'
    },
    rounded: {
      sm: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-3xl',
      full: 'rounded-full'
    }
  },
  defaultVariants: {
    variant: 'glass',
    rounded: 'lg'
  }
});

/**
 * Variante para badges de estadísticas
 */
export const statBadgeVariants = tv({
  base: [
    'inline-flex items-center gap-2',
    'rounded-xl border border-white/20',
    'bg-white/10 px-4 py-2',
    'shadow-lg backdrop-blur-lg',
    'transition-all duration-300',
    'hover:bg-white/15 hover:scale-105',
    'motion-safe:hover:-translate-y-0.5',
    'motion-safe:hover:shadow-cyan-500/40'
  ],
  variants: {
    color: {
      cyan: 'text-cyan-300',
      blue: 'text-blue-100',
      slate: 'text-slate-100'
    }
  },
  defaultVariants: {
    color: 'cyan'
  }
});

/**
 * Variante para botones con gradiente
 */
export const gradientButtonVariants = tv({
  base: [
    'h-auto rounded-2xl border-0',
    'px-8 py-5 text-lg font-bold text-white',
    'shadow-2xl shadow-cyan-500/50',
    'transition-all duration-300',
    'motion-safe:hover:scale-105',
    'motion-safe:active:scale-95',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'bg-gradient-to-r from-cyan-500 to-blue-500',
    'hover:shadow-cyan-500/70'
  ]
});

/**
 * Variante para iconos con glow
 */
export const iconGlowVariants = tv({
  base: [
    'relative',
    'flex items-center justify-center',
    'rounded-3xl shadow-2xl shadow-cyan-500/50',
    'transition-all duration-500',
    'motion-safe:group-hover:rotate-3',
    'motion-safe:group-hover:scale-110'
  ],
  variants: {
    size: {
      sm: 'h-16 w-16',
      md: 'h-24 w-24',
      lg: 'h-32 w-32'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

/**
 * Variante para texto con gradiente
 */
export const textGradientVariants = tv({
  base: [
    'bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300',
    'bg-clip-text text-transparent',
    'drop-shadow-sm'
  ],
  variants: {
    size: {
      sm: 'text-2xl',
      md: 'text-4xl',
      lg: 'text-5xl'
    },
    weight: {
      normal: 'font-semibold',
      bold: 'font-bold'
    }
  },
  defaultVariants: {
    size: 'md',
    weight: 'bold'
  }
});

/**
 * Variante para orbes de fondo animados
 */
export const orbVariants = tv({
  base: [
    'absolute rounded-full blur-[140px]',
    'pointer-events-none',
    'motion-safe:animate-pulse'
  ],
  variants: {
    color: {
      cyan: 'bg-cyan-300/20',
      blue: 'bg-blue-300/20'
    },
    size: {
      sm: 'h-80 w-80',
      md: 'h-96 w-96',
      lg: 'h-[600px] w-[600px]'
    }
  },
  defaultVariants: {
    color: 'cyan',
    size: 'md'
  }
});

/**
 * Variante para estados de carga
 */
export const loadingStateVariants = tv({
  base: [
    'flex flex-col items-center gap-8',
    'py-40 text-center'
  ]
});

/**
 * Variante para estados vacíos
 */
export const emptyStateVariants = tv({
  base: [
    'flex flex-col items-center gap-8',
    'py-40 text-center'
  ]
});

/**
 * Variante para notificaciones
 */
export const notificationVariants = tv({
  base: [
    'rounded-2xl border border-white/20',
    'bg-white/10 px-6 py-4 text-white',
    'shadow-2xl backdrop-blur-xl',
    'flex items-center gap-4'
  ]
});

