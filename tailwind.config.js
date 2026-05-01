/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        success: '#16A34A',
        alert: '#F59E0B',
        navy: '#0F172A',
        light: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
        display: ['Baloo 2', 'cursive'],
      },
    },
  },
  plugins: [],
}
