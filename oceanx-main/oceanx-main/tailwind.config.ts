import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: '#040a12',
        deep: '#071426',
        panel: '#0b1c31',
        panel2: '#0f253d',
        line: '#1a3350',
        ink: '#e6f0fa',
        muted: '#7e9bbd',
        accent: {
          DEFAULT: '#22d3ee',
          soft: '#67e8f9',
          deep: '#0e7490'
        },
        sev: {
          critical: '#f43f5e',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#38bdf8',
          info: '#64748b'
        },
        ok: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
        oil: '#c026d3'
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(34,211,238,0.35), 0 0 24px -6px rgba(34,211,238,0.45)'
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(26,51,80,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(26,51,80,0.45) 1px, transparent 1px)',
        radar: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.18), transparent 65%)'
      },
      backgroundSize: { grid: '48px 48px' },
      keyframes: {
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        },
        pulseRing: {
          '0%': { transform: 'scale(0.7)', opacity: '0.9' },
          '100%': { transform: 'scale(2.2)', opacity: '0' }
        },
        dash: { to: { strokeDashoffset: '-24' } }
      },
      animation: {
        sweep: 'sweep 2.4s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s ease-out infinite',
        dash: 'dash 1s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;
