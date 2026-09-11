/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: {
          primary: '#FFFFFF',
          secondary: '#F1F5F9',
          elevated: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E2E8F0'
        },
        text: {
          primary: '#1E293B',
          secondary: '#475569',
          muted: '#94A3B8'
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
