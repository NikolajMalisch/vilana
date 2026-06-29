
/*! Vilana Consent Wall v1.2 — DE/RU, Tailwind, Hardening
 * [DE] Funktionsübersicht:
 *   - Sicherer Storage (Fallback im Speicher, falls localStorage blockiert ist)
 *   - DNT-Respekt: Bei aktivem Do Not Track laden wir nur "necessary" ohne Banner
 *   - Versionsverwaltung + Gültigkeit (180 Tage) -> Re-Prompt nach Ablauf/Version
 *   - Aktiviert verzögerte Ressourcen pro Kategorie:
 *       <script type="text/plain" data-cookie-category="analytics|marketing|functional">…</script>
 *       <link  data-cookie-category="functional" data-cookie-href="https://…">
 *       <iframe data-cookie-category="marketing"  data-cookie-src="https://…"></iframe>
 *   - Event: window.dispatchEvent(new CustomEvent('vilana:consentChanged',{detail:{consent}}))
 *
 * [RU] Обзор функций:
 *   - Безопасное хранение (резерв в памяти, если localStorage недоступен)
 *   - Уважение DNT: при Do Not Track загружаем только «necessary» без показа баннера
 *   - Версионирование + срок действия (180 дней) → повторный запрос после истечения/смены версии
 *   - Активирует отложенные ресурсы по категориям (script/link/iframe)
 *   - Генерирует событие 'vilana:consentChanged' для интеграций (например, GA)
 */
(function () {
  'use strict';

  // ===================== Konfiguration / Настройки =====================
  // [DE] Schlüssel im Storage, Version der Einwilligung, Gültigkeit in Tagen.
  // [RU] Ключ в хранилище, версия согласия, срок действия в днях.
  var LS_KEY = 'vilana_cookie_consent';
  var CONSENT_VERSION = '2026-06-23';
  var VALID_DAYS = 180;

  // [DE] Sprachwahl aus <html lang="…">, Standard 'de'.
  // [RU] Определение языка из <html lang="…">, по умолчанию 'de'.
  var HTML_LANG = (document.documentElement.getAttribute('lang') || 'de').toLowerCase();

  // ===================== I18N-Texte / Тексты ==========================
  // [DE] Texte für Banner (DE/RU); Fallback = DE.
  // [RU] Тексты для баннера (DE/RU); резерв = DE.
  var I18N_MAP = {
    de: {
      title: 'Cookies & Dienste',
      text: 'Wir verwenden notwendige Cookies für den Betrieb dieser Seite. Optionale Dienste (z. B. Analytics, externe Medien) werden nur mit Ihrer Zustimmung geladen.',
      summary: 'Einstellungen',
      nec: 'Notwendig', necDesc: 'Erforderlich für Grundfunktionen (immer aktiv).',
      func: 'Funktional', funcDesc: 'Komfortfunktionen und technische Darstellungen ohne Marketingzweck.',
      ana: 'Analytics',  anaDesc: 'Anonyme Reichweitenmessung.',
      mkt: 'Marketing',  mktDesc: 'Instagram/YouTube-Einbindungen, Pixel.',
      ext: 'Externe Medien', extDesc: 'Externe Inhalte wie Bewertungs-Widgets oder Karten werden erst nach Ihrer Einwilligung geladen.',
      btnEssential: 'Nur notwendige',
      btnSettings:  'Einstellungen',
      btnSave:      'Auswahl speichern',
      btnAll:       'Alle akzeptieren',
      changeLater:  'Sie können Ihre Auswahl später im Footer unter «Cookie-Einstellungen» ändern.',
      footerOpen:   'Cookie-Einstellungen'
    },
    ru: {
      title: 'Cookies и сервисы',
      text: 'Мы используем необходимые cookies для работы сайта. Дополнительные сервисы (например, аналитика, внешние медиа) загружаются только с вашего согласия.',
      summary: 'Настройки',
      nec: 'Необходимые', necDesc: 'Требуются для базовых функций (всегда активны).',
      func: 'Функциональные', funcDesc: 'Внешние шрифты, карты и т.п.',
      ana: 'Аналитика',  anaDesc: 'Анонимная статистика.',
      mkt: 'Маркетинг',  mktDesc: 'Встраивания Instagram/YouTube, пиксели.',
      ext: 'Внешние медиа', extDesc: 'Внешние элементы, например виджеты отзывов или карты, загружаются только после вашего согласия.',
      btnEssential: 'Только необходимые',
      btnSettings:  'Настройки',
      btnSave:      'Сохранить выбор',
      btnAll:       'Принять все',
      changeLater:  'Выбор можно изменить в футере по ссылке «Настройки cookies».',
      footerOpen:   'Настройки cookies'
    }
  };
  var I18N = I18N_MAP[HTML_LANG] || I18N_MAP.de;

  // ===================== Helpers / Вспомогательные =====================
  // [DE] Sicherer Storage: Fallback in Memory, wenn localStorage nicht nutzbar.
  // [RU] Безопасное хранение: резерв в памяти, если localStorage недоступен.
  var __MEM = null;
  function safeGet(key){ try{ return JSON.parse(localStorage.getItem(key)); } catch(_){ return __MEM; } }
  function safeSet(key, obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); __MEM = obj; } catch(_){ __MEM = obj; } }

 // [DE] Scroll sperren/freigeben, wenn Banner offen/zu.
