/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#2355B6",
        secondary: "#FFC649",

        accent: "#27C840",
        muted: "#636F85",

        background: "#F9F9FB",
        card: "#F3F4F6",
      },
    },
  },
  plugins: [],
};