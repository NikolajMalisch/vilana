/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./**/*.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: { 600: "#c9b192" } // для border-brand-600
      }
    }
  },
  plugins: []
};
