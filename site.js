/js/site.js
<script>
// ======================= ЗАГРУЗКА PARTIALS ИЗ index.html =======================
async function loadFromIndex(selector, targetId) {
try {
    const resp = await fetch('index.html', { cache: 'no-cache' });
    const text = await resp.text();
    const doc  = new DOMParser().parseFromString(text, 'text/html');
    const part = doc.querySelector(selector);
    const target = document.getElementById(targetId);
    if (part && target) target.innerHTML = part.outerHTML;
} catch (err) {
    console.error('[site.js] Ошибка загрузки из index.html:', err);
}
}

// ======================= ЯЗЫК: ГЛОБАЛЬНАЯ ФУНКЦИЯ =============================
window.setLanguage = window.setLanguage || function setLanguage(lang) {
  // 1) сохранить выбор
localStorage.setItem('vilana_lang', lang);

  // 2) классы на <html> (если когда-то пригодится для CSS)
document.documentElement.classList.toggle('lang-de', lang === 'de');
document.documentElement.classList.toggle('lang-ru', lang === 'ru');

  // 3) скрыть всё .lang и показать элементы нужного языка
document.querySelectorAll('.lang').forEach(el => el.style.display = 'none');

const blockTags = new Set(['H1','H2','H3','H4','H5','H6','P','DIV','LI','UL','OL','SECTION','ARTICLE','FOOTER','HEADER']);
document.querySelectorAll('.lang-' + lang).forEach(el => {
    const hint = el.getAttribute('data-disp');
    el.style.display = hint ? hint : (blockTags.has(el.tagName) ? 'block' : 'inline');
});

  // 4) подсветка активной кнопки (работает и с data-lang, и с inline onclick)
document.querySelectorAll('[data-lang], [onclick^="setLanguage"]').forEach(btn => {
    const isActive = btn.getAttribute('data-lang') === lang ||
                    (btn.getAttribute('onclick') || '').includes("'" + lang + "'");
    btn.classList.toggle('ring-2', isActive);
    btn.classList.toggle('ring-amber-500', isActive);
});
};

// ======================= ДОБАВИТЬ НЕДОСТАЮЩИЕ КНОПКИ ЯЗЫКА ====================
function ensureLangButtons() {
  // Desktop-контейнер с флагами (ищем существующий)
let desktopLangBox = document.querySelector('header .hidden.md\\:flex.gap-2');

  // Если в шапке его нет — создаём
if (!desktopLangBox) {
    const headerContainer = document.querySelector('header .container');
    if (headerContainer) {
    desktopLangBox = document.createElement('div');
    desktopLangBox.className = 'hidden md:flex gap-2';
    headerContainer.appendChild(desktopLangBox);
    }
}

  // Добавить 🇩🇪
if (desktopLangBox && !desktopLangBox.querySelector('[data-lang="de"],[onclick*="setLanguage(\'de\')"]')) {
    const deBtn = document.createElement('button');
    deBtn.type = 'button';
    deBtn.setAttribute('data-lang', 'de');
    deBtn.className = 'px-2';
    deBtn.textContent = '🇩🇪';
    desktopLangBox.appendChild(deBtn);
}

  // Добавить 🇷🇺
if (desktopLangBox && !desktopLangBox.querySelector('[data-lang="ru"],[onclick*="setLanguage(\'ru\')"]')) {
    const ruBtn = document.createElement('button');
    ruBtn.type = 'button';
    ruBtn.setAttribute('data-lang', 'ru');
    ruBtn.className = 'px-2';
    ruBtn.textContent = '🇷🇺';
    desktopLangBox.appendChild(ruBtn);
}

  // Mobile: добавить ряд языков, если его нет
const mobileMenu = document.getElementById('mobileMenu');
if (mobileMenu && !mobileMenu.querySelector('.lang-row')) {
    const row = document.createElement('div');
    row.className = 'lang-row flex gap-3 items-center pt-2';
    row.innerHTML = `
    <button type="button" data-lang="de" class="px-2">🇩🇪</button>
    <button type="button" data-lang="ru" class="px-2">🇷🇺</button>
    `;
    mobileMenu.prepend(row);
}
}

// ======================= БУРГЕР-МЕНЮ ==========================================
function initHeaderInteractions() {
const toggleBtn  = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (toggleBtn && mobileMenu) {
    toggleBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}
}

// ======================= EVENT-ССЫЛКА С UTM И ЯЗЫКОМ ==========================
(function(){
const EVENT_ID = 'russian-oktoberfest-2025';

function copyTrackingParams(fromURL, toURL) {
    const keep = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'];
    keep.forEach(k => {
    const v = fromURL.searchParams.get(k);
    if (v) toURL.searchParams.set(k, v);
    });
}

window.setEventLinks = function setEventLinks() {
    const url  = new URL(location.href);
    const lang = (url.searchParams.get('lang') || localStorage.getItem('vilana_lang') || 'de').toLowerCase();

    const ev = new URL('event.html', url);
    ev.searchParams.set('id', EVENT_ID);
    ev.searchParams.set('lang', lang);
    copyTrackingParams(url, ev);

    const selectors = '#eventLink, #eventLinkMobile, #eventLinkFooter, a[data-ev-link]';
    document.querySelectorAll(selectors).forEach(a => { a.href = ev.href; });
};
})();

// ======================= EmailJS (если форма существует) ======================
function initEmailJSIfPresent() {
  // Если emailjs не подключен на странице — просто выходим
if (typeof emailjs === 'undefined') return;

try { emailjs.init('vfmomNKrMxrf2xqDW'); } catch (e) {}

const form = document.getElementById('contactForm');
if (!form) return;

form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (form.honeypot && form.honeypot.value !== '') return; // антиспам
    emailjs.sendForm('service_75biswm', 'template_fuxgrlb', form)
    .then(() => {
        const msg = document.getElementById('formMsg');
        if (msg) msg.classList.remove('hidden');
        form.reset();
    }, (error) => {
        alert('Fehler beim Senden: ' + (error?.text || 'Unbekannter Fehler'));
    });
});
}

// ======================= ДЕЛЕГАТОР КЛИКОВ ПО [data-lang] ======================
function attachLangDelegator() {
  // Один обработчик на документ — работает и для кнопок, появившихся позже
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn) return;
    window.setLanguage(btn.getAttribute('data-lang'));
});
}

// ======================= BOOT (точка входа) ==================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1) Подставить шапку/футер из index.html
await loadFromIndex('header', 'site-header');
await loadFromIndex('footer', 'site-footer');

  // 2) Подготовить элементы шапки
  ensureLangButtons();        // добавит RU/DE, если их нет
  initHeaderInteractions();   // бургер

  // 3) Запустить делегатор выбора языка
attachLangDelegator();

  // 4) Установить язык: ?lang=… > localStorage > de
const url = new URL(location.href);
const urlLang = (url.searchParams.get('lang') || '').toLowerCase();
const saved   = (localStorage.getItem('vilana_lang') || '').toLowerCase();
window.setLanguage(urlLang || saved || 'de');

  // 5) Проставить ссылки на событие
window.setEventLinks();

  // 6) Если есть форма и подключён emailjs — инициализировать
initEmailJSIfPresent();
});