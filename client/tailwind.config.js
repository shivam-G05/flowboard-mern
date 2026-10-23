/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Interface text, editorial display headings, and figures/metadata.
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Warm paper surfaces.
        paper: { 50: '#FDFCF9', 100: '#F7F5F0', 200: '#EFECE4', 300: '#E5E1D6' },
        // Warm neutrals for text, borders and fills.
        ink: {
          50: '#FAF9F6', 100: '#F1EFEA', 200: '#E3E0D8', 300: '#CFCBC0', 400: '#A09B8F',
          500: '#78736A', 600: '#5B5750', 700: '#44413B', 800: '#2B2925', 900: '#1C1B18', 950: '#121110',
        },
        // The single accent: persimmon. Used for focus, active navigation, urgency and key actions.
        brand: {
          50: '#FDF3EF', 100: '#FAE3DA', 200: '#F4C3B1', 300: '#EC9C80', 400: '#E27352',
          500: '#D4552F', 600: '#B94424', 700: '#98361D', 800: '#7A2D1A', 900: '#632717',
        },
        // Status colours — muted, used only for state.
        good: { 50: '#EEF4EF', 500: '#3F7A57', 600: '#33664A', 700: '#2A533C' },
        warn: { 50: '#FAF2E3', 500: '#B7791F', 600: '#9A6519', 700: '#7C5114' },
        bad: { 50: '#FBEDEA', 500: '#C2412A', 600: '#A83722', 700: '#8A2D1C' },
      },
      boxShadow: {
        // Only floating layers (menus, dialogs, drag overlay) get a shadow.
        float: '0 0 0 1px rgba(28, 27, 24, 0.08), 0 12px 32px -8px rgba(28, 27, 24, 0.18)',
        lift: '0 0 0 1px rgba(28, 27, 24, 0.10), 0 8px 18px -6px rgba(28, 27, 24, 0.22)',
      },
      letterSpacing: {
        label: '0.08em',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        progress: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(250%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.8s infinite',
        progress: 'progress 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
