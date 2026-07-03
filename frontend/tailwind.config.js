/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper:  '#F5F2EA',
        card:   '#FFFDF8',
        line:   '#D8D2C2',
        plum: {
          DEFAULT: '#4A2545',
          soft:    '#7A4A72',
          wash:    '#F1E8EF',
        },
        green: {
          DEFAULT: '#2F6E4F',
          wash:    '#E8EFE9',
        },
        red: {
          DEFAULT: '#8C3B2E',
          wash:    '#F4E9E6',
        },
        ink:   '#1C1A17',
        muted: '#55504A',
        faint: '#8C8579',
        cream: '#FFFDF8',
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        sans:  ['"IBM Plex Sans"', 'sans-serif'],
        mono:  ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
