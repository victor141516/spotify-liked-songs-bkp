/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: '#1db954',
        dark: {
          DEFAULT: '#121212',
          light: '#1e1e1e'
        }
      }
    }
  },
  plugins: []
}
