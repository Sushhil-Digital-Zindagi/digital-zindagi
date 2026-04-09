import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        body: ["PlusJakartaSans", "Figtree", "system-ui", "sans-serif"],
        heading: ["PlusJakartaSans", "system-ui", "sans-serif"],
      },
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        card: "0 2px 8px 0 rgba(15,90,72,0.08), 0 1px 2px 0 rgba(15,90,72,0.05)",
        "card-hover": "0 8px 24px 0 rgba(15,90,72,0.14), 0 2px 6px 0 rgba(15,90,72,0.08)",
        emerald: "0 4px 16px 0 rgba(15,90,72,0.25)",
        "ludo-board": "inset 0 2px 8px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(133, 212, 165, 0.2), 0 8px 32px rgba(8, 8, 8, 0.15)",
        "ludo-dice": "0 8px 24px rgba(8, 8, 8, 0.25), inset -2px -2px 4px rgba(224, 215, 200, 0.15), inset 2px 2px 4px rgba(255, 255, 255, 0.2)",
        "ludo-token": "0 6px 16px rgba(8, 8, 8, 0.35), inset -1px -1px 3px rgba(8, 8, 8, 0.2), inset 1px 1px 2px rgba(112, 160, 127, 0.1)",
        "ludo-gold": "inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(140, 128, 96, 0.3), 0 4px 12px rgba(184, 134, 11, 0.25)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px oklch(0.70 0.15 80 / 0.3)" },
          "50%": { boxShadow: "0 0 16px oklch(0.70 0.15 80 / 0.6)" },
        },
        "fire-flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "ludo-dice-roll": {
          "0%": { transform: "rotateX(0deg) rotateY(0deg) rotateZ(0deg)" },
          "25%": { transform: "rotateX(720deg) rotateY(360deg) rotateZ(180deg)" },
          "50%": { transform: "rotateX(1080deg) rotateY(720deg) rotateZ(360deg)" },
          "75%": { transform: "rotateX(1440deg) rotateY(1080deg) rotateZ(540deg)" },
          "100%": { transform: "rotateX(1800deg) rotateY(1440deg) rotateZ(720deg)" },
        },
        "ludo-pawn-jump": {
          "0%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-24px) scale(1.05)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        "ludo-gold-shimmer": {
          "0%, 100%": { boxShadow: "inset 0 1px 0 oklch(0.95 0.04 100 / 0.5), 0 4px 12px oklch(0.72 0.16 80 / 0.25)" },
          "50%": { boxShadow: "inset 0 1px 0 oklch(0.95 0.04 100 / 0.8), 0 6px 16px oklch(0.72 0.16 80 / 0.35)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-in",
        "fade-in": "fade-in 0.4s ease-out",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "fire-flicker": "fire-flicker 0.15s ease-in-out infinite",
        "ludo-dice-roll": "ludo-dice-roll 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "ludo-pawn-jump": "ludo-pawn-jump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ludo-gold-shimmer": "ludo-gold-shimmer 2s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
