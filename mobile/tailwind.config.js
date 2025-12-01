/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f7a8c',
          dark: '#195f6d',
          light: '#34a0a4',
        },
      },
    },
  },
  plugins: [],
};
