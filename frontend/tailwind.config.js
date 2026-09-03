/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vera: {
          navy: '#0A192F',
          dark: '#0B132B',
          slate: '#1E293B',
          teal: '#0D9488',
          tealLight: '#14B8A6',
          tealGlow: '#2DD4BF',
          emergency: '#EF4444',
          emergencyDark: '#DC2626',
          warning: '#F59E0B',
          surface: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar': 'radar 2s linear infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
};
