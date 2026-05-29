"use strict";

/**
 * Vilana Contact Form (RU) — v3
 * - Mode picker: Быстрый запрос / Заказ кейтеринга (3 шага)
 * - Шаг 1: Событие | Шаг 2: Меню + Опции | Шаг 3: Обзор
 * - Дата: мин. сегодня + 3 дня
 * - Гости: inline-валидация
 * - Wizard сохраняет данные при закрытии/открытии
 * - Summary: карточки с тегами блюд
 * - EmailJS sendForm
 * - Anti-spam: honeypot + 3s timing
 */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
      Helpers
  ========================================================= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const show   = el => el && el.classList.remove("hidden");
  const hide   = el => el && el.classList.add("hidden");
  const toggle = (el, on) => el && el.classList.toggle("hidden", !on);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  }

  function bodyLock(lock) {
    document.documentElement.classList.toggle("v-noscroll", !!lock);
    document.body.classList.toggle("v-noscroll", !!lock);
  }

  // Footer year
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
      Toast
  ========================================================= */
  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    show(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hide(toastEl), 1800);
  }
  hide(toastEl);

  /* =========================================================
      Burger menu
  ========================================================= */
  const btnBurger  = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  if (btnBurger && mobileMenu) {
    const setOpen = open => {
      mobileMenu.classList.toggle("hidden", !open);
      btnBurger.setAttribute("aria-expanded", String(open));
    };
    btnBurger.addEventListener("click", e => { e.stopPropagation(); setOpen(mobileMenu.classList.contains("hidden")); });
    document.addEventListener("click", e => {
      if (!mobileMenu.classList.contains("hidden") &&
          !mobileMenu.contains(e.target) && !btnBurger.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    $$("a", mobileMenu).forEach(a => a.addEventListener("click", () => setOpen(false)));
  }

  /* =========================================================
      Anti-bot timing
  ========================================================= */
  const startedAt = $("#cf_started_at");
  if (startedAt) startedAt.value = String(Date.now());

  /* =========================================================
      Form refs
  ========================================================= */
  const form = $("#contactForm");
  if (!form) return;

  const quickMessage = $("#cf_message");
  const email        = $("#email");
  const privacy      = $("#cf-privacy");
  const nameInput    = $("#name");
  const phoneInput   = $("#cf-phone");

  const wizardWrap      = $("#wizardWrap");
  const btnToggleWizard = $("#btnToggleWizard");
  const btnCloseWizard  = $("#btnCloseWizard");
  const btnBack         = $("#btnBack");
  const btnNext         = $("#btnNext");
  const btnQuickSend    = $("#btnQuickSend");
  const btnWizardSend   = $("#btnWizardSend");

  const fromNameHidden   = $("#from_name_hidden");
  const replyToHidden    = $("#reply_to_hidden");
  const subjectHidden    = $("#subject_hidden");
  const msgHidden        = $("#cf-message-hidden");
  const menuSelectedText = $("#menuSelectedText");
  const menuModeHidden   = $("#menuModeHidden");

  const modeCardQuick = $("#modeCardQuick");
  const modeCardFull  = $("#modeCardFull");

  // EmailJS config (из data-атрибутов или дефолт)
  const EMAILJS_PUBLIC_KEY  = form.dataset.emailjsPublicKey  || "vfmomNKrMxrf2xqDW";
  const EMAILJS_TEMPLATE_ID = form.dataset.emailjsTemplateId || "template_fuxgrlb";
  const EMAILJS_SERVICE_ID  = form.dataset.emailjsServiceId  || "service_75biswm";

  /* =========================================================
      Дата — мин. сегодня + 3 дня
  ========================================================= */
  const dateInput = $("#cf-date");
  if (dateInput) {
    const minD = new Date();
    minD.setDate(minD.getDate() + 3);
    dateInput.min = minD.toISOString().split("T")[0];
  }

  /* =========================================================
      Гости — inline валидация
  ========================================================= */
  const guestsInput = $("#cf-guests");
  const guestErr    = $("#guestErr");
  const guestOk     = $("#guestOk");

  function checkGuests() {
    if (!guestsInput) return;
    const v = parseInt(guestsInput.value, 10);
    if (!guestsInput.value) {
      hide(guestErr); hide(guestOk);
      guestsInput.classList.remove("field-error");
      return;
    }
    if (v < 20) {
      show(guestErr); hide(guestOk);
      guestsInput.classList.add("field-error");
    } else {
      hide(guestErr); show(guestOk);
      guestsInput.classList.remove("field-error");
    }
  }
  if (guestsInput) guestsInput.addEventListener("input", checkGuests);

  /* =========================================================
      Опции — показать/скрыть детали
  ========================================================= */
  const optService     = $("#opt_service");
  const serviceDetails = $("#serviceDetails");
  const optCleanup     = $("#opt_cleanup");
  const cleanupDetails = $("#cleanupDetails");

  function syncService() { toggle(serviceDetails, optService && optService.checked); }
  function syncCleanup() { toggle(cleanupDetails, optCleanup && optCleanup.checked); }
  if (optService) optService.addEventListener("change", syncService);
  if (optCleanup) optCleanup.addEventListener("change", syncCleanup);
  syncService(); syncCleanup();

  /* =========================================================
      Mode Picker
  ========================================================= */
  let currentMode = "quick";

  function setMode(mode) {
    currentMode = mode;

    if (modeCardQuick) {
      modeCardQuick.classList.toggle("cf-mode-card--active", mode === "quick");
      modeCardQuick.setAttribute("aria-pressed", String(mode === "quick"));
    }
    if (modeCardFull) {
      modeCardFull.classList.toggle("cf-mode-card--active", mode === "full");
      modeCardFull.setAttribute("aria-pressed", String(mode === "full"));
    }

    toggle(wizardWrap, mode === "full");
    toggle(btnQuickSend, mode === "quick");

    if (btnToggleWizard) {
      btnToggleWizard.textContent = mode === "full"
        ? "К быстрому запросу"
        : "Заказ кейтеринга (подробно)";
    }

    if (mode === "full") showStep(currentStep);
  }

  if (modeCardQuick) modeCardQuick.addEventListener("click", () => setMode("quick"));
  if (modeCardFull)  modeCardFull.addEventListener("click",  () => setMode("full"));
  if (btnToggleWizard) btnToggleWizard.addEventListener("click", () => {
    setMode(currentMode === "quick" ? "full" : "quick");
  });
  if (btnCloseWizard) btnCloseWizard.addEventListener("click", () => {
    if (hasWizardData() && !confirm("Введённые данные будут сброшены. Закрыть?")) return;
    setMode("quick");
  });

  function hasWizardData() {
    const type   = $("#cf-eventType");
    const guests = $("#cf-guests");
    const date   = $("#cf-date");
    return (type && type.value) || (guests && guests.value) || (date && date.value);
  }

  /* =========================================================
      Wizard — 3 шага
  ========================================================= */
  const TOTAL_STEPS = 3;
  const stepPanels  = wizardWrap ? $$("[data-step]", wizardWrap) : [];
  const stepTabs    = [$("#stepTab1"), $("#stepTab2"), $("#stepTab3")];
  const STEP_NAMES  = ["Событие", "Меню и опции", "Обзор"];
  const STEP_PCTS   = ["33%", "66%", "100%"];

  let currentStep = 1;

  function showStep(n) {
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));

    stepPanels.forEach(p => {
      p.classList.toggle("hidden", Number(p.getAttribute("data-step")) !== currentStep);
    });

    stepTabs.forEach((tab, i) => {
      if (!tab) return;
      const sn = i + 1;
      tab.classList.remove("cf-step--active", "cf-step--done");
      if (sn < currentStep) tab.classList.add("cf-step--done");
      if (sn === currentStep) { tab.classList.add("cf-step--active"); tab.setAttribute("aria-current", "step"); }
      else tab.removeAttribute("aria-current");
    });

    const fillEl = $("#wizProgressFill");
    if (fillEl) {
      fillEl.style.width = STEP_PCTS[currentStep - 1];
      const pb = fillEl.closest("[role='progressbar']");
      if (pb) pb.setAttribute("aria-valuenow", Math.round(parseInt(STEP_PCTS[currentStep - 1])));
    }
    const stepLabel = $("#wiz-step-label");
    const stepName  = $("#wiz-step-name");
    if (stepLabel) stepLabel.textContent = `Шаг ${currentStep} из ${TOTAL_STEPS}`;
    if (stepName)  stepName.textContent  = STEP_NAMES[currentStep - 1];

    toggle(btnBack, currentStep > 1);
    const isLast = currentStep === TOTAL_STEPS;
    if (btnNext)       toggle(btnNext, !isLast);
    if (btnWizardSend) toggle(btnWizardSend, isLast);

    if (currentStep === TOTAL_STEPS) fillSummary();
  }

  if (btnBack) btnBack.addEventListener("click", () => showStep(currentStep - 1));
  if (btnNext) btnNext.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
  });

  $$("[data-goto]", form).forEach(btn => {
    btn.addEventListener("click", () => showStep(Number(btn.getAttribute("data-goto"))));
  });

  /* =========================================================
      Summary — заполнение карточек
  ========================================================= */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function fillSummary() {
    // Событие
    const eventType = getVal("cf-eventType");
    const guests    = getVal("cf-guests");
    const date      = getVal("cf-date");
    const time      = getVal("cf-time");
    const plz       = getVal("cf-plz");
    const street    = getVal("cf-street");

    const eventParts = [eventType || "—", guests ? `${guests} гостей` : null].filter(Boolean).join(" · ");
    const datePart   = [date, time].filter(Boolean).join(", ");
    const locPart    = [plz, street].filter(Boolean).join(", ");

    const sumEventEl = $("#sumEventVal");
    if (sumEventEl) sumEventEl.innerHTML =
      `<strong>${esc(eventParts)}</strong>` +
      (datePart ? `<br><small>${esc(datePart)}</small>` : "") +
      (locPart  ? `<br><small>${esc(locPart)}</small>`  : "");

    // Меню
    const format    = form.querySelector('input[name="service_format"]:checked')?.value || "—";
    const prefs     = $$('input[name^="pref_"]:checked', form)
      .map(cb => cb.closest("label")?.querySelector("span")?.textContent).filter(Boolean);
    const allergies = getVal("cf-allergies");

    // Теги блюд
    const dishEntries = Object.values(selected);
    let dishesHtml = "";
    if (dishEntries.length) {
      const grouped = {};
      dishEntries.forEach(d => {
        if (!grouped[d.catKey]) grouped[d.catKey] = [];
        grouped[d.catKey].push(d.name);
      });
      const tagItems = [];
      MENU.forEach(cat => (grouped[cat.key] || []).forEach(name => tagItems.push(name)));
      dishesHtml = `<div class="cf-summary__dishes">` +
        tagItems.map(n => `<span class="cf-summary__dish-tag">${esc(n)}</span>`).join("") +
        `</div>`;
    } else {
      dishesHtml = `<small>Блюда: Vilana предложит</small>`;
    }

    const menuParts = [
      `Формат: ${esc(format)}`,
      prefs.length ? `Предпочтения: ${esc(prefs.join(", "))}` : null,
      allergies ? `Аллергены: ${esc(allergies)}` : null,
    ].filter(Boolean);

    const sumMenuEl = $("#sumMenuVal");
    if (sumMenuEl) sumMenuEl.innerHTML =
      menuParts.join("<br>") + (menuParts.length ? "<br>" : "") + dishesHtml;

    // Опции
    const opts = [];
    if (form.querySelector('input[name="opt_geschirr"]')?.checked) opts.push("Посуда / приборы / бокалы");
    if (optService?.checked) {
      const cnt  = getVal("cf-service-count");
      const from = getVal("cf-service-from");
      const to   = getVal("cf-service-to");
      let svc    = "Персонал";
      if (cnt)        svc += ` (${cnt} чел.)`;
      if (from || to) svc += ` ${from}–${to}`;
      opts.push(svc);
    }
    if (optCleanup?.checked) opts.push("Разбор и уборка");

    const sumOptsEl = $("#sumOptionsVal");
    if (sumOptsEl) sumOptsEl.innerHTML = opts.length
      ? opts.map(o => esc(o)).join("<br>")
      : "Без дополнительных услуг";

    // Контакт
    const n = (nameInput?.value || "").trim() || "—";
    const e = (email?.value    || "").trim() || "—";
    const p = (phoneInput?.value || "").trim();
    const sumContactEl = $("#sumContactVal");
    if (sumContactEl) sumContactEl.innerHTML =
      `${esc(n)}<br>${esc(e)}${p ? `<br>${esc(p)}` : ""}`;
  }

  /* =========================================================
      Валидация шагов
  ========================================================= */
  function validateStep(n) {
    const panel = stepPanels.find(p => Number(p.getAttribute("data-step")) === n);
    if (!panel) return true;

    const required = $$("input[required], select[required], textarea[required]", panel)
      .filter(el => !el.disabled && !el.closest(".hidden-field"));

    for (const el of required) {
      el.setCustomValidity("");
      if (el.id === "cf-guests" || el.name === "guests") {
        const v = parseInt(el.value || "0", 10);
        if (!el.value) el.setCustomValidity("Укажите количество гостей (мин. 20).");
        else if (v < 20) el.setCustomValidity("Минимальный заказ: от 20 человек.");
      }
      if (!el.checkValidity()) {
        el.classList.add("field-error");
        el.focus();
        el.reportValidity();
        return false;
      }
      el.classList.remove("field-error");
    }
    return true;
  }

  function validateBase() {
    if (!quickMessage || !quickMessage.value.trim()) {
      quickMessage?.classList.add("field-error");
      quickMessage?.focus();
      toast("Заполните сообщение.");
      return false;
    }
    quickMessage.classList.remove("field-error");

    if (!email || !email.value.trim()) {
      email?.classList.add("field-error");
      email?.focus();
      toast("Укажите E-Mail.");
      return false;
    }
    if (!email.checkValidity()) {
      email.classList.add("field-error");
      email.focus();
      email.reportValidity();
      return false;
    }
    email.classList.remove("field-error");

    if (privacy && !privacy.checked) {
      toast("Примите политику конфиденциальности.");
      privacy.focus();
      return false;
    }
    return true;
  }

  /* =========================================================
      Тело письма
  ========================================================= */
  function buildEmailBody() {
    const message    = getVal("cf_message");
    const finalName  = (nameInput?.value || "").trim()  || "Запрос с сайта";
    const finalEmail = (email?.value     || "").trim()  || "—";
    const finalPhone = (phoneInput?.value || "").trim() || "—";

    const eventType = getVal("cf-eventType");
    const guests    = getVal("cf-guests");
    const date      = getVal("cf-date");
    const time      = getVal("cf-time");
    const plz       = getVal("cf-plz");
    const street    = getVal("cf-street");
    const location  = [plz, street].filter(Boolean).join(", ") || "—";

    const format    = form.querySelector('input[name="service_format"]:checked')?.value || "—";
    const prefs     = $$('input[name^="pref_"]:checked', form)
      .map(cb => cb.closest("label")?.querySelector("span")?.textContent).filter(Boolean).join(", ") || "—";
    const allergies = getVal("cf-allergies") || "—";
    const menuMode  = (menuModeHidden?.value || "").trim() || "—";
    const selectedTxt = (menuSelectedText?.value || "—").trim();

    const optGeschirr = form.querySelector('input[name="opt_geschirr"]')?.checked ? "Да" : "Нет";
    const optSvc      = optService?.checked ? "Да" : "Нет";
    const optCleanupV = optCleanup?.checked  ? "Да" : "Нет";

    return `=== VILANA ЗАПРОС ===

[СООБЩЕНИЕ]
${message}

[КОНТАКТ]
Имя:      ${finalName}
E-Mail:   ${finalEmail}
Телефон:  ${finalPhone}

[СОБЫТИЕ]
Тип:      ${eventType || "—"}
Гостей:   ${guests || "—"}
Дата:     ${date ? date + (time ? " " + time : "") : "—"}
Место:    ${location}

[ВКЛЮЧЕНО]
- Доставка
- Установка буфета

[МЕНЮ]
Формат:         ${format}
Предпочтения:   ${prefs}
Аллергены:      ${allergies}
Режим меню:     ${menuMode}
Выбор блюд:
${selectedTxt}

[ОПЦИИ]
Посуда / приборы / бокалы: ${optGeschirr}
Персонал:                  ${optSvc}
Разбор и уборка:           ${optCleanupV}

=== КОНЕЦ ===`;
  }

  /* =========================================================
      EmailJS
  ========================================================= */
  if (window.emailjs) {
    try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch (_) {}
  }

  /* =========================================================
      Submit
  ========================================================= */
  let sending = false;

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (sending) return;

    if (form.honeypot && form.honeypot.value) return;

    const t0 = Number(startedAt?.value || "0");
    if (t0 && Date.now() - t0 < 3000) return;

    if (!validateBase()) return;
    if (currentMode === "full" && !validateStep(1)) return;

    const body       = buildEmailBody();
    const finalName  = (nameInput?.value || "").trim() || "Запрос с сайта";
    const finalEmail = (email?.value     || "").trim() || "";
    const eventType  = getVal("cf-eventType");
    const date       = getVal("cf-date");

    const subject = currentMode === "full"
      ? `Vilana: ${eventType || "Событие"} (${date || "дата открыта"})`
      : "Vilana: Быстрый запрос";

    if (fromNameHidden) fromNameHidden.value = finalName;
    if (replyToHidden)  replyToHidden.value  = finalEmail;
    if (subjectHidden)  subjectHidden.value  = subject;
    if (msgHidden)      msgHidden.value      = body;

    if (!window.emailjs?.sendForm) {
      alert("EmailJS не загружен. Проверьте интернет / блокировщик.");
      return;
    }

    sending = true;
    $$('button[type="submit"]', form).forEach(b => { b.disabled = true; });

    emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form, { publicKey: EMAILJS_PUBLIC_KEY })
      .then(() => {
        const okMsg = currentMode === "full" ? $("#formMsgWizard") : $("#formMsg");
        if (okMsg) show(okMsg);
        toast("Отправлено ✓");

        form.reset();
        if (startedAt) startedAt.value = String(Date.now());
        for (const k of Object.keys(selected)) delete selected[k];
        activeCatKey = MENU[0]?.key || "warm";
        updateMenuHiddenFields();
        const tagsEl = $("#menuRowTags");
        if (tagsEl) tagsEl.innerHTML = "";
        if (menuModal && !menuModal.classList.contains("hidden")) closeMenuSheet();
        syncService(); syncCleanup();
        checkGuests();
        if (currentMode === "full") {
          setTimeout(() => {
            hide($("#formMsgWizard"));
            setMode("quick");
            currentStep = 1;
          }, 3000);
        }
      })
      .catch(err => {
        alert("Ошибка отправки: " + (err?.text || String(err)));
      })
      .finally(() => {
        sending = false;
        $$('button[type="submit"]', form).forEach(b => { b.disabled = false; });
      });
  });

  /* =========================================================
      МЕНЮ — данные (RU)
  ========================================================= */
  const MENU = [
    { key: "warm", title: "Горячие блюда", items: [
      { id: "warm_01", name: "Шашлык",                              desc: "Индейка, свинина или баранина — маринованный и на гриле." },
      { id: "warm_02", name: "Фаршированный перец",                  desc: "С мясной начинкой или вегетарианский вариант." },
      { id: "warm_03", name: "Говяжий ростбиф (томлёный)",           desc: "Нежно тушёное мясо с классическим соусом." },
      { id: "warm_04", name: "Бараньи котлетки",                     desc: "С розмариновым картофелем и фасолью в беконе." },
      { id: "warm_05", name: "Голубцы",                              desc: "Мясо-рисовая начинка в томатном соусе." },
      { id: "warm_06", name: "Куриные шницели (хрустящие)",          desc: "Классическая панировка, золотистая корочка." },
      { id: "warm_07", name: "Куриная грудка в грибном соусе",       desc: "Нежное филе в сливочно-шампиньонном соусе." },
      { id: "warm_08", name: "Кёфте / фрикадельки",                 desc: "Восточная или классическая версия специй." },
      { id: "warm_09", name: "Плов",                                 desc: "Рис с морковью и мясом." },
      { id: "warm_10", name: "Касселер с квашеной капустой",         desc: "Сытно и традиционно." },
      { id: "warm_11", name: "Куриные рулетики со шпинатом",         desc: "С соусом беарнез — сытно и изысканно." },
      { id: "warm_12", name: "Утиная грудка с апельсиновым соусом",  desc: "Фруктово-изысканный вариант для особых случаев." },
      { id: "warm_13", name: "Картофельный гратен / пюре",           desc: "Классические гарниры." },
      { id: "warm_14", name: "Лапша с овощами (веган)",              desc: "Лёгкая обжарка, свежо и ароматно." },
      { id: "warm_15", name: "Кальмары фритюр",                      desc: "Хрустящие и нежные, с соусом." },
      { id: "warm_16", name: "Креветки на гриле",                    desc: "Ароматный маринад, лёгкая прожарка." },
      { id: "warm_17", name: "Фасоль в беконе",                      desc: "Сытно и ароматно." },
      { id: "warm_18", name: "Рис или шпецле",                       desc: "Гарнир к мясу/рыбе." },
      { id: "warm_19", name: "Овощи гриль (средиземноморские)",      desc: "Оливковое масло, травы." },
      { id: "warm_20", name: "Овощи под соусом голландез",           desc: "Нежно и кремово." },
      { id: "warm_21", name: "Лосось в сливочно-травяном соусе",     desc: "Нежное филе в кремовом соусе." },
      { id: "warm_22", name: "Филе судака в укропном соусе",         desc: "Мягкая подача в укропно-сливочном соусе." },
    ]},
    { key: "cold", title: "Холодные блюда / ассорти", items: [
      { id: "cold_01", name: "Баклажаны слоями с томатами",          desc: "Ароматная маринадная подача слоями." },
      { id: "cold_02", name: "Томаты–моцарелла",                     desc: "Классика с базиликом и бальзамиком." },
      { id: "cold_03", name: "Сурими",                               desc: "Свежая подача или в виде закусок." },
      { id: "cold_04", name: "Сурими в хрустящей панировке",         desc: "Хрустящая оболочка, нежная начинка." },
      { id: "cold_05", name: "Фаршированные яйца",                   desc: "Домашняя начинка, нежный вкус." },
      { id: "cold_06", name: "Креветки в картофельной «паутинке»",   desc: "Хрустящая, эффектная подача." },
      { id: "cold_07", name: "Антипасти (вариации)",                 desc: "Средиземноморский микс овощей и сыра." },
      { id: "cold_08", name: "Сарма (долма в виноградных листьях)",  desc: "Мягкие специи, по желанию — веган." },
      { id: "cold_09", name: "Суши (вариации)",                      desc: "Свежая и креативная подача." },
      { id: "cold_10", name: "Багет с лососем",                      desc: "С укропом и кремом." },
      { id: "cold_11", name: "Авокадо-крем / хумус",                 desc: "Нежные дипы, идеально для старта." },
      { id: "cold_12", name: "Креветочный крем",                     desc: "Как намазка или дип." },
      { id: "cold_13", name: "Канапе (закуски)",                     desc: "Элегантные мини-закуски." },
      { id: "cold_14", name: "Рыбная тарелка",                       desc: "Масляная рыба, лосось, сельдь, скумбрия." },
      { id: "cold_15", name: "Сырно-мясная тарелка",                 desc: "Подборка сыров и ветчинных деликатесов." },
    ]},
    { key: "salad", title: "Салаты", items: [
      { id: "salad_01", name: "Грибной салат",                       desc: "Маринованные шампиньоны и лук." },
      { id: "salad_02", name: "Морковный салат",                     desc: "Свежая морковь, яблоко или чеснок." },
      { id: "salad_03", name: "Крабовый салат",                      desc: "С майонезом и овощами." },
      { id: "salad_04", name: "Летний салат",                        desc: "Огурец, томат, перец — легко и свежо." },
      { id: "salad_05", name: "Руккола",                             desc: "С пармезаном и бальзамиком." },
      { id: "salad_06", name: "Салат из китайской капусты",          desc: "Хрустящий, лёгкий, йогурт/уксус." },
      { id: "salad_07", name: "Салат из молодой капусты с фисташками", desc: "Тонкая нарезка, ореховый акцент." },
      { id: "salad_08", name: "Греческий салат",                     desc: "Фета, огурцы, томаты, оливки." },
      { id: "salad_09", name: "Томаты с оливками",                   desc: "С красным луком и зеленью." },
      { id: "salad_10", name: "Салат с гранатом",                    desc: "Овощи с фруктовой нотой." },
      { id: "salad_11", name: "Селёдка под шубой",                   desc: "Традиционный салат." },
      { id: "salad_12", name: "Оливье",                              desc: "Классика: горошек, яйцо, майонез." },
      { id: "salad_13", name: "Винегрет",                            desc: "Свёкла и овощной микс." },
    ]},
    { key: "dessert", title: "Десерты", items: [
      { id: "dessert_01", name: "Десерт с профитролями",             desc: "С ванильным кремом и сливками." },
      { id: "dessert_02", name: "Десерт Lotus",                      desc: "Нежный крем с карамельным печеньем." },
      { id: "dessert_03", name: "Мусс шоколадный",                   desc: "Воздушный шоколадный крем." },
      { id: "dessert_04", name: "Панна-котта",                       desc: "Классика с фруктовым соусом." },
      { id: "dessert_05", name: "Тирамису",                          desc: "Маскарпоне, кофе, какао." },
      { id: "dessert_06", name: "Фрукты в шоколаде",                 desc: "Свежие фрукты с шоколадом." },
      { id: "dessert_07", name: "Печенье-десерт с виноградом",       desc: "Хруст и крем — сбалансированно." },
    ]},
    { key: "candy", title: "Сладкий стол", items: [
      { id: "candy_01", name: "Донатсы",                             desc: "Яркий декор." },
      { id: "candy_02", name: "Кейк-попсы",                         desc: "Мини-кейк на палочке." },
      { id: "candy_03", name: "Капкейки",                            desc: "С кремовой шапкой." },
      { id: "candy_04", name: "Попкорн",                             desc: "Сладкий или солёный." },
      { id: "candy_05", name: "Мармелад (мишки)",                    desc: "Для маленьких и взрослых." },
      { id: "candy_06", name: "Мармеладные шнуры",                   desc: "Разноцветная классика." },
      { id: "candy_07", name: "Жевательный мармелад",                desc: "Фруктовый микс." },
      { id: "candy_08", name: "Шоколад",                             desc: "Белый, молочный, тёмный." },
    ]},
  ];

  /* =========================================================
      МЕНЮ — состояние и элементы
  ========================================================= */
  const selected   = {};
  let activeCatKey = MENU[0]?.key || "warm";

  const menuModal       = $("#menuModal");
  const menuClose       = $("#menuClose");
  const menuApply       = $("#menuApply");  // кнопка "Сохранить" в sheet
  const menuCount       = $("#menuCount");
  const menuCats        = $("#menuCats");
  const menuItems       = $("#menuItems");
  const menuModalSearch = $("#menuModalSearch");
  const menuModalReset  = $("#menuModalReset");
  const menuRow         = $("#menuRow");
  const menuRowHint     = $("#menuRowHint");

  function updateMenuHiddenFields() {
    const entries = Object.entries(selected);

    // Теги под кнопкой
    let tagsEl = $("#menuRowTags");
    if (!tagsEl && menuRow) {
      tagsEl = document.createElement("div");
      tagsEl.id = "menuRowTags";
      tagsEl.className = "cf-menu-tags";
      menuRow.insertAdjacentElement("afterend", tagsEl);
    }

    if (!entries.length) {
      if (menuModeHidden)   menuModeHidden.value   = "Без выбора (Vilana предложит)";
      if (menuSelectedText) menuSelectedText.value = "—";
      if (menuRowHint)      menuRowHint.textContent = "Без выбора — Vilana предложит";
      if (menuCount)        menuCount.textContent   = "0";
      if (tagsEl)           tagsEl.innerHTML        = "";
      return;
    }

    const groups = {};
    entries.forEach(([, v]) => {
      if (!groups[v.catKey]) groups[v.catKey] = [];
      groups[v.catKey].push(v);
    });
    const lines = [];
    MENU.forEach(cat => (groups[cat.key] || []).forEach(x => lines.push(`• ${cat.title}: ${x.name}`)));

    if (menuModeHidden)   menuModeHidden.value   = "Блюда выбраны";
    if (menuSelectedText) menuSelectedText.value = lines.join("\n");
    if (menuRowHint)      menuRowHint.textContent = `${entries.length} ${pluralDish(entries.length)} выбрано`;
    if (menuCount)        menuCount.textContent   = String(entries.length);

    if (tagsEl) {
      const allNames = [];
      MENU.forEach(cat => (groups[cat.key] || []).forEach(x => allNames.push(x.name)));
      tagsEl.innerHTML = allNames
        .map(n => `<span class="cf-menu-tag">${esc(n)}</span>`)
        .join("");
    }
  }

  function pluralDish(n) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "блюдо";
    if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return "блюда";
    return "блюд";
  }

  function getCatByKey(key) { return MENU.find(c => c.key === key) || MENU[0]; }

  function renderCats(q = "") {
    if (!menuCats) return;
    menuCats.innerHTML = "";
    MENU.forEach(cat => {
      if (q && !cat.items.some(i => i.name.toLowerCase().includes(q) || (i.desc||"").toLowerCase().includes(q))) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v-sheet__cat" + (cat.key === activeCatKey ? " is-active" : "");
      btn.setAttribute("data-cat", cat.key);
      btn.innerHTML = `<span class="v-sheet__catTitle">${esc(cat.title)}</span><span class="v-sheet__catMeta">${cat.items.length} позиций</span>`;
      menuCats.appendChild(btn);
    });
  }

  function renderItems(q = "") {
    if (!menuItems) return;
    const cat   = getCatByKey(activeCatKey);
    const items = q
      ? cat.items.filter(i => i.name.toLowerCase().includes(q) || (i.desc||"").toLowerCase().includes(q))
      : cat.items;
    menuItems.innerHTML = "";
    if (!items.length) { menuItems.innerHTML = `<div class="v-sheet__empty">Ничего не найдено.</div>`; return; }
    items.forEach(item => {
      const on  = !!selected[item.id];
      const row = document.createElement("div");
      row.className = "v-sheet__item";
      row.setAttribute("data-item-id", item.id);
      row.innerHTML = `
        <div class="v-sheet__itemText">
          <div class="v-sheet__itemName">${esc(item.name)}</div>
          ${item.desc ? `<div class="v-sheet__itemDesc">${esc(item.desc)}</div>` : ""}
        </div>
        <button type="button" class="v-sheet__toggle${on ? " is-on" : ""}"
          data-toggle="${esc(item.id)}" aria-label="${on ? "Убрать" : "Добавить"}">
          <span>${on ? "✓" : "+"}</span>
        </button>`;
      menuItems.appendChild(row);
    });
  }

  function openMenuSheet() {
    if (!menuModal) return;
    menuModal.classList.remove("hidden");
    menuModal.setAttribute("aria-hidden", "false");
    bodyLock(true);
    renderCats(menuModalSearch?.value || "");
    renderItems(menuModalSearch?.value || "");
    updateMenuHiddenFields();
  }

  function closeMenuSheet() {
    if (!menuModal) return;
    menuModal.classList.add("hidden");
    menuModal.setAttribute("aria-hidden", "true");
    bodyLock(false);
  }

  if (menuRow)   menuRow.addEventListener("click", openMenuSheet);
  if (menuClose) menuClose.addEventListener("click", closeMenuSheet);
  if (menuApply) menuApply.addEventListener("click", () => {
    updateMenuHiddenFields();
    closeMenuSheet();
    toast("Сохранено ✓");
  });

  if (menuModal) {
    menuModal.addEventListener("click", e => { if (e.target?.matches("[data-sheet-close]")) closeMenuSheet(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && !menuModal.classList.contains("hidden")) closeMenuSheet();
    });
  }

  if (menuCats) {
    menuCats.addEventListener("click", e => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeCatKey = btn.getAttribute("data-cat") || activeCatKey;
      renderCats(menuModalSearch?.value || "");
      renderItems(menuModalSearch?.value || "");
      if (menuItems) menuItems.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (menuItems) {
    menuItems.addEventListener("click", e => {
      const item = e.target.closest(".v-sheet__item");
      if (!item) return;
      const id = item.getAttribute("data-item-id");
      if (!id) return;
      if (selected[id]) {
        delete selected[id];
        renderItems(menuModalSearch?.value || "");
        updateMenuHiddenFields();
        toast("Убрано");
        return;
      }
      let found = null, foundCatKey = null;
      for (const c of MENU) {
        const x = c.items.find(it => it.id === id);
        if (x) { found = x; foundCatKey = c.key; break; }
      }
      if (!found) return;
      selected[id] = { name: found.name, catKey: foundCatKey };
      renderItems(menuModalSearch?.value || "");
      updateMenuHiddenFields();
      toast("Добавлено ✓");
    });
  }

  if (menuModalSearch) {
    menuModalSearch.addEventListener("input", () => {
      const q = menuModalSearch.value.trim().toLowerCase();
      renderCats(q);
      renderItems(q);
    });
  }

  if (menuModalReset) {
    menuModalReset.addEventListener("click", e => {
      e.preventDefault();
      for (const k of Object.keys(selected)) delete selected[k];
      activeCatKey = MENU[0]?.key || "warm";
      if (menuModalSearch) menuModalSearch.value = "";
      renderCats(""); renderItems("");
      updateMenuHiddenFields();
      const tagsEl = $("#menuRowTags");
      if (tagsEl) tagsEl.innerHTML = "";
      toast("Сброс ✓");
    });
  }

  /* =========================================================
      Init
  ========================================================= */
  updateMenuHiddenFields();
  setMode("quick");
  showStep(1);
  hide(btnBack);

});