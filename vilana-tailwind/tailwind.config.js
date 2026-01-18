/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",        // все HTML в корне
    "./ru/*.html",     // RU-версия
    "./**/*.js",       // site.js, script.js, cookie-wall и т.д.
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
