import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#111827',
        surface: '#1f2937',
        border: '#374151',
        borderLight: '#4b5563',
        text: '#f9fafb',
        muted: '#9ca3af',
        faint: '#6b7280',
        green: '#10b981',
        red: '#ef4444',
        amber: '#f59e0b',
        blue: '#3b82f6',
        input: '#07080f',
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
