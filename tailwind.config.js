// tailwind.config.js
module.exports = {
content: [
    "./*.html",                     // корневые HTML
    "./**/*.{html,js,vue}",         // все подпапки с html/js/vue
    "!./node_modules/**",           // исключить node_modules
    "!./dist/**",                   // исключить финальный билд
    "!./build/**",                  // исключить сборки
    "!./.history/**",               // исключить историю редактора
],
  darkMode: "class",                // если хочешь поддержку тёмной темы
theme: {
    extend: {
    fontFamily: {
        cinzel: ["'Cinzel Decorative'", "cursive"],
        cormorant: ["'Cormorant SC'", "serif"],
    },
    },
},
plugins: [],
safelist: [
    // ===== Consent-Wall UI =====
    // контейнер/оверлей/карточка
    'fixed','inset-0','z-[100]','z-[9999]','absolute','bg-black/50','relative',
    'min-h-full','items-center','justify-center','p-4','w-full','max-w-2xl',
    'rounded-2xl','bg-white','p-6','shadow-2xl','ring-1','ring-black/10',
    'space-y-4','text-xl','font-semibold','text-gray-900',
    'text-sm','text-gray-700','rounded-xl','border','border-gray-200','bg-gray-50',
    'grid','gap-3','md:grid-cols-2','mt-3',
    'flex','flex-col-reverse','gap-2','sm:flex-row','sm:justify-end',
    'text-xs','text-gray-500','underline','mt-6','text-center',

    // ===== Кнопки =====
    // outline
    'px-4','py-2','font-medium','ring-1','ring-gray-300','hover:bg-gray-50',
    // primary (чёрная кнопка)
    'bg-black','hover:bg-neutral-800','text-white','font-semibold',

    // ===== Дополнительно =====
    'hidden','backdrop-blur-md','bg-white/90','border-t','border-gray-200',
    'text-gray-600','text-gray-700','text-gray-900',
],
};
