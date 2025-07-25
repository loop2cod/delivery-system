/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // UAE Brand Colors
        'uae': {
          'navy': '#142C4F',
          'red': '#C32C3C', 
          'light': '#EFEFEF'
        },
        // PWA Theme Colors
        'primary': {
          DEFAULT: '#142C4F',
          '50': '#f0f4f8',
          '100': '#d9e2ec',
          '200': '#bcccdc',
          '300': '#9fb3c8',
          '400': '#829ab1',
          '500': '#627d98',
          '600': '#486581',
          '700': '#334e68',
          '800': '#243b53',
          '900': '#142c4f',
        },
        'accent': {
          DEFAULT: '#C32C3C',
          '50': '#fef2f2',
          '100': '#fee2e2',
          '200': '#fecaca',
          '300': '#fca5a5',
          '400': '#f87171',
          '500': '#ef4444',
          '600': '#dc2626',
          '700': '#c32c3c',
          '800': '#991b1b',
          '900': '#7f1d1d',
        },
        'background': '#ffffff',
        'foreground': '#142C4F',
        'muted': '#EFEFEF',
        'muted-foreground': '#6b7280',
        'border': '#e5e7eb',
        'input': '#f9fafb',
        'ring': '#142C4F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'uae': '0 10px 25px -5px rgb(20 44 79 / 0.15)',
        'accent': '0 4px 12px -2px rgb(195 44 60 / 0.25)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #142C4F 0%, #1e3a8a 100%)',
        'gradient-accent': 'linear-gradient(135deg, #C32C3C 0%, #dc2626 100%)',
        'gradient-success': 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        'hero-pattern': "url('/images/hero-pattern.svg')",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
    // Custom plugin for PWA-specific utilities
    function({ addUtilities }) {
      const newUtilities = {
        '.hover-lift': {
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-8px)',
          },
        },
        '.gradient-text': {
          'background-image': 'linear-gradient(135deg, #142C4F 0%, #C32C3C 100%)',
          'background-clip': 'text',
          '-webkit-background-clip': 'text',
          'color': 'transparent',
        },
        '.glass-effect': {
          'backdrop-filter': 'blur(10px)',
          'background-color': 'rgba(255, 255, 255, 0.8)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.pwa-safe-area': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}