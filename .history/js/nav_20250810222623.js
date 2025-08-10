document.addEventListener('DOMContentLoaded', function () {

  // === Язык ===
  window.setLanguage = window.setLanguage || function (lang) {
    try {
      if (window.switchLanguage) window.switchLanguage(lang);
    } catch (e) {}
    localStorage.setItem('lang', lang);

    // Добавляем класс для CSS
    document.documentElement.classList.toggle('lang-de', lang === 'de');
    document.documentElement.classList.toggle('lang-ru', lang === 'ru');

    setLangLabel(document.getElementById('langToggleMobile'), lang);
    setLangLabel(document.getElementById('langToggle'), lang);
  };

  function setLangLabel(button, lang) {
    if (!button) return;
    if (button.tagName.toLowerCase() === 'button') {
      let span = button.querySelector('span');
      if (span) span.textContent = lang.toUpperCase();
      else button.textContent = lang.toUpperCase() + ' ▾';
    }
  }

  // Восстановить язык при загрузке
  const savedLang = localStorage.getItem('lang') || 'de';
  document.documentElement.classList.add(savedLang === 'ru' ? 'lang-ru' : 'lang-de');
  setLanguage(savedLang);

  // Обработчики для меню выбора языка (Desktop + Mobile)
  function setupLangMenu(toggleId, menuId) {
    const toggle = document.getElementById(toggleId);
    const menu = document.getElementById(menuId);
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });

    menu.querySelectorAll('button[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        setLanguage(lang);
        menu.classList.add('hidden');
    });
    });

    document.addEventListener('click', (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
    }
    });
}

setupLangMenu('langToggle', 'langMenu');
setupLangMenu('langToggleMobile', 'langMenuMobile');

  // === Бургер-меню ===
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    });
}

});
