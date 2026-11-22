/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#092327',
        pearl: '#F4F6F8',
        mist: '#90C2E7',
        ember: '#E06D53',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        architectural: '0 18px 60px rgba(9, 35, 39, 0.16)',
        teal: '0 18px 42px rgba(9, 35, 39, 0.28)',
        glow: '0 0 25px rgba(144, 194, 231, 0.25)',
      },
    },
  },
  plugins: [],
}
