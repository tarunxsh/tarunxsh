import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto Slab Variable', ...defaultTheme.fontFamily.sans],
        body: ['Roboto Slab Variable'],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
}