// [RU] Блокировка/разблокировка прокрутки при открытии/закрытии баннера.
// ===== Scrollbar width cache (avoids forced reflow on open) =====
// [DE] Scrollbar-Breite einmal messen und bei Bedarf aktualisieren.
// [RU] Кешируем ширину скроллбара и обновляем при необходимости.
var __SBW = 0;
function updateScrollbarWidth() {
  // READ: может вызвать layout, поэтому вызываем ДО изменений DOM (см. openWall()).
  var w = window.innerWidth - document.documentElement.clientWidth;
  __SBW = (w > 0 ? w : 0);
}

// [DE] Öffnen ohne "WRITE -> READ".
// [RU] Открытие без "запись в DOM -> чтение геометрии".
var __OPEN_WALL_RAF = 0;
function openWall(wallEl) {
  // [DE] In den nächsten Frame verschieben, damit keine "forced reflow" Kette entsteht.
  // [RU] Переносим в следующий кадр, чтобы не было "принудительной компоновки".
  if (__OPEN_WALL_RAF) return;
  __OPEN_WALL_RAF = requestAnimationFrame(function () {
    __OPEN_WALL_RAF = 0;
    updateScrollbarWidth();            // READ (layout ok)
    wallEl.classList.remove('hidden'); // WRITE
    lockScroll(true);                  // WRITE (без чтений)
  });
}

