/**
 * UAE Delivery Management System - Unified Brand Theme System
 * Provides consistent theming across all PWA applications
 */

// UAE Brand Colors
export const UAE_COLORS = {
  // Primary Brand Colors
  navy: '#142C4F',      // Authority, Trust, Navigation
  red: '#C32C3C',       // Action, Urgency, CTAs
  light: '#EFEFEF',     // Clean, Modern, Backgrounds
  
  // Extended Palette
  white: '#ffffff',
  dark: '#0f172a',
  
  // Semantic Colors
  success: '#16a34a',
  warning: '#f59e0b',
  error: '#dc2626',
  info: '#3b82f6',
  
  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// CSS Custom Properties for all PWAs
export const CSS_VARIABLES = {
  // Primary Brand Colors
  '--uae-navy': UAE_COLORS.navy,
  '--uae-red': UAE_COLORS.red,
  '--uae-light': UAE_COLORS.light,
  
  // PWA-Specific Color Mappings
  '--primary': 'var(--uae-navy)',
  '--primary-foreground': '#ffffff',
  '--secondary': 'var(--uae-light)',
  '--secondary-foreground': 'var(--uae-navy)',
  '--accent': 'var(--uae-red)',
  '--accent-foreground': '#ffffff',
  
  // Semantic Colors
  '--success': UAE_COLORS.success,
  '--success-foreground': '#ffffff',
  '--warning': UAE_COLORS.warning,
  '--warning-foreground': '#ffffff',
  '--destructive': 'var(--uae-red)',
  '--destructive-foreground': '#ffffff',
  
  // PWA UI Colors
  '--background': '#ffffff',
  '--foreground': 'var(--uae-navy)',
  '--card': '#ffffff',
  '--card-foreground': 'var(--uae-navy)',
  '--popover': '#ffffff',
  '--popover-foreground': 'var(--uae-navy)',
  '--muted': 'var(--uae-light)',
  '--muted-foreground': '#6b7280',
  '--border': '#e5e7eb',
  '--input': '#f9fafb',
  '--ring': 'var(--uae-navy)',
  '--radius': '0.75rem',
  
  // PWA Specific Gradients
  '--gradient-primary': 'linear-gradient(135deg, var(--uae-navy) 0%, #1e3a8a 100%)',
  '--gradient-accent': 'linear-gradient(135deg, var(--uae-red) 0%, #dc2626 100%)',
  '--gradient-success': 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
} as const;

// Dark Mode Theme
export const DARK_MODE_VARIABLES = {
  '--background': '#0f172a',
  '--foreground': 'var(--uae-light)',
  '--card': '#1e293b',
  '--card-foreground': 'var(--uae-light)',
  '--popover': '#1e293b',
  '--popover-foreground': 'var(--uae-light)',
  '--primary': 'var(--uae-navy)',
  '--primary-foreground': '#ffffff',
  '--secondary': '#334155',
  '--secondary-foreground': 'var(--uae-light)',
  '--muted': '#334155',
  '--muted-foreground': '#94a3b8',
  '--accent': 'var(--uae-red)',
  '--accent-foreground': '#ffffff',
  '--destructive': '#dc2626',
  '--destructive-foreground': 'var(--uae-light)',
  '--border': '#334155',
  '--input': '#334155',
  '--ring': 'var(--uae-red)',
} as const;

// PWA-Specific Theme Variants
export const PWA_THEMES = {
  // Public PWA Theme - Trust & Professionalism
  public: {
    '--app-primary': 'var(--uae-navy)',
    '--app-accent': 'var(--uae-red)',
    '--app-background': '#ffffff',
    '--hero-gradient': 'var(--gradient-primary)',
    '--cta-gradient': 'var(--gradient-accent)',
    '--section-bg': 'var(--uae-light)',
    '--card-shadow': '0 10px 25px -5px rgb(20 44 79 / 0.15)',
    '--hover-transform': 'translateY(-8px)',
    '--pwa-theme-color': 'var(--uae-navy)',
    '--pwa-background-color': '#ffffff',
    '--pwa-accent-color': 'var(--uae-red)',
  },
  
  // Admin PWA Theme - Authority & Control
  admin: {
    '--app-primary': 'var(--uae-navy)',
    '--app-accent': 'var(--uae-red)',
    '--app-background': '#f8fafc',
    '--sidebar-bg': 'var(--gradient-primary)',
    '--sidebar-text': '#ffffff',
    '--header-bg': '#ffffff',
    '--card-shadow': '0 4px 12px -2px rgb(20 44 79 / 0.12)',
    '--status-border-width': '4px',
    '--pwa-theme-color': 'var(--uae-navy)',
    '--pwa-background-color': '#f8fafc',
    '--pwa-accent-color': 'var(--uae-red)',
  },
  
  // Business PWA Theme - Professional & Efficient
  business: {
    '--app-primary': 'var(--uae-navy)',
    '--app-accent': '#3b82f6',
    '--app-background': '#ffffff',
    '--sidebar-bg': 'var(--uae-light)',
    '--sidebar-text': 'var(--uae-navy)',
    '--header-bg': 'var(--gradient-primary)',
    '--card-shadow': '0 2px 8px -1px rgb(20 44 79 / 0.08)',
    '--progress-gradient': 'linear-gradient(90deg, var(--uae-navy) 0%, #3b82f6 100%)',
    '--pwa-theme-color': 'var(--uae-navy)',
    '--pwa-background-color': '#ffffff',
    '--pwa-accent-color': '#3b82f6',
  },
  
  // Driver PWA Theme - Action & Mobility
  driver: {
    '--app-primary': 'var(--uae-red)',
    '--app-accent': '#f59e0b',
    '--app-background': '#fafafa',
    '--header-bg': 'var(--gradient-accent)',
    '--button-bg': 'var(--gradient-accent)',
    '--card-shadow': '0 3px 10px -2px rgb(195 44 60 / 0.15)',
    '--scan-overlay': 'rgba(20, 44, 79, 0.8)',
    '--pwa-theme-color': 'var(--uae-red)',
    '--pwa-background-color': '#fafafa',
    '--pwa-accent-color': '#f59e0b',
  },
} as const;

// Typography Scale
export const TYPOGRAPHY = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
    '7xl': ['4.5rem', { lineHeight: '1' }],
  },
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

// Spacing Scale
export const SPACING = {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

// Border Radius
export const BORDER_RADIUS = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// Shadows
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
} as const;

// Animation Durations
export const ANIMATION = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  timing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Breakpoints
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Theme utility functions
export const themeUtils = {
  // Generate CSS custom properties string
  generateCSSVariables: (theme: 'light' | 'dark' = 'light') => {
    const variables = theme === 'dark' 
      ? { ...CSS_VARIABLES, ...DARK_MODE_VARIABLES }
      : CSS_VARIABLES;
    
    return Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
  },

  // Generate PWA-specific CSS variables
  generatePWAVariables: (pwa: keyof typeof PWA_THEMES) => {
    const pwaTheme = PWA_THEMES[pwa];
    
    return Object.entries(pwaTheme)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');
  },

  // Get color with opacity
  withOpacity: (color: string, opacity: number) => {
    return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },

  // Convert hex to RGB
  hexToRgb: (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  },
};

export default {
  UAE_COLORS,
  CSS_VARIABLES,
  DARK_MODE_VARIABLES,
  PWA_THEMES,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION,
  BREAKPOINTS,
  themeUtils,
};