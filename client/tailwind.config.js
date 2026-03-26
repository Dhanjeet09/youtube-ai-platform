/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ff0000',
        dark: '#0a0a0a',
        glass: 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
        accent: '#00d4ff',
        'accent-green': '#00ff88',
        'accent-orange': '#ff9500',
        'accent-red': '#ff4757',
      },
    },
  },
  plugins: [],
}
