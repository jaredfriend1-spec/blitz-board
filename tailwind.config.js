/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────
// BLITZ BOARD — THEME
//
// The app is dark-first and uses Tailwind colour classes directly in
// every page. Rather than edit thousands of classes, the palettes are
// redefined here so each existing class resolves to a calmer colour.
//
// The idea: a clubhouse at dusk. A deep green-charcoal instead of pure
// black, chalk instead of pure white, and accents taken down from neon
// to the colours of the course — fairway green, brass, slate, clay.
//
//  • `black` is the page background and `white` is the main text colour
//    throughout the app, so those two are what set the overall mood.
//  • `zinc` is every surface, border and grey text. 950 = darkest.
//  • `emerald` is the accent used on nearly every button and highlight.
// ─────────────────────────────────────────────────────────────────────

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        black: '#111715',   // page
        white: '#ECEFEA',   // chalk — main text

        // Surfaces, borders and grey text, tinted toward the page green
        zinc: {
          50:  '#F3F5F2',
          100: '#E3E7E3',
          200: '#CDD4CE',
          300: '#B4BEB7',
          400: '#98A49C',   // secondary text
          500: '#7B8880',   // muted text
          600: '#5E6B64',   // hints
          700: '#3B4741',   // strong borders
          800: '#2A3530',   // borders
          900: '#1C2521',   // raised panels
          950: '#161D1A',   // cards
        },

        // Fairway — the main accent
        emerald: {
          300: '#A5D4B8',
          400: '#84C2A0',
          500: '#62AB85',
          600: '#478C69',
          700: '#356B50',
          900: '#1F3A2D',
          950: '#182B22',
        },
        green: {
          400: '#84C2A0',
          500: '#62AB85',
          600: '#478C69',
        },

        // Slate blue — teams and secondary actions
        blue: {
          300: '#A9C3DC',
          400: '#8CAFD0',
          500: '#6A93BA',
          600: '#51799F',
          700: '#3D5E7E',
          900: '#22344A',
        },

        // Brass — money, warnings, eagles
        amber: {
          300: '#E2C98C',
          400: '#D4B56C',
          500: '#BC9A4C',
          600: '#9A7C3A',
          700: '#775F2C',
          800: '#4A3C1E',
          900: '#352B17',
        },
        yellow: {
          300: '#E2C98C',
          400: '#D4B56C',
          500: '#BC9A4C',
        },

        // Clay — destructive actions, birdies
        rose: {
          300: '#E5A99C',
          400: '#D98D7E',
          500: '#C56F5F',
          600: '#A85646',
          700: '#864436',
          900: '#3F231D',
        },
        red: {
          400: '#D98D7E',
          500: '#C56F5F',
          600: '#A85646',
        },

        purple: {
          300: '#C0B4DA',
          400: '#A99BCB',
          500: '#8C7DB3',
          600: '#716294',
        },
      },
    },
  },
  plugins: [],
}
