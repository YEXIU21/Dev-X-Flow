/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#00d4ff',
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#12121a',
        'text-primary': '#ffffff',
        'text-secondary': '#8b8b9a',
        success: '#00ff88',
        warning: '#ffaa00',
      }
    },
  },
  plugins: [],
}
