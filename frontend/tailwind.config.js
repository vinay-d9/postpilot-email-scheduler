/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17261e",
        canvas: "#f7f7f2",
        mint: "#d8f0d0",
        lime: "#c9ef56"
      },
      boxShadow: { card: "0 8px 30px rgba(23, 38, 30, 0.07)" }
    }
  },
  plugins: []
};
