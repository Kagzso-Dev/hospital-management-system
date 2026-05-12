export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          DEFAULT: '#1a73c8',
          600: '#1a73c8',
          700: '#1558a0',
          800: '#1e3a5f',
          dark:  '#1558a0',
          light: '#eff6ff',
        },
        medical: {
          blue:   '#1a73c8',
          teal:   '#0891b2',
          green:  '#16a34a',
          red:    '#dc2626',
          bg:     '#f0f5fb',
          card:   '#ffffff',
          border: '#e2e8f0',
          muted:  '#64748b',
          dark:   '#1e293b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 2px 12px 0 rgba(26,115,200,0.07)',
        'card-hover': '0 8px 28px 0 rgba(26,115,200,0.14)',
        nav:        '0 2px 16px 0 rgba(26,115,200,0.10)',
      },
    },
  },
  plugins: [],
};
