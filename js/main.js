// js/main.js
// Версия: без optional chaining, safe storage, корректный язык для /de/ и /ru/,
//         + исправление event URL (всегда /event.html)

document.addEventListener('DOMContentLoaded', function () {

  // ===== Helpers: language validation + safe storage =====
  function validLang(x) { return (x === 'ru' || x === 'de') ? x : 'de'; }

  function getStoredLang() {
    try { return validLang((localStorage.getItem('siteLang') || 'de').toLowerCase()); }
    catch (e) { return 'de'; }
  }

  function setStoredLang(lang) {
    try { localStorage.setItem('siteLang', validLang((lang || 'de').toLowerCase())); } catch (e) {}
  }

  // ===== Detect language from path (/ru/..., /de/...) =====
  function langFromPathname(pathname) {
    // pathname: "/de/", "/ru/", "/de/index.html", ...
    if (typeof pathname !== 'string') return null;
    if (pathname.indexOf('/ru/') === 0) return 'ru';
    if (pathname.indexOf('/de/') === 0) return 'de';
    return null;
  }

  function getEffectiveLang() {
    var url = new URL(location.href);

    // 1) Если мы на /de/ или /ru/ — язык фиксируем по пути (это важно для SEO и стабильности)
    var byPath = langFromPathname(url.pathname);
    if (byPath) return byPath;

    // 2) На остальных страницах: ?lang= приоритетнее localStorage
    var langParam = url.searchParams.get('lang');
    if (langParam) return validLang(String(langParam).toLowerCase());

    // 3) Fallback
    return getStoredLang();
  }

  // ===== Burger menu =====
  var menuBtn = document.getElementById('menuToggle');
  var mobileMenu = document.getElementById('mobileMenu');

  function closeMobileMenu() {
    if (mobileMenu) mobileMenu.classList.add('hidden');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
      menuBtn.setAttribute('aria-expanded', String(!mobileMenu.classList.contains('hidden')));
    });

    // Click outside
    document.addEventListener('click', function (e) {
      if (!mobileMenu.classList.contains('hidden')) {
        var inside = mobileMenu.contains(e.target) || menuBtn.contains(e.target);
        if (!inside) closeMobileMenu();
      }
    });

    // Esc
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMenu();
    });

    // Resize to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) closeMobileMenu();
    });

    // Close on any link click
    var menuLinks = mobileMenu.querySelectorAll('a');
    for (var i = 0; i < menuLinks.length; i++) {
      menuLinks[i].addEventListener('click', closeMobileMenu);
    }
  }

  // ===== Language toggle elements (may be absent on /de/ /ru/ pages) =====
  var btnDesk = document.getElementById('langToggle');
  var menuDesk = document.getElementById('langMenu');
  var btnMob = document.getElementById('langToggleMobile');
  var menuMob = document.getElementById('langMenuMobile');

  // ===== Event links =====
  var EVENT_ID = 'russian-oktoberfest-2025';

  function copyTrackingParams(fromURL, toURL) {
    var keys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = fromURL.searchParams.get(k);
      if (v) toURL.searchParams.set(k, v);
    }
  }

  function buildEventURL() {
    var url = new URL(location.href);

    // Язык берём из логики "path > ?lang > storage"
    var lang = getEffectiveLang();

    // ВАЖНО: абсолютный путь, чтобы /de/ не превращалось в /de/event.html
    var ev = new URL('/event.html', url);

    ev.searchParams.set('id', EVENT_ID);
    ev.searchParams.set('lang', lang);

    copyTrackingParams(url, ev);
    return ev.href;
  }

  function setEventLinks() {
    var href = buildEventURL();
    var links = document.querySelectorAll('#eventLink, #eventLinkMobile, #eventLinkFooter, a[data-ev-link]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a instanceof HTMLAnchorElement) a.href = href;
    }
  }

  function setLanguage(lang) {
    var safeLang = validLang((lang || 'de').toLowerCase());

    // сохраняем
    setStoredLang(safeLang);

    // html lang
    document.documentElement.lang = (safeLang === 'ru') ? 'ru' : 'de';

    // если на странице есть языковые блоки (.lang / .lang-de / .lang-ru) — переключаем
    var allLang = document.querySelectorAll('.lang');
    for (var i = 0; i < allLang.length; i++) allLang[i].classList.add('hidden');

    var currentLangEls = document.querySelectorAll('.lang-' + safeLang);
    for (var j = 0; j < currentLangEls.length; j++) currentLangEls[j].classList.remove('hidden');

    // обновляем подписи кнопок (если есть)
    if (btnDesk) {
      btnDesk.textContent = (safeLang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnDesk.setAttribute('aria-label', 'Sprache wählen – ' + (safeLang === 'ru' ? 'Russisch' : 'Deutsch'));
    }
    if (btnMob) {
      var span = btnMob.querySelector('span');
      if (span) span.textContent = (safeLang === 'ru') ? 'RU' : 'DE';
      else btnMob.textContent = (safeLang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnMob.setAttribute('aria-label', 'Sprache wählen – Mobil, ' + (safeLang === 'ru' ? 'Russisch' : 'Deutsch'));
    }

    // закрываем языковые меню (если есть)
    if (menuDesk) menuDesk.classList.add('hidden');
    if (btnDesk) btnDesk.setAttribute('aria-expanded', 'false');
    if (menuMob) menuMob.classList.add('hidden');
    if (btnMob) btnMob.setAttribute('aria-expanded', 'false');
  }

  // Desktop language dropdown handlers (if exists)
  if (btnDesk && menuDesk) {
    btnDesk.addEventListener('click', function (e) {
      e.stopPropagation();
      menuDesk.classList.toggle('hidden');
      btnDesk.setAttribute('aria-expanded', String(!menuDesk.classList.contains('hidden')));
    });

    var deskItems = menuDesk.querySelectorAll('[data-lang]');
    for (var i = 0; i < deskItems.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          setLanguage(el.getAttribute('data-lang') || 'de');
          setEventLinks();
        });
      })(deskItems[i]);
    }
  }

  // Mobile language dropdown handlers (if exists)
  if (btnMob && menuMob) {
    btnMob.addEventListener('click', function (e) {
      e.stopPropagation();
      menuMob.classList.toggle('hidden');
      btnMob.setAttribute('aria-expanded', String(!menuMob.classList.contains('hidden')));
    });

    var mobItems = menuMob.querySelectorAll('[data-lang]');
    for (var i = 0; i < mobItems.length; i++) {
      (function (el) {
        el.addEventListener('click', function () {
          setLanguage(el.getAttribute('data-lang') || 'de');
          setEventLinks();
        });
      })(mobItems[i]);
    }
  }

  // Click outside — close language menus
  document.addEventListener('click', function (e) {
    if (menuDesk && !menuDesk.contains(e.target) && !(btnDesk && btnDesk.contains(e.target))) {
      menuDesk.classList.add('hidden');
      if (btnDesk) btnDesk.setAttribute('aria-expanded', 'false');
    }
    if (menuMob && !menuMob.contains(e.target) && !(btnMob && btnMob.contains(e.target))) {
      menuMob.classList.add('hidden');
      if (btnMob) btnMob.setAttribute('aria-expanded', 'false');
    }
  });

  // ===== Year in footer =====
  (function () {
    var year = new Date().getFullYear();
    var yearEls = document.querySelectorAll('.year, #year-de, #year-ru');
    for (var i = 0; i < yearEls.length; i++) yearEls[i].textContent = String(year);
  })();

  // ===== INIT =====
(function () {
  var path = window.location.pathname;

  // Язык ТОЛЬКО по URL
  if (path.indexOf('/ru/') === 0) {
    setLanguage('ru');
  } else {
    setLanguage('de');
  }
})();

