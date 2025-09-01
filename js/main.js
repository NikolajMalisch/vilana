// js/main.js
document.addEventListener('DOMContentLoaded', () => {
  // ===== БУРГЕР-МЕНЮ =====
  const menuBtn    = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  function closeMobileMenu() {
    mobileMenu?.classList.add('hidden');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
      menuBtn.setAttribute('aria-expanded', String(!mobileMenu.classList.contains('hidden')));
    });

    // Закрытие по клику вне
    document.addEventListener('click', (e) => {
      if (!mobileMenu.classList.contains('hidden')) {
        const inside = mobileMenu.contains(e.target) || menuBtn.contains(e.target);
        if (!inside) closeMobileMenu();
      }
    });

    // Закрытие по Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });

    // Закрытие при переходе на desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768) closeMobileMenu();
    });
  }

  // ===== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА =====
  const btnDesk  = document.getElementById('langToggle');
  const menuDesk = document.getElementById('langMenu');

  const btnMob   = document.getElementById('langToggleMobile');
  const menuMob  = document.getElementById('langMenuMobile');

  // ===== EVENT LINKS =====
  const EVENT_ID = 'russian-oktoberfest-2025';
  function copyTrackingParams(fromURL, toURL) {
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(k => {
      const v = fromURL.searchParams.get(k);
      if (v) toURL.searchParams.set(k, v);
    });
  }
  function setEventLinks() {
    const url  = new URL(location.href);
    let savedLang = 'de';
    try { savedLang = localStorage.getItem('siteLang') || 'de'; } catch(e) {}
    const lang = (url.searchParams.get('lang') || savedLang || 'de').toLowerCase();

    const ev   = new URL('event.html', url);
    ev.searchParams.set('id', EVENT_ID);
    ev.searchParams.set('lang', lang);
    copyTrackingParams(url, ev);

    document.querySelectorAll('#eventLink, #eventLinkMobile, #eventLinkFooter, a[data-ev-link]')
      .forEach(a => { a.href = ev.href; });
  }

  // ===== Смена языка =====
  function setLanguage(lang) {
    // Сохраняем выбор (безопасно)
    try { localStorage.setItem('siteLang', lang); } catch (e) {}

    // Атрибут <html lang>
    document.documentElement.lang = (lang === 'ru') ? 'ru' : 'de';

    // Переключение блоков
    document.querySelectorAll('.lang').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll(`.lang-${lang}`).forEach(el => el.classList.remove('hidden'));

    // Лейблы на кнопках
    if (btnDesk) {
      btnDesk.textContent = (lang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnDesk.setAttribute('aria-label', `Sprache wählen – ${lang === 'ru' ? 'Russisch' : 'Deutsch'}`);
    }
    if (btnMob) {
      // если в мобильной кнопке есть <span> — обновим его, иначе заменим целиком
      const span = btnMob.querySelector('span');
      if (span) span.textContent = (lang === 'ru') ? 'RU' : 'DE';
      else btnMob.textContent = (lang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnMob.setAttribute('aria-label', `Sprache wählen – Mobil, ${lang === 'ru' ? 'Russisch' : 'Deutsch'}`);
    }

    // Годы в футере
    const year = new Date().getFullYear();
    const yearDe = document.getElementById('year-de');
    const yearRuElem = document.getElementById('year-ru');
    if (yearRuElem) yearRuElem.textContent = year;
    const yearRu = document.getElementById('year-ru');
    if (yearRu) yearRu.textContent = year;

    // ВАЖНО: обновить ссылки на Event при смене языка
    setEventLinks();

    // Закрыть выпадающие меню языков
    menuDesk?.classList.add('hidden'); btnDesk?.setAttribute('aria-expanded','false');
    menuMob?.classList.add('hidden');  btnMob?.setAttribute('aria-expanded','false');
  }

  // Desktop dropdown
  if (btnDesk && menuDesk) {
    btnDesk.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDesk.classList.toggle('hidden');
      btnDesk.setAttribute('aria-expanded', String(!menuDesk.classList.contains('hidden')));
    });
    menuDesk.querySelectorAll('[data-lang]').forEach(el => {
      el.addEventListener('click', () => {
        setLanguage(el.dataset.lang || 'de');
        menuDesk.classList.add('hidden');
        btnDesk.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Mobile dropdown
  if (btnMob && menuMob) {
    btnMob.addEventListener('click', (e) => {
      e.stopPropagation();
      menuMob.classList.toggle('hidden');
      btnMob.setAttribute('aria-expanded', String(!menuMob.classList.contains('hidden')));
    });
    menuMob.querySelectorAll('[data-lang]').forEach(el => {
      el.addEventListener('click', () => {
        setLanguage(el.dataset.lang || 'de');
        menuMob.classList.add('hidden');
        btnMob.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Закрытие языковых меню при клике вне
  document.addEventListener('click', (e) => {
    if (menuDesk && !menuDesk.contains(e.target) && !btnDesk?.contains(e.target)) {
      menuDesk.classList.add('hidden');
      btnDesk?.setAttribute('aria-expanded', 'false');
    }
    if (menuMob && !menuMob.contains(e.target) && !btnMob?.contains(e.target)) {
      menuMob.classList.add('hidden');
      btnMob?.setAttribute('aria-expanded', 'false');
    }
  });

  // ===== INIT =====
  let initial = 'de';
  try { initial = localStorage.getItem('siteLang') || 'de'; } catch(e) {}
  setLanguage(initial);
  setEventLinks();
});
