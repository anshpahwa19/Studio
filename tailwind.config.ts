import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1f1b24', soft: '#4a4452', mute: '#7a7383' },
        line: '#e7e3ea',
        canvas: '#f7f5f8',
        plum: { 50: '#f7f0f5', 100: '#eedde9', 200: '#dcbad3', 500: '#8a3f74', 600: '#74335f', 700: '#5e284d' },
        brass: { 100: '#f5ecdc', 500: '#a8813f' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
