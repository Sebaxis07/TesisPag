/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#f4f4f5',
          DEFAULT: '#18181b',
          dark: '#09090b',
        }
      }
    },
  },
  plugins: [],
}
