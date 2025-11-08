/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ff6b6b",
        secondary: "#4f46e5",
        dark: "#0f172a",
        light: "#f8fafc",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.25), transparent 55%)",
      },
      boxShadow: {
        glow: "0 0 25px rgba(79, 70, 229, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
