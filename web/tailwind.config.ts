// @ts-nocheck
import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2b6cb0',
        primaryHover: '#245a93',
        border: '#c7d5e8',
        surface: '#ffffff',
        background: '#e7f3ff',
        text: '#333333',
        muted: '#666666',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [heroui()],
};

export default config;
