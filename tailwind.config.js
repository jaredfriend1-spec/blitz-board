/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // This line restores the "Look"
  ],
  theme: {
    extend: {
      colors: {
        emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
      },
    },
  },
  plugins: [],
}