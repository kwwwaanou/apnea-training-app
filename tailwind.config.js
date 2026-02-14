/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#06b6d4", // Cyan 500
          foreground: "#000000",
        },
        accent: {
          DEFAULT: "#ef4444", // Red 500
          foreground: "#ffffff",
        }
      },
    },
  },
  plugins: [],
}
