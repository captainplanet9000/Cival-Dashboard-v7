import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
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
        // Trading-specific colors
        trading: {
          buy: "hsl(var(--trading-buy))",
          sell: "hsl(var(--trading-sell))",
          profit: "hsl(var(--trading-profit))",
          loss: "hsl(var(--trading-loss))",
          neutral: "hsl(var(--trading-neutral))",
        },
        chart: {
          grid: "hsl(var(--chart-grid))",
          axis: "hsl(var(--chart-axis))",
          volume: "hsl(var(--chart-volume))",
          indicator: {
            sma: "hsl(var(--chart-indicator-sma))",
            ema: "hsl(var(--chart-indicator-ema))",
            rsi: "hsl(var(--chart-indicator-rsi))",
            macd: "hsl(var(--chart-indicator-macd))",
          },
        },
        status: {
          online: "hsl(var(--status-online))",
          offline: "hsl(var(--status-offline))",
          warning: "hsl(var(--status-warning))",
          error: "hsl(var(--status-error))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-in-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-slow": "bounce 2s infinite",
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
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'trading': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'chart': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      screens: {
        'xs': '475px',
        '3xl': '1680px',
        '4xl': '2048px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // Custom plugin for trading-specific utilities
    function({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        '.trading-grid': {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
        },
        '.chart-container': {
          position: 'relative',
          width: '100%',
          height: '400px',
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
        },
        '.trading-card': {
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
        '.status-indicator': {
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          marginRight: '0.5rem',
        },
        '.price-up': {
          color: 'hsl(var(--trading-profit))',
        },
        '.price-down': {
          color: 'hsl(var(--trading-loss))',
        },
        '.price-neutral': {
          color: 'hsl(var(--trading-neutral))',
        },
      }
      addUtilities(newUtilities)
    },
  ],
};

export default config;
