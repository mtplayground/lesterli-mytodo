/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        canvas: '#f8fafc',
        accent: '#0f766e',
      },
      boxShadow: {
        panel: '0 20px 45px -25px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
}
