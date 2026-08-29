/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#070B10',
        surface: {
          primary: '#0D131A',
          secondary: '#111922',
          elevated: '#151F29',
        },
        border: {
          DEFAULT: '#202B36'
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B'
        },
        telemetry: '#22D3EE',
        safe: '#22C55E',
        moderate: '#EAB308',
        poor: '#F97316',
        hazardous: '#EF4444'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [],
}
