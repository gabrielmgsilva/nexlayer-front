import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nex: {
          bg:         '#07090C',
          surface:    '#0D1117',
          surface2:   '#11161E',
          border:     '#1A2029',
          borderHi:   '#242C38',
          text:       '#E6EDF3',
          textDim:    '#8B96A8',
          textMute:   '#5A6675',
          cyan:       '#00D9FF',
          green:      '#5EFF8A',
          amber:      '#FFB547',
          red:        '#FF5C7A',
          violet:     '#B388FF',
        },
        primary: {
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        success:  'var(--color-success)',
        warning:  'var(--color-warning)',
        error:    'var(--color-error)',
        info:     'var(--color-info)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        glow: '0 0 0 1px #00D9FF, 0 4px 18px -4px rgba(0, 217, 255, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
