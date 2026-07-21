import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          clinic: '#D3F36B',
          mint: '#F4FBE3',
          blue: '#0E1F1A',
          'blue-soft': '#E8F0EA',
          credit: '#F0C419',
          'credit-soft': '#FFF8E0',
          'blue-light': '#E8F0EA',
          'green-light': '#F4FBE3',
          teal: '#D3F36B',
          lime: '#D3F36B',
          gold: '#F0C419',
          forest: '#0E1F1A',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-rise': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ken-pan': {
          '0%': { transform: 'scale(1.08) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.14) translate3d(-1.5%, 1%, 0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'soft-rise': 'soft-rise 0.55s cubic-bezier(0.22,1,0.36,1) forwards',
        'ken-pan': 'ken-pan 18s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
