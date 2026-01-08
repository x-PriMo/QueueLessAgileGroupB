import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // Enable class-based dark mode (controlled by 'dark' class on html)
  theme: {
    extend: {
      colors: {
        // Dark mode palette
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          elevated: '#334155',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