function lockScroll(lock) {
  // ширина скроллбара (кеш) — без чтения геометрии здесь
  var sbw = __SBW;

  document.documentElement.classList.toggle('overflow-hidden', lock);
  document.body.classList.toggle('overflow-hidden', lock);

  // ✅ компенсация, чтобы страница не "дергалась" по ширине
  if (lock && sbw > 0) {
    document.body.style.paddingRight = sbw + 'px';
  } else {
    document.body.style.paddingRight = '';
  }
}


  // [DE] Zeit-/Ablauf-Helfer.
  // [RU] Вспомогательные функции времени/срока.
  function nowISO(){ return new Date().toISOString(); }
  function addDays(date, n){ var d=new Date(date); d.setDate(d.getDate()+n); return d; }
  function isExpired(rec){ return !rec || !rec.expiresAt || new Date(rec.expiresAt) < new Date(); }

  // [DE] GA-Cookies löschen bei Widerruf der Analytics-Einwilligung.
  // [RU] Удаляем GA-cookies при отзыве согласия на аналитику.
  function _deleteGaCookies() {
    var domains = [location.hostname, '.' + location.hostname];
    document.cookie.split(';').forEach(function (c) {
      var name = c.trim().split('=')[0];
      if (name === '_ga' || name.indexOf('_ga_') === 0) {
        domains.forEach(function (d) {
          document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + d;
        });
      }
    });
  }

  // [DE] CSP Nonce aus erstem <script[nonce]> übernehmen.
  // [RU] Переносим CSP nonce из первого <script[nonce]>.
  function getNonce(){ var s=document.querySelector('script[nonce]'); return s ? s.getAttribute('nonce') : null; }

  // [DE] Laden/Speichern der Einwilligung (mit Version & Ablaufdatum).
  // [RU] Загрузка/сохранение согласия (с версией и сроком действия).
  function loadConsent(){ return safeGet(LS_KEY) || null; }
  function saveConsent(consent) {
    var record = {
      version:    CONSENT_VERSION,
      givenAt:    nowISO(),
      expiresAt:  addDays(new Date(), VALID_DAYS).toISOString(),
      necessary:     true,
      functional:    !!consent.functional,
      analytics:     !!consent.analytics,
      marketing:     !!consent.marketing,
      externalMedia: !!consent.externalMedia,
      dnt:           !!consent.dnt
    };
    safeSet(LS_KEY, record);
    // [DE] GA-Disable-Flag VOR applyConsent setzen, damit Analytics nicht vor dem Flag lädt.
    // [RU] Флаг GA-disable устанавливаем ДО applyConsent, чтобы Analytics не загрузился раньше.
    window['ga-disable-G-YW71FCW4FJ'] = !record.analytics;
    if (!record.analytics) { _deleteGaCookies(); }
    applyConsent(record);
    // [DE] Event für Integrationen (z. B. GA/Tagging)
    // [RU] Событие для интеграций (например, GA/тегирование)
    window.dispatchEvent(new CustomEvent('vilana:consentChanged', { detail: { consent: record } }));
  }

  // ===================== Ressourcen anwenden / Применение ресурсов =====
  // [DE] Aktiviert verzögerte Ressourcen: <script[type="text/plain"]>, <link data-cookie-href>, <iframe data-cookie-src>.
  // [RU] Активирует отложенные ресурсы: <script[type="text/plain"]>, <link data-cookie-href>, <iframe data-cookie-src>.
  function applyConsent(consent) {
    if (!consent) return;
    var nonce = getNonce();

    // -- 1) Skripte (text/plain) --
    // [DE] Nur wenn Kategorie erlaubt ist, wird echtes <script> erzeugt.
    // [RU] Создаём реальный <script>, только если категория разрешена.
    document.querySelectorAll('script[type="text/plain"][data-cookie-category]').forEach(function (node) {
      var cat = node.getAttribute('data-cookie-category');
      if (cat && consent[cat] === true) {
        var nodeSrc = node.getAttribute('src') || '';
        if (nodeSrc && document.querySelector('script[src="' + nodeSrc + '"]:not([type="text/plain"])')) return;
        var s = document.createElement('script');
        for (var i = 0; i < node.attributes.length; i++) {
          var attr = node.attributes[i];
          if (attr.name !== 'type') s.setAttribute(attr.name, attr.value);
        }
        if (nonce && !s.hasAttribute('nonce')) s.setAttribute('nonce', nonce);
        s.text = node.text || node.textContent || '';
        node.parentNode.replaceChild(s, node);
      }
    });

    // -- 2) Links (data-cookie-href) --
    // [DE] Setzt href erst nach Zustimmung (z. B. Fonts/CDN).
    // [RU] Проставляем href только после согласия (напр., шрифты/CDN).
    document.querySelectorAll('link[data-cookie-category][data-cookie-href]').forEach(function (lnk) {
      var cat = lnk.getAttribute('data-cookie-category');
      if (cat && consent[cat] === true && !lnk.getAttribute('href')) {
        lnk.setAttribute('href', lnk.getAttribute('data-cookie-href'));
      }
    });

    // -- 3) Iframes (data-cookie-src) --
    // [DE] Medien/Marketing erst nach Zustimmung laden.
    // [RU] Медиа/маркетинг загружаем только после согласия.
    document.querySelectorAll('iframe[data-cookie-category][data-cookie-src]').forEach(function (ifr) {
      var cat = ifr.getAttribute('data-cookie-category');
      if (cat && consent[cat] === true && !ifr.getAttribute('src')) {
        ifr.setAttribute('src', ifr.getAttribute('data-cookie-src'));
      }
    });

    // -- 4) Externe Medien-Widgets (data-external-widget) --
    // [DE] Widget laden oder auf Fallback zurücksetzen je nach Einwilligung.
    // [RU] Загружаем виджет или восстанавливаем fallback в зависимости от согласия.
    if (consent.externalMedia === true) {
      initExternalMediaWidgets();
    } else {
      restoreExternalMediaWidgets();
    }
  }

  // ===================== Externe Medien / Внешние медиа ================
  // [DE] Jotform-Reviews-Widget nach Einwilligung dynamisch in den Container laden.
  // [RU] Динамически загружаем виджет Jotform Reviews после согласия.
  function loadJotformReviewsWidget(container) {
    var src = container.getAttribute('data-jotform-src');
    if (!src) return; // Kein Embed-Src konfiguriert / Embed-Src не задан
    var widgetId = container.getAttribute('data-jotform-widget-id');
    container.innerHTML = '';
    // [DE] Jotform erwartet ein Ziel-Div mit spezifischer ID, dann ein Script.
    // [RU] Jotform ожидает целевой div с конкретным ID, затем скрипт.
    if (widgetId) {
      var widgetDiv = document.createElement('div');
      widgetDiv.id = 'JFWebsiteWidget-' + widgetId;
      container.appendChild(widgetDiv);
    }
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    container.appendChild(script);
  }

  function loadExternalWidget(container) {
    var widgetType = container.getAttribute('data-external-widget');
    if (widgetType === 'jotform-reviews') {
      loadJotformReviewsWidget(container);
    }
  }

  // [DE] Alle Externe-Medien-Container laden, die noch nicht geladen wurden.
  // [RU] Загружаем все контейнеры внешних медиа, которые ещё не загружены.
  function initExternalMediaWidgets() {
    document.querySelectorAll('[data-external-widget]:not([data-widget-loaded])').forEach(function (container) {
      if (!container.getAttribute('data-original-html')) {
        container.setAttribute('data-original-html', container.innerHTML);
      }
      container.setAttribute('data-widget-loaded', 'true');
      loadExternalWidget(container);
    });
  }

  // [DE] Alle geladenen Widgets auf Fallback zurücksetzen (z. B. nach Widerruf).
  // [RU] Восстанавливаем fallback всех загруженных виджетов (напр. при отзыве согласия).
  function restoreExternalMediaWidgets() {
    document.querySelectorAll('[data-external-widget][data-widget-loaded]').forEach(function (container) {
      var orig = container.getAttribute('data-original-html');
      if (orig !== null) {
        container.innerHTML = orig;
        container.removeAttribute('data-widget-loaded');
      }
    });
  }

  // ===================== UI / Интерфейс ================================
  // [DE] UI als String (Tailwind-Klassen; besser in Tailwind safelisten!).
  // [RU] UI как строка (классы Tailwind; добавь в safelist Tailwind!).
  function buildWallHTML() {
    return '' +
    '<div id="cookie-wall" class="fixed inset-0 z-[100] hidden">' +
    '  <div class="absolute inset-0 bg-black/50" aria-hidden="true"></div>' +
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
    '            <label class="flex items-start gap-3">' +
    '              <input id="cw-externalMedia" type="checkbox" class="mt-1">' +
    '              <span class="text-sm"><span id="cw-cat-ext" class="font-medium"></span><br><span id="cw-cat-ext-desc" class="text-gray-600"></span></span>' +
    '            </label>' +
    '          </div>' +
    '        </details>' +
    '        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
    '          <button id="cw-essential" class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-settings"  class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-save"      class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '          <button id="cw-accept"    class="rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"></button>' +
    '        </div>' +
    '        <p id="cw-change-later" class="text-xs text-gray-500"></p>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>';
  }

  // [DE] Footer-Link «Cookie-Einstellungen» anlegen (falls kein <footer> → body).
  // [RU] Создаём ссылку «Cookie-Einstellungen» в футере (если его нет — в body).
  function ensureFooterLink() {
    var existing = document.getElementById('cookie-reopen');
    if (existing) return existing;
    var mountAt = document.querySelector('footer') || document.body;
    if (!mountAt) return null;
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="text-center text-sm text-gray-500 mt-6">' +
      '  <a href="#" id="cookie-reopen" class="underline">' + I18N.footerOpen + '</a>' +
      '</div>';
    mountAt.appendChild(wrapper.firstChild);
    return document.getElementById('cookie-reopen');
  }

  // [DE] Texte ins UI schreiben.
  // [RU] Заполняем UI текстами.
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
    document.getElementById('cw-cat-ext').textContent = I18N.ext;
    document.getElementById('cw-cat-ext-desc').textContent = I18N.extDesc;
    document.getElementById('cw-essential').textContent = I18N.btnEssential;
    document.getElementById('cw-settings').textContent = I18N.btnSettings;
    document.getElementById('cw-save').textContent = I18N.btnSave;
    document.getElementById('cw-accept').textContent = I18N.btnAll;
    document.getElementById('cw-change-later').textContent = I18N.changeLater;
  }

  // ===================== Init / Инициализация ==========================
  document.addEventListener('DOMContentLoaded', function () {
    // [DE] UI einfügen / [RU] Вставляем UI
    var container = document.createElement('div');
    container.innerHTML = buildWallHTML();
    document.body.appendChild(container.firstChild);

    // [DE] Footer-Link sicherstellen / [RU] Создаём ссылку в футере
    var reopenLink = ensureFooterLink();

    // [DE] Texte ins UI / [RU] Заполняем тексты
    fillTexts();

    // [DE] Refs / [RU] Ссылки на элементы
    var wall         = document.getElementById('cookie-wall');
    var details      = document.getElementById('cw-details');
    var btnEssential = document.getElementById('cw-essential');
    var btnSettings  = document.getElementById('cw-settings');
    var btnSave      = document.getElementById('cw-save');
    var btnAccept    = document.getElementById('cw-accept');
    var cbFunctional    = document.getElementById('cw-functional');
    var cbAnalytics     = document.getElementById('cw-analytics');
    var cbMarketing     = document.getElementById('cw-marketing');
    var cbExternalMedia = document.getElementById('cw-externalMedia');

    // [DE] DNT: Wenn aktiv und keine Einwilligung vorhanden → nur necessary, ohne Banner.
    // [RU] DNT: если включён и согласия нет → только necessary, баннер не показываем.
    var DNT = (navigator.doNotTrack === '1' || window.doNotTrack === '1');

    // [DE] Einwilligung laden / [RU] Загружаем согласие
    var existing = loadConsent();
    var needPrompt = !existing || existing.version !== CONSENT_VERSION || isExpired(existing);

    if (DNT && !existing) {
      saveConsent({ functional:false, analytics:false, marketing:false, externalMedia:false, dnt:true });
      // [DE] Kein Banner anzeigen / [RU] Баннер не показываем
    } else if (needPrompt) {
      openWall(wall);
    } else {
      // [DE] Checkboxen aus gespeicherter Auswahl setzen + Ressourcen anwenden
      // [RU] Устанавливаем чекбоксы по сохранённому выбору + применяем ресурсы
      cbFunctional.checked    = !!existing.functional;
      cbAnalytics.checked     = !!existing.analytics;
      cbMarketing.checked     = !!existing.marketing;
      cbExternalMedia.checked = !!existing.externalMedia;
      applyConsent(existing);
    }

    // ---------------- Aktionen / Действия ----------------
    // [DE] Nur notwendige / [RU] Только необходимые
    btnEssential.addEventListener('click', function () {
      var consent = { functional:false, analytics:false, marketing:false, externalMedia:false };
      saveConsent(consent);
      wall.classList.add('hidden'); lockScroll(false);
    });

    // [DE] Alle akzeptieren / [RU] Принять все
    btnAccept.addEventListener('click', function () {
      var consent = { functional:true, analytics:true, marketing:true, externalMedia:true };
      saveConsent(consent);
      wall.classList.add('hidden'); lockScroll(false);
    });

    // [DE] Einstellungen öffnen / [RU] Открыть настройки
    btnSettings.addEventListener('click', function () {
      if (details && !details.open) details.open = true;
    });

    // [DE] Auswahl speichern / [RU] Сохранить выбор
    btnSave.addEventListener('click', function () {
      var consent = {
        functional:    !!cbFunctional.checked,
        analytics:     !!cbAnalytics.checked,
        marketing:     !!cbMarketing.checked,
        externalMedia: !!cbExternalMedia.checked
      };
      saveConsent(consent);
      wall.classList.add('hidden'); lockScroll(false);
    });

    // [DE] Link im Footer: Banner erneut öffnen / [RU] Ссылка в футере: открыть баннер
    if (reopenLink) {
      reopenLink.addEventListener('click', function (e) {
        e.preventDefault();
        var c = loadConsent() || { necessary:true, functional:false, analytics:false, marketing:false, externalMedia:false };
        cbFunctional.checked    = !!c.functional;
        cbAnalytics.checked     = !!c.analytics;
        cbMarketing.checked     = !!c.marketing;
        cbExternalMedia.checked = !!c.externalMedia;
        openWall(wall);
      });
    }

    // [DE] data-open-cookie-settings: Banner öffnen ohne direkt Jotform zu laden.
    // [RU] data-open-cookie-settings: открывает баннер, не загружая Jotform напрямую.
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-open-cookie-settings]');
      if (!btn) return;
      e.preventDefault();
      var c = loadConsent() || { necessary:true, functional:false, analytics:false, marketing:false, externalMedia:false };
      cbFunctional.checked    = !!c.functional;
      cbAnalytics.checked     = !!c.analytics;
      cbMarketing.checked     = !!c.marketing;
      cbExternalMedia.checked = !!c.externalMedia;
      openWall(wall);
    });

    // [DE] Öffentliche API / [RU] Публичный API
    window.VilanaCookie = {
      open:                    function () { openWall(wall); },
      reset:                   function () { try{ localStorage.removeItem(LS_KEY); }catch(_){ __MEM=null; } openWall(wall); },
      get:                     loadConsent,
      initExternalMedia:       initExternalMediaWidgets,
      loadJotformReviews:      loadJotformReviewsWidget,
      restoreExternalMedia:    restoreExternalMediaWidgets
    };
  });
})();

