/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#070235",
        "primary-container": "#1e1b4b",
        "on-primary": "#ffffff",
        "on-primary-container": "#8683ba",
        "secondary": "#4648d4",
        "secondary-container": "#6063ee",
        "on-secondary": "#ffffff",
        "tertiary": "#009d6c",
        "tertiary-container": "#002819",
        "on-tertiary": "#ffffff",
        "background": "#f8f9ff",
        "surface": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#47464f",
        "outline-variant": "#c8c5d0",
        "error": "#ba1a1a",
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
