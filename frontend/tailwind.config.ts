import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Geist Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        logo: ['Roboto Mono', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-secondary": "hsl(var(--background-secondary))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          light: "hsl(var(--destructive-light))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light: "hsl(var(--warning-light))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          active: "hsl(var(--sidebar-active-bg))",
          hover: "hsl(var(--sidebar-hover-bg))",
        },
        plan: {
          free: {
            bg: "hsl(var(--plan-free-bg))",
            text: "hsl(var(--plan-free-text))",
          },
          starter: {
            bg: "hsl(var(--plan-starter-bg))",
            text: "hsl(var(--plan-starter-text))",
          },
          pro: {
            bg: "hsl(var(--plan-pro-bg))",
            text: "hsl(var(--plan-pro-text))",
          },
          business: {
            bg: "hsl(var(--plan-business-bg))",
            text: "hsl(var(--plan-business-text))",
          },
        },
        category: {
          question: {
            bg: "hsl(var(--category-question-bg))",
            text: "hsl(var(--category-question-text))",
          },
          praise: {
            bg: "hsl(var(--category-praise-bg))",
            text: "hsl(var(--category-praise-text))",
          },
          complaint: {
            bg: "hsl(var(--category-complaint-bg))",
            text: "hsl(var(--category-complaint-text))",
          },
          suggestion: {
            bg: "hsl(var(--category-suggestion-bg))",
            text: "hsl(var(--category-suggestion-text))",
          },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'sidebar': '240px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'red': '0 4px 12px rgba(255, 0, 0, 0.2)',
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "grow-bar": {
          from: { width: "0%" },
          to: { width: "var(--bar-width)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "slide-up": "slide-up 0.3s ease-out forwards",
        "scale-in": "scale-in 0.25s ease-out forwards",
        "grow-bar": "grow-bar 0.8s ease-out forwards",
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
