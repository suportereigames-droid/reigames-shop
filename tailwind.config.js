/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F1115',
        panel: '#161922',
        panel2: '#1D212C',
        line: '#2A2F3B',
        gold: '#E7B94C',
        emerald: '#28C08A',
        ember: '#E8562F',
        mist: '#8B93A7'
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
}
