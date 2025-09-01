/*! Vilana Consent Wall v1.0 — DE/RU, Tailwind
 *  - Fügt automatisch einen Consent-Wall-Banner + Footer-Link ein
 *  - Speichert Einwilligungen (localStorage)
 *  - Aktiviert optionale Skripte NUR nach Zustimmung:
 *      <script type="text/plain" data-cookie-category="analytics|marketing|functional">…</script>
 *  Kategorien: necessary (immer true), functional, analytics, marketing
 *  Autor: Vilana Event & Catering
 */
(function () {
'use strict';

  // ===================== Einstellungen =====================
var LS_KEY = 'vilana_cookie_consent';
var HTML_LANG = (document.documentElement.getAttribute('lang') || 'de').toLowerCase();

  // ===================== I18N ==============================
var I18N = {
    de: {
    title: 'Cookies & Dienste',
    text: 'Wir verwenden notwendige Cookies für den Betrieb dieser Seite. Optionale Dienste (z. B. Analytics, externe Medien) werden nur mit Ihrer Zustimmung geladen.',
    summary: 'Einstellungen',
    nec: 'Notwendig', necDesc: 'Erforderlich für Grundfunktionen (immer aktiv).',
    func: 'Funktional', funcDesc: 'Externe Schriften, Karten u. ä.',
    ana: 'Analytics', anaDesc: 'Anonyme Reichweitenmessung.',
    mkt: 'Marketing', mktDesc: 'Instagram/YouTube-Einbindungen, Pixel.',
    btnEssential: 'Nur notwendige',
    btnSettings: 'Einstellungen',
    btnSave: 'Auswahl speichern',
    btnAll: 'Alle akzeptieren',
    changeLater: 'Sie können Ihre Auswahl später im Footer unter „Cookie-Einstellungen“ ändern.',
    footerOpen: 'Cookie-Einstellungen'
    },
    ru: {
    title: 'Cookies и сервисы',
    text: 'Мы используем необходимые cookies для работы сайта. Дополнительные сервисы (например, аналитика, внешние медиа) загружаются только с вашего согласия.',
    summary: 'Настройки',
    nec: 'Необходимые', necDesc: 'Требуются для базовых функций (всегда активны).',
    func: 'Функциональные', funcDesc: 'Внешние шрифты, карты и т.п.',
    ana: 'Аналитика', anaDesc: 'Анонимная статистика.',
    mkt: 'Маркетинг', mktDesc: 'Встраивания Instagram/YouTube, пиксели.',
    btnEssential: 'Только необходимые',
    btnSettings: 'Настройки',
    btnSave: 'Сохранить выбор',
    btnAll: 'Принять все',
    changeLater: 'Выбор можно изменить в футере по ссылке «Настройки cookies».',
    footerOpen: 'Настройки cookies'
    }
}[HTML_LANG] || (function () {
    // Fallback DE
    return {
    title: 'Cookies & Dienste',
    text: 'Wir verwenden notwendige Cookies für den Betrieb dieser Seite. Optionale Dienste (z. B. Analytics, externe Medien) werden nur mit Ihrer Zustimmung geladen.',
    summary: 'Einstellungen',
    nec: 'Notwendig', necDesc: 'Erforderlich für Grundfunktionen (immer aktiv).',
    func: 'Funktional', funcDesc: 'Externe Schriften, Karten u. ä.',
    ana: 'Analytics', anaDesc: 'Anonyme Reichweitenmessung.',
    mkt: 'Marketing', mktDesc: 'Instagram/YouTube-Einbindungen, Pixel.',
    btnEssential: 'Nur notwendige',
    btnSettings: 'Einstellungen',
    btnSave: 'Auswahl speichern',
    btnAll: 'Alle akzeptieren',
    changeLater: 'Sie können Ihre Auswahl später im Footer unter „Cookie-Einstellungen“ ändern.',
    footerOpen: 'Cookie-Einstellungen'
    };
})();

  // ===================== Helpers ===========================
function lockScroll(lock) {
    document.documentElement.classList.toggle('overflow-hidden', lock);
    document.body.classList.toggle('overflow-hidden', lock);
}

function loadConsent() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; }
}

