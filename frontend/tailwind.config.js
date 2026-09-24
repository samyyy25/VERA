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
        palette: {
          burgundy: '#800020',
          burgundyDark: '#4d0013',
          burgundyLight: '#a31032',
          sand: '#F3E6D5',
          sandLight: '#FAF3EB',
          sandDark: '#E0CDAF',
          ivory: '#FFF9F2',
          rose: '#D45060',
          roseLight: '#E57381',
          roseDark: '#B83244',
        },
        vera: {
          burgundy: '#800020',
          sand: '#F3E6D5',
          ivory: '#FFF9F2',
          rose: '#D45060',
          navy: '#12070a',
          dark: '#1a0a0f',
          slate: '#240e17',
          teal: '#800020',
          tealLight: '#D45060',
          tealGlow: '#E57381',
          emergency: '#800020',
          emergencyDark: '#560015',
          warning: '#D45060',
          surface: '#1a0a0f',
          card: '#220e15',
          border: '#3d1422',
          primary: '#800020',
          primaryDark: '#4d0013',
          primaryLight: '#D45060',
          cream: '#FFF9F2',
          creamCard: '#FAF3EB',
          mutedText: '#c9a79c',
          darkText: '#2a0b12',
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
