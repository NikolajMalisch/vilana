// js/main.js
// Версия: без optional chaining, с безопасной работой со storage и автозакрытием меню по клику на ссылку

document.addEventListener('DOMContentLoaded', function () {

  // ==== ХЕЛПЕРЫ ХРАНИЛИЩА + ВАЛИДАЦИЯ ЯЗЫКА (DE: sichere Storage-Helper + Sprachvalidierung) ====
  function validLang(x) { return (x === 'ru' || x === 'de') ? x : 'de'; }
  function getLang() {
    try { return validLang((localStorage.getItem('siteLang') || 'de').toLowerCase()); }
    catch (e) { return 'de'; }
  }
  function setLang(lang) {
    try { localStorage.setItem('siteLang', validLang((lang || 'de').toLowerCase())); } catch (e) {}
  }

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
    var menuLinks = mobileMenu.querySelectorAll('a');
    for (var i = 0; i < menuLinks.length; i++) {
      menuLinks[i].addEventListener('click', closeMobileMenu);
    }
  }

  // ===== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА =====
  var btnDesk  = document.getElementById('langToggle');
  var menuDesk = document.getElementById('langMenu');
  var btnMob   = document.getElementById('langToggleMobile');
  var menuMob  = document.getElementById('langMenuMobile');

  // ===== ССЫЛКИ НА СТРАНИЦУ СОБЫТИЯ =====
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
    // Язык из URL (?lang=) приоритетнее сохранённого; всё валидируем
    var langParam = url.searchParams.get('lang');
    var lang = validLang((langParam ? langParam : getLang()).toLowerCase());

    var ev = new URL('event.html', url);
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
    // Сохраняем и нормализуем язык
    setLang(lang);
    var safeLang = getLang();

    // Устанавливаем атрибут lang на html
    document.documentElement.lang = (safeLang === 'ru') ? 'ru' : 'de';

    // Переключаем видимость блоков с языками
    var allLang = document.querySelectorAll('.lang');
    for (var i = 0; i < allLang.length; i++) {
      allLang[i].classList.add('hidden');
    }
    var currentLangEls = document.querySelectorAll('.lang-' + safeLang);
    for (var j = 0; j < currentLangEls.length; j++) {
      currentLangEls[j].classList.remove('hidden');
    }

    // Обновляем надписи на кнопках языка
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

    // Закрываем выпадающие меню языков
    if (menuDesk) menuDesk.classList.add('hidden');
    if (btnDesk)  btnDesk.setAttribute('aria-expanded', 'false');
    if (menuMob)  menuMob.classList.add('hidden');
    if (btnMob)   btnMob.setAttribute('aria-expanded', 'false');
  }

  // Обработчики для десктопного переключателя
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

  // Обработчики для мобильного переключателя
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

  // Клик снаружи — закрыть оба меню выбора языка
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

  // ===== ГОД В ФУТЕРЕ (DE: Jahr im Footer) =====
  (function () {
    var year = new Date().getFullYear();
    var yearEls = document.querySelectorAll('.year, #year-de, #year-ru');
    for (var i = 0; i < yearEls.length; i++) {
      yearEls[i].textContent = String(year);
    }
  })();

  // ===== INIT =====
  setLanguage(getLang());
  setEventLinks();
});
