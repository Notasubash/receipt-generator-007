/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          muted: '#0f3460',
        },
        gold: {
          DEFAULT: '#e2b04a',
          light: '#f0c97a',
          dark: '#b8861f',
        },
        cream: {
          DEFAULT: '#fdf6ec',
          dark: '#f5e6cc',
        },
        slate: {
          subtle: '#f8f9fc',
        },
      },
    },
  },
  plugins: [],
}
