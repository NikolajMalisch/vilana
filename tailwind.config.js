// tailwind.config.js
module.exports = {
content: [
    "./*.html",
    "./**/*.html",
    "./js/**/*.js",        // важное: чтобы Tailwind сканировал твой consent-скрипт
],
  darkMode: 'class',       // опционально: если используешь тёмную тему через класс
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
    // ===== Consent-Wall UI (кнопки/контейнер) =====
    // контейнер/оверлей/карточка
    'fixed','inset-0','z-[100]','z-[9999]','absolute','bg-black/50','relative',
    'min-h-full','items-center','justify-center','p-4','w-full','max-w-2xl',
    'rounded-2xl','bg-white','p-6','shadow-2xl','ring-1','ring-black/10',
    'space-y-4','text-xl','font-semibold','text-gray-900',
    'text-sm','text-gray-700','rounded-xl','border','border-gray-200','bg-gray-50',
    'grid','gap-3','md:grid-cols-2','mt-3',
    'flex','flex-col-reverse','gap-2','sm:flex-row','sm:justify-end',
    'text-xs','text-gray-500','underline','mt-6','text-center',

    // кнопки (outline + primary)
    'px-4','py-2','font-medium','font-semibold','text-white',
    'ring-gray-300','hover:bg-gray-50',
    'bg-indigo-600','hover:bg-indigo-700',   // если хочешь чёрную кнопку — см. ниже
    'bg-black','hover:bg-neutral-800',       // альтернативные классы под чёрный стиль

    // текстовые цвета, которые часто выпиливаются
    'text-gray-600','text-gray-700','text-gray-900','text-gray-500',
],
}