function saveConsent(consent) {
    localStorage.setItem(LS_KEY, JSON.stringify(consent));
    applyConsent(consent);
}

  // Aktiviert alle wartenden Skripte nach Zustimmung
function applyConsent(consent) {
    var pending = document.querySelectorAll('script[type="text/plain"][data-cookie-category]');
    pending.forEach(function (node) {
    var cat = node.getAttribute('data-cookie-category');
    if (cat && consent[cat] === true) {
        var s = document.createElement('script');
        // Attribute übernehmen (außer type)
        for (var i = 0; i < node.attributes.length; i++) {
        var attr = node.attributes[i];
        if (attr.name !== 'type') s.setAttribute(attr.name, attr.value);
        }
        s.text = node.text || node.textContent || '';
        node.parentNode.replaceChild(s, node);
    }
    });
}

  // ===================== UI (Tailwind) =====================
function buildWallHTML() {
    return '' +
    '<div id="cookie-wall" class="fixed inset-0 z-[100] hidden">' +
    '  <div class="absolute inset-0 bg-black/50"></div>' +
    '  <div class="relative mx-auto my-auto flex min-h-full items-center justify-center p-4">' +
    '    <div class="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10" role="dialog" aria-modal="true" aria-labelledby="cw-title" aria-describedby="cw-text">' +
    '      <div class="space-y-4">' +
    '        <h2 id="cw-title" class="text-xl font-semibold text-gray-900"></h2>' +
    '        <p id="cw-text" class="text-sm text-gray-700"></p>' +
    '        <details id="cw-details" class="rounded-xl border border-gray-200 bg-gray-50 p-4">' +
    '          <summary id="cw-summary" class="cursor-pointer text-sm font-medium text-gray-900"></summary>' +
    '          <div class="mt-3 grid gap-3 md:grid-cols-2">' +
    '            <label class="flex items-start gap-3">' +
    '              <input type="checkbox" checked disabled class="mt-1">' +
    '              <span class="text-sm"><span id="cw-cat-nec" class="font-medium"></span><br><span id="cw-cat-nec-desc" class="text-gray-600"></span></span>' +
    '            </label>' +
    '            <label class="flex items-start gap-3">' +
    '              <input id="cw-functional" type="checkbox" class="mt-1">' +
    '              <span class="text-sm"><span id="cw-cat-func" class="font-medium"></span><br><span id="cw-cat-func-desc" class="text-gray-600"></span></span>' +
    '            </label>' +
    '            <label class="flex items-start gap-3">' +
    '              <input id="cw-analytics" type="checkbox" class="mt-1">' +
    '              <span class="text-sm"><span id="cw-cat-ana" class="font-medium"></span><br><span id="cw-cat-ana-desc" class="text-gray-600"></span></span>' +
    '            </label>' +
    '            <label class="flex items-start gap-3">' +
    '              <input id="cw-marketing" type="checkbox" class="mt-1">' +
    '              <span class="text-sm"><span id="cw-cat-mkt" class="font-medium"></span><br><span id="cw-cat-mkt-desc" class="text-gray-600"></span></span>' +
    '            </label>' +
    '          </div>' +
    '        </details>' +
    '        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
    '          <button id="cw-essential" class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-settings" class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-save" class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-accept" class="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"></button>' +
    '        </div>' +
    '        <p id="cw-change-later" class="text-xs text-gray-500"></p>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function ensureFooterLink() {
    var existing = document.getElementById('cookie-reopen');
    if (existing) return existing;
    var footer = document.querySelector('footer') || document.body;
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
    '<div class="text-center text-sm text-gray-500 mt-6">' +
    '  <a href="#" id="cookie-reopen" class="underline">' + I18N.footerOpen + '</a>' +
    '</div>';
    footer.appendChild(wrapper.firstChild);
    return document.getElementById('cookie-reopen');
}

