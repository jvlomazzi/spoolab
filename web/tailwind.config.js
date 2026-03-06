/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: {
          800: '#1c1917',
          700: '#292524',
          600: '#44403c',
          500: '#57534e',
        },
        accent: {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          muted: '#b45309',
        },
      },
    },
  },
  plugins: [],
}
