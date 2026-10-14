/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

// Design tokens (DESIGN.md): grays, the dark "night" ladder, radii and fonts read CSS
// variables whose defaults (src/styles/tokens.css) are Tailwind's stock values, so the
// general design looks the same; a theme (e.g. Terra) overrides the variables.
const rgbVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const ladder = (prefix, steps) => Object.fromEntries(steps.map((k) => [k, rgbVar(`${prefix}-${k}`)]));

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: '#0095FF',
        'primary-hover': '#0080FF',
        gray: ladder('gray', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        night: ladder('night', [700, 750, 800, 850, 900, 950]),
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
      },
      fontFamily: {
        mono: 'var(--font-mono)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'slide-infinite': {
          '0%': {
            transform: 'translateX(0)'
          },
          '100%': {
            transform: 'translateX(-50%)'
          }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-in-out forwards',
        'slide-infinite': 'slide-infinite 80s linear infinite'
      }
    },
  },
  plugins: [
    typography,
  ],
}