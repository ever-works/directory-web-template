import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    extend: {
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        'bg-cycle': 'bg-cycle 8s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'bounce-x': 'bounce-x 1s infinite'
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'bg-cycle': {
          '0%': { backgroundColor: 'rgba(98,9,187,0.9)' },
          '33%': { backgroundColor: 'var(--theme-primary)' },
          '66%': { backgroundColor: 'var(--theme-accent)' },
          '100%': { backgroundColor: 'rgba(98,9,187,0.9)' }
        },
        'bounce-x': {
          '0%, 100%': {
            transform: 'translateX(-25%)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
          },
          '50%': {
            transform: 'translateX(0)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
          }
        }
      },
      backdropBlur: {
        xs: '2px'
      },
      zIndex: {
        nav: '20' // semantic token for navigation
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'dark--theme': {
          DEFAULT: 'var(--dark-theme)',
          50: 'var(--dark-theme-50)',
          100: 'var(--dark-theme-100)',
          200: 'var(--dark-theme-200)',
          300: 'var(--dark-theme-300)',
          400: 'var(--dark-theme-400)',
          500: 'var(--dark-theme-500)',
          600: 'var(--dark-theme-600)',
          700: 'var(--dark-theme-700)',
          800: 'var(--dark-theme-800)',
          900: 'var(--dark-theme-900)',
          950: 'var(--dark-theme-950)'
        },
        'light--theme': {
          light: 'var(--light-theme-light)',
          DEFAULT: 'var(--light-theme)',
          dark: 'var(--light-theme-dark)'
        },
        'theme-primary': {
          DEFAULT: 'var(--theme-primary)',
          50: 'var(--theme-primary-50)',
          100: 'var(--theme-primary-100)',
          200: 'var(--theme-primary-200)',
          300: 'var(--theme-primary-300)',
          400: 'var(--theme-primary-400)',
          500: 'var(--theme-primary-500)',
          600: 'var(--theme-primary-600)',
          700: 'var(--theme-primary-700)',
          800: 'var(--theme-primary-800)',
          900: 'var(--theme-primary-900)',
          950: 'var(--theme-primary-950)'
        },
        'theme-secondary': {
          DEFAULT: 'var(--theme-secondary)',
          50: 'var(--theme-secondary-50)',
          100: 'var(--theme-secondary-100)',
          200: 'var(--theme-secondary-200)',
          300: 'var(--theme-secondary-300)',
          400: 'var(--theme-secondary-400)',
          500: 'var(--theme-secondary-500)',
          600: 'var(--theme-secondary-600)',
          700: 'var(--theme-secondary-700)',
          800: 'var(--theme-secondary-800)',
          900: 'var(--theme-secondary-900)',
          950: 'var(--theme-secondary-950)'
        },
        'theme-accent': {
          DEFAULT: 'var(--theme-accent)',
          50: 'var(--theme-accent-50)',
          100: 'var(--theme-accent-100)',
          200: 'var(--theme-accent-200)',
          300: 'var(--theme-accent-300)',
          400: 'var(--theme-accent-400)',
          500: 'var(--theme-accent-500)',
          600: 'var(--theme-accent-600)',
          700: 'var(--theme-accent-700)',
          800: 'var(--theme-accent-800)',
          900: 'var(--theme-accent-900)',
          950: 'var(--theme-accent-950)'
        }
      }
    }
  },
  darkMode: 'class',
  plugins: [require('@tailwindcss/typography'), heroui()]
} satisfies Config;
