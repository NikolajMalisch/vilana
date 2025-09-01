// js/main.js (версия без optional chaining + авто-закрытие по клику на ссылку)
document.addEventListener('DOMContentLoaded', function () {
  // ===== БУРГЕР-МЕНЮ =====
  var menuBtn    = document.getElementById('menuToggle');
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

    // Клик вне меню — закрыть
    document.addEventListener('click', function (e) {
      if (!mobileMenu.classList.contains('hidden')) {
        var inside = mobileMenu.contains(e.target) || menuBtn.contains(e.target);
        if (!inside) closeMobileMenu();
      }
    });

    // Esc — закрыть
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMobileMenu();
    });

    // При ресайзе на desktop — закрыть
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768) closeMobileMenu();
    });

    // Закрывать при клике на любую ссылку внутри мобильного меню
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  // ===== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА =====
  var btnDesk  = document.getElementById('langToggle');
  var menuDesk = document.getElementById('langMenu');
  var btnMob   = document.getElementById('langToggleMobile');
  var menuMob  = document.getElementById('langMenuMobile');

  var EVENT_ID = 'russian-oktoberfest-2025';

  function copyTrackingParams(fromURL, toURL) {
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(function(k){
      var v = fromURL.searchParams.get(k);
      if (v) toURL.searchParams.set(k, v);
    });
  }

  function buildEventURL() {
    var url  = new URL(location.href);
    var savedLang = 'de';
    try { savedLang = localStorage.getItem('siteLang') || 'de'; } catch(e) {}
    var lang = (url.searchParams.get('lang') || savedLang || 'de').toLowerCase();

    var ev   = new URL('event.html', url);
    ev.searchParams.set('id', EVENT_ID);
    ev.searchParams.set('lang', lang);
    copyTrackingParams(url, ev);
    return ev.href;
  }

  function setEventLinks() {
    var href = buildEventURL();
    document.querySelectorAll('#eventLink, #eventLinkMobile, #eventLinkFooter, a[data-ev-link]')
      .forEach(function(a){
        if (a instanceof HTMLAnchorElement) a.href = href;
      });
  }

  function setLanguage(lang) {
    try { localStorage.setItem('siteLang', lang); } catch (e) {}

    document.documentElement.lang = (lang === 'ru') ? 'ru' : 'de';

    document.querySelectorAll('.lang').forEach(function(el){ el.classList.add('hidden'); });
    document.querySelectorAll('.lang-' + lang).forEach(function(el){ el.classList.remove('hidden'); });

    if (btnDesk) {
      btnDesk.textContent = (lang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnDesk.setAttribute('aria-label', 'Sprache wählen – ' + (lang === 'ru' ? 'Russisch' : 'Deutsch'));
    }
    if (btnMob) {
      var span = btnMob.querySelector('span');
      if (span) span.textContent = (lang === 'ru') ? 'RU' : 'DE';
      else btnMob.textContent = (lang === 'ru') ? 'RU ▾' : 'DE ▾';
      btnMob.setAttribute('aria-label', 'Sprache wählen – Mobil, ' + (lang === 'ru' ? 'Russisch' : 'Deutsch'));
    }

    if (menuDesk) menuDesk.classList.add('hidden');
    if (btnDesk)  btnDesk.setAttribute('aria-expanded','false');
    if (menuMob)  menuMob.classList.add('hidden');
    if (btnMob)   btnMob.setAttribute('aria-expanded','false');
  }

  if (btnDesk && menuDesk) {
    btnDesk.addEventListener('click', function (e) {
      e.stopPropagation();
      menuDesk.classList.toggle('hidden');
      btnDesk.setAttribute('aria-expanded', String(!menuDesk.classList.contains('hidden')));
    });
    menuDesk.querySelectorAll('[data-lang]').forEach(function (el) {
      el.addEventListener('click', function () {
        setLanguage(el.dataset.lang || 'de');
        setEventLinks();
      });
    });
  }

  if (btnMob && menuMob) {
    btnMob.addEventListener('click', function (e) {
      e.stopPropagation();
      menuMob.classList.toggle('hidden');
      btnMob.setAttribute('aria-expanded', String(!menuMob.classList.contains('hidden')));
    });
    menuMob.querySelectorAll('[data-lang]').forEach(function (el) {
      el.addEventListener('click', function () {
        setLanguage(el.dataset.lang || 'de');
        setEventLinks();
      });
    });
  }

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

  // Год в футере
  (function () {
    var year = new Date().getFullYear();
    document.querySelectorAll('.year, #year-de, #year-ru')
      .forEach(function (el) { el.textContent = String(year); });
  })();

  // INIT
  var initial = 'de';
  try { initial = localStorage.getItem('siteLang') || 'de'; } catch(e) {}
  setLanguage(initial);
  setEventLinks();
});
