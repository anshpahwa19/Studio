import type { Config } from 'tailwindcss';

// Design language: violet brand colour on warm stone neutrals, Plus Jakarta Sans,
// rounded cards with soft shadows, icon tiles and small uppercase pills.
const sans = ['"Plus Jakarta Sans"', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'];

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1c1917', soft: '#57534e', mute: '#78716c' },
        line: '#e7e5e4',
        canvas: '#fafaf9',
        // Brand violet (kept under the old name so every screen picks it up).
        plum: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
        brass: { 100: '#ede9fe', 500: '#7c3aed' },
      },
      fontFamily: { sans, display: sans },
      boxShadow: { card: '0 1px 2px rgb(28 25 23 / 0.04), 0 1px 3px rgb(28 25 23 / 0.04)' },
    },
  },
  plugins: [],
} satisfies Config;
