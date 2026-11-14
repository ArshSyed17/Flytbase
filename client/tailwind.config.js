/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#070d1a', 900: '#0b1426', 800: '#101c33', 700: '#17274a', 600: '#21365f' },
        brand: { 400: '#5aa2ff', 500: '#3b82f6', 600: '#2563eb' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(2,8,23,0.35)' },
    },
  },
  plugins: [],
};
