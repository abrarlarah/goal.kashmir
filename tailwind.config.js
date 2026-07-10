// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        impact: ['Russo One', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#3B82F6',
        },
        dark: {
          bg: '#0B1220',
          card: '#131D31',
          surface: '#18253C',
          elevated: '#1E2B42',
        },
        accent: {
          cyan: '#06B6D4',
          purple: '#8b5cf6',
          yellow: '#eab308',
        },
        // Semantic surface colors
        surface: {
          primary: '#0B1220',
          secondary: '#101827',
          card: '#131D31',
          elevated: '#18253C',
          border: '#24344D',
          divider: '#1E2B42',
        },
        // Semantic text colors
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
        // Status colors
        status: {
          live: '#EF4444',
          upcoming: '#3B82F6',
          completed: '#22C55E',
          cancelled: '#6B7280',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}