/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand green palette
        brand: {
          50:  '#E8F5EF',
          100: '#C6E6D4',
          200: '#9DD4B5',
          300: '#6DC196',
          400: '#3DAE78',
          500: '#1A6B3C', // primary
          600: '#155A32',
          700: '#104827',
          800: '#0A371C',
          900: '#052511',
        },
        // Spending score
        score: {
          green: '#22C55E',
          amber: '#F59E0B',
          red:   '#EF4444',
        },
        // Budget progress
        budget: {
          safe:    '#22C55E', // <60%
          warning: '#F59E0B', // 60–80%
          danger:  '#EF4444', // >80%
        },
      },
    },
  },
  plugins: [],
};
