/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────
// JF TOURNAMENT MANAGER — THEME
//
// The app was written dark-first with ~3,800 Tailwind colour classes
// spread across 28 files. Rather than edit those, the palettes are
// redefined here, so every existing class resolves to the new theme.
//
// Two things to know before changing anything:
//
//  1. THE ZINC SCALE IS INVERTED. In the components, zinc-900 means
//     "darkest surface" and zinc-400 means "light text". Here, low
//     numbers are light and high numbers are dark — so zinc-900 renders
//     near-white and zinc-400 renders as dark body text. Keep that
//     inversion if you touch it, or the whole app loses contrast.
//
//  2. WHITE AND BLACK ARE SWAPPED. `text-white` is the app's primary
//     text colour (242 uses) so it maps to navy ink. `bg-black` is the
//     page background (155 uses) so it maps to near-white. `text-black`
//     sits on filled buttons and also needs to be light.
// ─────────────────────────────────────────────────────────────────────

const ink = '#0F2340'   // navy, primary text
const page = '#EEF2F7'  // page background
const card = '#FFFFFF'

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary text and page background, inverted from the dark original
        white: ink,
        black: page,

        // Surfaces and secondary text. Inverted: 950 = lightest.
        zinc: {
          50:  '#0B1A30',
          100: '#12294D',
          200: '#1E3A5F',
          300: '#2C4A73',
          400: '#3E5B84',   // secondary text
          500: '#6B7A91',   // muted text
          600: '#8A97AA',   // hint text
          700: '#D8DEE7',   // borders
          800: '#E4EAF1',   // card borders / raised fills
          900: '#F4F6F9',   // panel background
          950: '#FAFBFD',   // lightest surface
        },

        // The accent the app already uses everywhere — now navy.
        emerald: {
          300: '#3E6FA8',
          400: '#1E4D8B',
          500: '#12294D',
          600: '#0C1C35',
          700: '#081326',
        },

        // Crest red, kept for destructive actions and highlights.
        rose: {
          300: '#E8697C',
          400: '#D93A52',
          500: '#C8102E',
          600: '#A50D26',
          700: '#7E0A1D',
          900: '#F7DDE2',
        },

        // Money and warnings.
        amber: {
          300: '#C98A1E',
          400: '#B8790F',
          500: '#9A6208',
          600: '#7C4E06',
          700: '#5E3B04',
          800: '#FBF0DC',
          900: '#FDF7EC',
        },

        // Kept distinct from the navy accent.
        blue: {
          300: '#5B9BD5',
          400: '#3E7FC1',
          500: '#2E6BA8',
          600: '#235488',
          700: '#1A4068',
          900: '#DDE9F6',
        },

        purple: {
          300: '#8E7BC4',
          400: '#7059B0',
          500: '#5B4595',
          600: '#463473',
          700: '#332553',
        },

        teal: {
          300: '#3E8F86',
          400: '#2C7269',
          500: '#1F5A52',
          600: '#164039',
        },

        yellow: {
          300: '#C98A1E',
          400: '#B8790F',
          500: '#9A6208',
        },
      },
    },
  },
  plugins: [],
}