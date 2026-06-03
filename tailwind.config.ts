import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          light: "#6366F1",
          dark: "#4338CA",
          muted: "#EEF2FF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        checkSlide: {
          from: { opacity: "1", transform: "translateX(0)" },
          to: { opacity: "0.6", transform: "translateX(4px)" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "slide-down": "slideDown 0.2s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pop-in": "popIn 0.15s ease-out",
        "check-slide": "checkSlide 0.3s ease-out",
        blink: "blink 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
