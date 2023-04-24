/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: '#1db954',
        dark: '#121212'
      }
    }
  },
  plugins: []
}
