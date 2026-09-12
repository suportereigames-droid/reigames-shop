/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14161B',
        panel: '#F7F7F9',
        panel2: '#EFEFF2',
        line: '#E2E4E9',
        gold: '#B8791E',
        emerald: '#1D9A66',
        ember: '#D14A22',
        mist: '#6B7280'
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
}