function fillTexts() {
    document.getElementById('cw-title').textContent = I18N.title;
    document.getElementById('cw-text').textContent = I18N.text;
    document.getElementById('cw-summary').textContent = I18N.summary;
    document.getElementById('cw-cat-nec').textContent = I18N.nec;
    document.getElementById('cw-cat-nec-desc').textContent = I18N.necDesc;
    document.getElementById('cw-cat-func').textContent = I18N.func;
    document.getElementById('cw-cat-func-desc').textContent = I18N.funcDesc;
    document.getElementById('cw-cat-ana').textContent = I18N.ana;
    document.getElementById('cw-cat-ana-desc').textContent = I18N.anaDesc;
    document.getElementById('cw-cat-mkt').textContent = I18N.mkt;
    document.getElementById('cw-cat-mkt-desc').textContent = I18N.mktDesc;
    document.getElementById('cw-essential').textContent = I18N.btnEssential;
    document.getElementById('cw-settings').textContent = I18N.btnSettings;
    document.getElementById('cw-save').textContent = I18N.btnSave;
    document.getElementById('cw-accept').textContent = I18N.btnAll;
    document.getElementById('cw-change-later').textContent = I18N.changeLater;
}

  // ===================== Init ==============================
document.addEventListener('DOMContentLoaded', function () {
    // UI einfügen
    var container = document.createElement('div');
    container.innerHTML = buildWallHTML();
    document.body.appendChild(container.firstChild);

    // Footer-Link
    var reopenLink = ensureFooterLink();

    // Texte
    fillTexts();

    // Refs
    var wall = document.getElementById('cookie-wall');
    var details = document.getElementById('cw-details');
    var btnEssential = document.getElementById('cw-essential');
    var btnSettings = document.getElementById('cw-settings');
    var btnSave = document.getElementById('cw-save');
    var btnAccept = document.getElementById('cw-accept');
    var cbFunctional = document.getElementById('cw-functional');
    var cbAnalytics = document.getElementById('cw-analytics');
    var cbMarketing = document.getElementById('cw-marketing');

    // Vorhandene Einwilligung?
    var existing = loadConsent();
    if (!existing) {
    wall.classList.remove('hidden'); lockScroll(true);
    } else {
      // Checkboxen nach bestehender Auswahl setzen
    cbFunctional.checked = !!existing.functional;
    cbAnalytics.checked  = !!existing.analytics;
    cbMarketing.checked  = !!existing.marketing;
    applyConsent(existing);
    }

    // Aktionen
    btnEssential.addEventListener('click', function () {
    var consent = { necessary: true, functional: false, analytics: false, marketing: false };
    saveConsent(consent);
    wall.classList.add('hidden'); lockScroll(false);
    });

    btnAccept.addEventListener('click', function () {
    var consent = { necessary: true, functional: true, analytics: true, marketing: true };
    saveConsent(consent);
    wall.classList.add('hidden'); lockScroll(false);
    });

    btnSettings.addEventListener('click', function () {
    if (details && !details.open) details.open = true;
    });

    btnSave.addEventListener('click', function () {
    var consent = {
        necessary: true,
        functional: !!cbFunctional.checked,
        analytics:  !!cbAnalytics.checked,
        marketing:  !!cbMarketing.checked
    };
    saveConsent(consent);
    wall.classList.add('hidden'); lockScroll(false);
    });

    reopenLink.addEventListener('click', function (e) {
    e.preventDefault();
      // Setze Checkboxen aus gespeichertem Zustand
    var c = loadConsent() || { necessary:true, functional:false, analytics:false, marketing:false };
    cbFunctional.checked = !!c.functional;
    cbAnalytics.checked  = !!c.analytics;
    cbMarketing.checked  = !!c.marketing;
    wall.classList.remove('hidden'); lockScroll(true);
    });

    // Expose einfache API
    window.VilanaCookie = {
    open: function () { wall.classList.remove('hidden'); lockScroll(true); },
    reset: function () { localStorage.removeItem(LS_KEY); wall.classList.remove('hidden'); lockScroll(true); },
    get: loadConsent
    };
});
})();
