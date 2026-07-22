/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f1216',
        surface: '#13171b',
        surfaceAlt: '#0a1410',
        primary: {
          DEFAULT: '#00ff6a',
          hover: '#00d65c',
        },
        secondary: '#00f0ff',
        textPrimary: '#f3f4f6',
        textSecondary: '#8a99ad',
        textMuted: '#637381',
        diff: {
          easy: '#10b981',
          medium: '#f59e0b',
          hard: '#f97316',
          insane: '#d91a3c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        cyber: '0 0 15px rgba(0, 255, 106, 0.25)',
        cyberStrong: '0 0 25px rgba(0, 255, 106, 0.4)',
        cyberBlue: '0 0 15px rgba(0, 240, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
