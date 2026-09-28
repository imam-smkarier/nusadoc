/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0b2341",
          50: "#f0f5fa",
          100: "#dce7f2",
          200: "#b3c9e0",
          300: "#7fa3c7",
          400: "#4a76a5",
          500: "#27507f",
          600: "#153a63",
          700: "#0b2341",
          800: "#081a31",
          900: "#051224",
        },
        brand: {
          DEFAULT: "#087ed4",
          dark: "#0668ad",
          deep: "#05538a",
          soft: "#e3f1fc",
        },
        accent: {
          DEFAULT: "#f97316",
          dark: "#ea580c",
          soft: "#fff1e6",
        },
        canvas: "#f4f7fa",
        line: "#d8e1e8",
        panel: "#ffffff",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        sheet: "0 10px 34px rgba(11,35,65,0.14)",
        card: "0 1px 2px rgba(11,35,65,0.05), 0 1px 3px rgba(11,35,65,0.06)",
        pop: "0 12px 40px rgba(11,35,65,0.18)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .35s ease both",
      },
    },
  },
  plugins: [],
};
