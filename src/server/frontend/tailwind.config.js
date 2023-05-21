const spotify = '#1db954'
const purple = '#bc03bb'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify,
        primary: purple,
        dark: {
          DEFAULT: '#121212',
          light: '#1e1e1e'
        }
      }
    }
  },
  plugins: []
}
