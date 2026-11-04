/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          bg: '#0f0f0f',
          card: '#1c1c1e',
          accent: '#2AABEE',
          text: '#ffffff',
          secondary: '#8e8e93'
        }
      }
    },
  },
  plugins: [],
}
