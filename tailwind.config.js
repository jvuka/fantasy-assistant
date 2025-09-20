/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'base': '1.125rem', // 18px
        'lg': '1.25rem',   // 20px
        'xl': '1.5rem',     // 24px
      },
      colors: {
        'high-contrast': {
          'text': '#000000',
          'background': '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}