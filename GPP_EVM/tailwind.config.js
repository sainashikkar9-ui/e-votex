/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"], // Tailwind will scan your EJS files here
  theme: {
    extend: {
      fontFamily: {
        // You can name these whatever you want. 
        // We'll use 'hind' and 'mono' as the keys.
        'hind': ['"Hind Madurai"', 'sans-serif'],
        'mono': ['"Roboto Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}