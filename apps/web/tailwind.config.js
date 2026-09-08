const preset = require("@alphatrade/ui/tailwind-preset");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};
