export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        body:    ['var(--font-body)'],
        data:    ['var(--font-body)'],
      },
      colors: {
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-data': 'var(--text-data)',
        'bg-base': 'var(--bg-base)',
        'bg-raised': 'var(--bg-raised)',
        'bg-inset': 'var(--bg-inset)',
        border: 'var(--border)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        '1': 'var(--space-1)', '2': 'var(--space-2)',
        '3': 'var(--space-3)', '4': 'var(--space-4)',
        '5': 'var(--space-5)', '6': 'var(--space-6)',
        '8': 'var(--space-8)', '10': 'var(--space-10)',
        '12': 'var(--space-12)',
      },
    },
  },
  plugins: [],
}
