import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surface + text
        canvas: "#faf9f6",
        ink: "#2c2c2a",
        muted: "#888780",
        faint: "#b4b2a9",
        line: "#e8e6de",

        // Mode accents
        coral: "#C8522A", // social mode
        violet: "#534AB7", // design mode

        // Status pairs: bg / fg
        approved: { bg: "#EAF3DE", fg: "#27500A" },
        pending: { bg: "#FAEEDA", fg: "#633806" },
        changes: { bg: "#FAECE7", fg: "#712B13" },
        waiting: { bg: "#F1EFE8", fg: "#5F5E5A" },
      },
      fontFamily: {
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderWidth: {
        hairline: "0.5px",
      },
      borderRadius: {
        card: "16px",
        soft: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(44, 44, 42, 0.03)",
        lift: "0 4px 16px rgba(44, 44, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
