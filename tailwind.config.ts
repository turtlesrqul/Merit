import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#101828",
          900: "#182230",
          700: "#344054",
          500: "#667085",
          200: "#d0d5dd",
          100: "#eaecf0",
          50: "#f9fafb"
        },
        sun: {
          50: "#fffdf2",
          100: "#fff7cc",
          200: "#ffe999",
          300: "#ffd54d",
          400: "#ffc21a",
          500: "#f5b301",
          600: "#d99600",
          700: "#a86e00"
        }
      }
    }
  },
  plugins: []
};

export default config;
