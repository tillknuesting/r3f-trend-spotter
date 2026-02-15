/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // R3F Palette
        primary: "#000000",
        secondary: "#555555",
        accent: "#00F5FF", // Neon Cyan
        background: "#ffffff",
        surface: "#f5f5f5",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "0px", // Sharp edges everywhere
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "9999px", // Only for circular avatars if needed
      }
    },
  },
  plugins: [],
}
