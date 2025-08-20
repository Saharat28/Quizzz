/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- เพิ่มบรรทัดนี้เข้ามา
  theme: {
    extend: {},
  },
  plugins: [],
}