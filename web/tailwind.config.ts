import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          0: '#111113',
          1: '#18181b',
          2: '#232327',
          3: '#2e2e33',
        },
        edge: {
          DEFAULT: '#2a2a2f',
          strong: '#404048',
        },
        ink: {
          DEFAULT: '#d4d4d4',
          dim: '#888890',
          bright: '#fafafa',
        },
        accent: {
          DEFAULT: '#fb923c',
          hover: '#fdba74',
        },
        warn: '#facc15',
        danger: '#f43f5e',
        success: '#4ade80',
        info: '#60a5fa',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
