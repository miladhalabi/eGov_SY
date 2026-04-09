/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['GESS', 'sans-serif'],
        serif: ['GESS', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      colors: {
        gov: {
          primary: "var(--gov-primary)",
          secondary: "var(--gov-secondary)",
          bg: "var(--gov-bg)",
        }
      }
    },
  },
  plugins: [],
}

