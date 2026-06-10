import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0F0F0F",
        card: "#1A1A1A",
        foreground: "#F5F5F5",
        primary: "#9F7AEA",
        accent: "#F59E0B",
      },
    },
  },
};

export default config;
