/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Kinetic Glass Design Tokens ──
        primary: {
          DEFAULT: '#ffb4a8',
          container: '#ff5540',
          dark: '#cc0000',
        },
        secondary: {
          DEFAULT: '#a2e7ff',
          container: '#00d2fd',
        },
        tertiary: {
          DEFAULT: '#00e479',
          container: '#00a657',
        },
        surface: {
          DEFAULT: '#131313',
          variant: '#353534',
        },
        background: '#131313',
        'on-surface': '#e5e2e1',
        'on-surface-variant': '#ebbbb4',
        outline: '#b18780',
        // Glass tokens
        glass: 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.10)',
        'glass-strong': 'rgba(255, 255, 255, 0.08)',
        // Accent shortcuts
        'accent-green': '#00e479',
        'accent-cyan': '#a2e7ff',
        'accent-orange': '#ff9500',
        'accent-red': '#ff5540',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Kinetic Glass Typography Scale
        'display-lg': ['3rem', { lineHeight: '3.5rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        'headline-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        'title-md': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'label-lg': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-md': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        'label-caps': ['0.75rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        '0.5xs': '2px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        gutter: '20px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        'margin-desktop': '40px',
        'margin-mobile': '16px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
        'glow-red': '0 0 20px rgba(255, 85, 64, 0.3)',
        'glow-green': '0 0 20px rgba(0, 228, 121, 0.3)',
        'glow-cyan': '0 0 20px rgba(162, 231, 255, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255, 85, 64, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 85, 64, 0.5)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
