/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: '#0095FF',
        'primary-hover': '#0080FF'
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}