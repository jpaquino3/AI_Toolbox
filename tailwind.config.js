/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'dark-800': '#1f2937',
        'dark-900': '#111827',
      },
    },
  },
  plugins: [],
} 