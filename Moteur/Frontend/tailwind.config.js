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
        theme: {
          primary:   'var(--color-primary)',
          secondary: 'var(--color-secondary)',
          accent:    'var(--color-accent)',
          danger:    'var(--color-danger)',
          'bg-main':    'var(--color-bg-main)',
          'bg-card':    'var(--color-bg-card)',
          'bg-sidebar': 'var(--color-bg-sidebar)',
          border:    'var(--color-border)',
          'text-main':  'var(--color-text-main)',
          'text-muted': 'var(--color-text-muted)',
        }
      }
    },
  },
  plugins: [],
}
