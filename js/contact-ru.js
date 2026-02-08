"use strict";

/**
 * Vilana Contact Form (RU) — v2 (Sheet Menu like DE)
 * - Быстрая заявка (Сообщение + E-mail обязательно)
 * - Wizard (Расширенно) 4 шага
 * - Шаг 2 Меню: Sheet/Modal (#menuModal) — категории слева, блюда справа
 * - EmailJS sendForm
 * - Anti-Spam: Honeypot + timing (3s)
 * - UX: клик по всей строке блюда = toggle
 * - FIX: Reset сбрасывает поиск + выбор + активную категорию + скрытые поля
 */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
      Helpers
  ========================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();

  const toastEl = $("#toast");
  let toastTimer = null;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 1700);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function bodyLock(lock) {
    document.documentElement.classList.toggle("v-noscroll", !!lock);
    document.body.classList.toggle("v-noscroll", !!lock);
  }

  /* =========================================================
      Burger Menu
  ========================================================== */
  const btnBurger = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  if (btnBurger && mobileMenu) {
    const setOpen = (open) => {
      mobileMenu.classList.toggle("hidden", !open);
      btnBurger.setAttribute("aria-expanded", String(open));
    };
    btnBurger.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(mobileMenu.classList.contains("hidden"));
    });
    document.addEventListener("click", (e) => {
      if (!mobileMenu.classList.contains("hidden")) {
        const inside = mobileMenu.contains(e.target) || btnBurger.contains(e.target);
        if (!inside) setOpen(false);
      }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    $$("a", mobileMenu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  }

  /* =========================================================
      Anti-bot timing start
  ========================================================== */
  const startedAt = $("#cf_started_at");
  if (startedAt) startedAt.value = String(Date.now());

  /* =========================================================
      Form refs
  ========================================================== */
  const form = $("#contactForm");
  if (!form) return;

  // Quick
  const quickMessage = $("#cf_message");
  const email = $("#email");
  const privacy = $("#cf-privacy");
  const name = $("#name");
  const phone = $("#cf-phone");

  // Wizard toggle
  const btnToggleWizard = $("#btnToggleWizard");
  const wizardWrap = $("#wizardWrap");
  const btnQuickSend = $("#btnQuickSend");
  const btnCloseWizard = $("#btnCloseWizard");

  // Wizard nav
  const btnBack = $("#btnBack");
  const btnNext = $("#btnNext");
  const summaryBox = $("#summaryBox");

  // Hidden EmailJS vars
  const fromNameHidden = $("#from_name_hidden");
  const replyToHidden = $("#reply_to_hidden");
  const subjectHidden = $("#subject_hidden");
  const msgHidden = $("#cf-message-hidden");

  // Menu hidden for email
  const menuSelectedText = $("#menuSelectedText");
  const menuModeHidden = $("#menuModeHidden");

  /* =========================================================
      EmailJS config (из data-атрибутов формы)
  ========================================================== */
  const EMAILJS_PUBLIC_KEY = (form.dataset.emailjsPublicKey || "").trim();
  const EMAILJS_TEMPLATE_ID = (form.dataset.emailjsTemplateId || "").trim();
  const EMAILJS_SERVICE_ID = (form.dataset.emailjsServiceId || "").trim();

  /* =========================================================
      Wizard Setup (4 шага)
  ========================================================== */
  const TOTAL_STEPS = 4;
  const steps = wizardWrap ? $$("[data-step]", wizardWrap) : [];
  const dots = Array.from({ length: TOTAL_STEPS }, (_, i) => $("#stepDot" + (i + 1)));

  let wizardOpen = false;
  let current = 1;

  function setDots(n) {
    dots.forEach((d, i) => {
      if (!d) return;
      const stepN = i + 1;
      d.classList.remove("step-dot-done", "step-dot-active");
      if (stepN < n) d.classList.add("step-dot-done");
      if (stepN === n) d.classList.add("step-dot-active");
    });
  }

  function showStep(n) {
    current = Math.max(1, Math.min(TOTAL_STEPS, n));

    steps.forEach(s => {
      const sn = String(s.getAttribute("data-step"));
      s.classList.toggle("hidden", sn !== String(current));
    });

    const isFirst = current === 1;
    if (btnBack) {
      btnBack.disabled = isFirst;
      btnBack.classList.toggle("opacity-50", isFirst);
      btnBack.classList.toggle("cursor-not-allowed", isFirst);
    }
    if (btnNext) btnNext.classList.toggle("hidden", current === TOTAL_STEPS);

    setDots(current);

    if (current === TOTAL_STEPS && summaryBox) {
      summaryBox.textContent = buildStructuredEmail().preview;
    }
  }

  function setWizard(open) {
    wizardOpen = open;
    if (wizardWrap) wizardWrap.classList.toggle("hidden", !open);
    if (btnQuickSend) btnQuickSend.classList.toggle("hidden", open);

    if (btnToggleWizard) {
      btnToggleWizard.textContent = open ? "Расширенная форма открыта" : "Расширенно (опционально)";
      btnToggleWizard.disabled = open;
    }

    if (open) showStep(1);
    if (!open && btnToggleWizard) btnToggleWizard.disabled = false;
  }

  if (btnToggleWizard) btnToggleWizard.addEventListener("click", () => setWizard(true));
  if (btnCloseWizard) btnCloseWizard.addEventListener("click", () => setWizard(false));

  if (btnBack) btnBack.addEventListener("click", () => { if (current > 1) showStep(current - 1); });
  if (btnNext) btnNext.addEventListener("click", () => {
    if (!validateWizardStep(current)) return;
    showStep(current + 1);
  });

  if (wizardWrap) {
    wizardWrap.addEventListener("change", () => {
      if (current === TOTAL_STEPS && summaryBox) {
        summaryBox.textContent = buildStructuredEmail().preview;
      }
    });
  }

  /* =========================================================
      Optionen (Service/Cleanup) – show/hide
  ========================================================== */
  const optService = $("#opt_service");
  const serviceDetails = $("#serviceDetails");
  const optCleanup = $("#opt_cleanup");
  const cleanupDetails = $("#cleanupDetails");

  function syncService() {
    if (!serviceDetails) return;
    serviceDetails.classList.toggle("hidden", !(optService && optService.checked));
  }
  if (optService) optService.addEventListener("change", syncService);
  syncService();

  function syncCleanup() {
    if (!cleanupDetails) return;
    cleanupDetails.classList.toggle("hidden", !(optCleanup && optCleanup.checked));
  }
  if (optCleanup) optCleanup.addEventListener("change", syncCleanup);
  syncCleanup();

  /* =========================================================
      MENU DATA (RU)
  ========================================================== */
  const MENU = [
    {
      key: "warm", title: "Горячие блюда", items: [
        { id: "warm_01", name: "Шашлык", desc: "Индейка, свинина или ягнёнок — маринованный и на гриле." },
        { id: "warm_02", name: "Фаршированный перец", desc: "С мясной начинкой или вегетарианский вариант." },
        { id: "warm_03", name: "Говяжий ростбиф/жаркое", desc: "Томлёная говядина с классическим соусом." },
        { id: "warm_04", name: "Котлеты из ягнёнка", desc: "С розмариновым картофелем и фасолью в беконе." },
        { id: "warm_05", name: "Голубцы", desc: "Капуста с начинкой мясо+рис в томатном соусе." },
        { id: "warm_06", name: "Куриный шницель (хрустящий)", desc: "Классическая панировка, золотистая корочка." },
        { id: "warm_07", name: "Куриная грудка в грибном соусе", desc: "Нежная грудка в сливочном шампиньонном соусе." },
        { id: "warm_08", name: "Кёфте / фрикадельки", desc: "Ориентальные или классические специи." },
        { id: "warm_09", name: "Плов", desc: "Рис с морковью и мясом." },
        { id: "warm_10", name: "Касселер с квашеной капустой", desc: "Сытно и по-традиционному." },
        { id: "warm_11", name: "Куриные рулетики со шпинатом под беарнез", desc: "Сытная начинка + нежный соус." },
        { id: "warm_12", name: "Утиная грудка с апельсиновым соусом", desc: "Фруктово-ароматная классика для особых случаев." },
        { id: "warm_13", name: "Картофельный гратен / пюре", desc: "Сливочные гарниры-классики." },
        { id: "warm_14", name: "Китайская лапша с овощами", desc: "Лёгкая, ароматная, свежая." },
        { id: "warm_15", name: "Кальмары фри", desc: "Хрустящие, нежные, с дип-соусом." },
        { id: "warm_16", name: "Креветки на гриле", desc: "Ароматный маринад, лёгкий гриль." },
        { id: "warm_17", name: "Фасоль в беконе", desc: "Обжаренная фасоль в беконе — яркий гарнир." },
        { id: "warm_18", name: "Рис или шпецле", desc: "Гарнир к мясу или рыбе." },
        { id: "warm_19", name: "Овощи по-средиземноморски", desc: "Гриль, оливковое масло, травы." },
        { id: "warm_20", name: "Овощи под соусом голландез", desc: "Тушёные/на пару с кремовым соусом." },
        { id: "warm_21", name: "Лосось в сливочно-травяном соусе", desc: "Нежное филе в кремовом соусе с травами." },
        { id: "warm_22", name: "Филе судака в укропном соусе", desc: "Мягкая подача в укропно-сливочном соусе." }
      ]
    },
    {
      key: "cold", title: "Холодные закуски / плато", items: [
        { id: "cold_01", name: "Баклажаны слоями с томатами", desc: "Слоёная подача, ароматный маринад." },
        { id: "cold_02", name: "Томат–моцарелла", desc: "Классика с базиликом и бальзамиком." },
        { id: "cold_03", name: "Сурими", desc: "Подача в свежем виде или как канапе." },
        { id: "cold_04", name: "Сурими фри в хрустящей панировке", desc: "Хрустящая закуска из морепродуктов." },
        { id: "cold_05", name: "Фаршированные яйца", desc: "Домашняя нежная начинка." },
        { id: "cold_06", name: "Креветки в картофельной «нить-панировке»", desc: "Хрустяще, эффектно, красиво на столе." },
        { id: "cold_07", name: "Антипасти (вариации)", desc: "Средиземноморский микс овощей и сыров." },
        { id: "cold_08", name: "Долма — виноградные листья", desc: "Мягкая специя, по желанию vegan." },
        { id: "cold_09", name: "Суши (ассорти)", desc: "Свежая, креативная подача." },
        { id: "cold_10", name: "Багет с лососем", desc: "Свежая намазка, укроп, лосось." },
        { id: "cold_11", name: "Авокадо-крем / хумус", desc: "Кремовые дипы, идеальны как старт." },
        { id: "cold_12", name: "Креветочный крем", desc: "Нежный дип/намазка с морским вкусом." },
        { id: "cold_13", name: "Канапе", desc: "Элегантные мини-закуски." },
        { id: "cold_14", name: "Рыбное плато", desc: "Масляная рыба, копчёный лосось, сельдь, скумбрия." },
        { id: "cold_15", name: "Сырно-мясная тарелка", desc: "Подборка сыров и ветчинных деликатесов." }
      ]
    },
    {
      key: "salad", title: "Салаты", items: [
        { id: "salad_01", name: "Грибной салат", desc: "Маринованные шампиньоны с луком." },
        { id: "salad_02", name: "Морковный салат", desc: "Свежая морковь, яблоко/чеснок по желанию." },
        { id: "salad_03", name: "Салат с крабовыми палочками", desc: "С майонезом и овощной нарезкой." },
        { id: "salad_04", name: "Летний салат", desc: "Огурец, томаты, перец — свежо и легко." },
        { id: "salad_05", name: "Руккола-салат", desc: "С пармезаном и бальзамическим соусом." },
        { id: "salad_06", name: "Салат из китайской капусты", desc: "Хрустящий, лёгкий, йогурт/уксусная заправка." },
        { id: "salad_07", name: "Салат из капусты с фисташками", desc: "Тонкая нарезка + ореховый акцент." },
        { id: "salad_08", name: "Греческий салат", desc: "Фета, огурцы, томаты, оливки." },
        { id: "salad_09", name: "Томатно-оливковый салат", desc: "Красный лук, свежие травы." },
        { id: "salad_10", name: "Салат с гранатом", desc: "Овощи + фруктовая нотка." },
        { id: "salad_11", name: "Селёдка под шубой", desc: "Классический слоёный салат." },
        { id: "salad_12", name: "Оливье", desc: "Картофель, горошек, яйцо, майонез." },
        { id: "salad_13", name: "Винегрет", desc: "Свекольный овощной микс." }
      ]
    },
    {
      key: "dessert", title: "Десерты", items: [
        { id: "dessert_01", name: "Десерт с профитролями", desc: "С ванильным кремом и сливками." },
        { id: "dessert_02", name: "Десерт с печеньем", desc: "Кремовый десерт с карамельными нотами." },
        { id: "dessert_03", name: "Мусс из шоколада", desc: "Воздушный шоколадный крем." },
        { id: "dessert_04", name: "Панна-котта", desc: "Классика с фруктовым соусом." },
        { id: "dessert_05", name: "Тирамису", desc: "Маскарпоне, кофе, какао." },
        { id: "dessert_06", name: "Фрукты в шоколаде", desc: "Свежие фрукты с шоколадным покрытием." },
        { id: "dessert_07", name: "Печенье-десерт с виноградом", desc: "Хрустяще и кремово." }
      ]
    },
    {
      key: "candy", title: "Candy Bar / Сладкий стол", items: [
        { id: "candy_01", name: "Донаты", desc: "Яркий декор." },
        { id: "candy_02", name: "Cake Pops", desc: "Мини-пирожные на палочке." },
        { id: "candy_03", name: "Капкейки", desc: "С нежным крем-топпингом." },
        { id: "candy_04", name: "Попкорн", desc: "Классика: сладкий или солёный." },
        { id: "candy_05", name: "Мармеладные мишки", desc: "Для детей и взрослых." },
        { id: "candy_06", name: "Мармеладные шнурки", desc: "Разноцветный микс." },
        { id: "candy_07", name: "Мармелад (Schnuckies)", desc: "Фруктовый сюрприз." },
        { id: "candy_08", name: "Шоколад (вариации)", desc: "Белый, молочный, тёмный." }
      ]
    }
  ];

  /* =========================================================
      MENÜ SHEET — Elements (как DE!)
      ВАЖНО: эти ID должны быть в RU HTML
  ========================================================== */
  const menuRow = $("#menuRow");
  const menuRowHint = $("#menuRowHint");

  const menuModal = $("#menuModal");
  const menuClose = $("#menuClose");
  const menuApply = $("#menuApply");
  const menuCount = $("#menuCount");

  const menuCats = $("#menuCats");
  const menuItems = $("#menuItems");

  const menuModalSearch = $("#menuModalSearch");
  const menuModalReset = $("#menuModalReset");

  // state
  const selected = {}; // id -> { name, catKey }
  let activeCatKey = MENU[0]?.key || "warm";

  function getCatByKey(key) {
    return MENU.find(c => c.key === key) || MENU[0];
  }

  function updateMenuHiddenFields() {
    const entries = Object.entries(selected).map(([id, v]) => ({ id, ...v }));

    if (!entries.length) {
      if (menuModeHidden) menuModeHidden.value = "Нет выбора (Vilana предложит меню)";
      if (menuSelectedText) menuSelectedText.value = "—";
      if (menuRowHint) menuRowHint.textContent = "Нет выбора — Vilana предложит";
      if (menuCount) menuCount.textContent = "0";
      return;
    }

    const groups = {};
    entries.forEach(it => {
      const k = it.catKey || "other";
      if (!groups[k]) groups[k] = [];
      groups[k].push(it);
    });

    const lines = [];
    MENU.forEach(cat => {
      const list = groups[cat.key] || [];
      list.forEach(x => lines.push(`• ${cat.title}: ${x.name}`));
    });

    if (menuModeHidden) menuModeHidden.value = "Блюда выбраны";
    if (menuSelectedText) menuSelectedText.value = lines.join("\n");
    if (menuRowHint) menuRowHint.textContent = `${entries.length} выбрано`;
    if (menuCount) menuCount.textContent = String(entries.length);
  }

  function renderCats(query = "") {
    if (!menuCats) return;
    const q = query.trim().toLowerCase();

    menuCats.innerHTML = "";

    MENU.forEach(cat => {
      const hasMatch = !q ? true : cat.items.some(i =>
        i.name.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q)
      );
      if (!hasMatch) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "v-sheet__cat" + (cat.key === activeCatKey ? " is-active" : "");
      btn.setAttribute("data-cat", cat.key);
      btn.innerHTML = `
        <div class="v-sheet__catTitle">${esc(cat.title)}</div>
        <div class="v-sheet__catMeta">${cat.items.length} позиций</div>
      `;
      menuCats.appendChild(btn);
    });
  }

  function renderItems(query = "") {
    if (!menuItems) return;
    const q = query.trim().toLowerCase();

    const cat = getCatByKey(activeCatKey);
    const items = !q
      ? cat.items
      : cat.items.filter(i =>
          i.name.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q)
        );

    menuItems.innerHTML = "";

    if (!items.length) {
      menuItems.innerHTML = `<div class="v-sheet__empty">Ничего не найдено.</div>`;
      return;
    }

    items.forEach(item => {
      const isAdded = !!selected[item.id];

      const row = document.createElement("div");
      row.className = "v-sheet__item";
      row.setAttribute("data-item-id", item.id);
      row.innerHTML = `
        <div class="v-sheet__itemText">
          <div class="v-sheet__itemName">${esc(item.name)}</div>
          ${item.desc ? `<div class="v-sheet__itemDesc">${esc(item.desc)}</div>` : ``}
        </div>
        <button type="button"
          class="v-sheet__toggle ${isAdded ? "is-on" : ""}"
          data-toggle="${esc(item.id)}"
          aria-label="${isAdded ? "Убрать" : "Добавить"}">
          <span>${isAdded ? "✓" : "+"}</span>
        </button>
      `;
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

  // open sheet from row
  if (menuRow) menuRow.addEventListener("click", openMenuSheet);

  // close sheet
  if (menuClose) menuClose.addEventListener("click", closeMenuSheet);
  if (menuModal) {
    menuModal.addEventListener("click", (e) => {
      if (e.target && e.target.matches("[data-sheet-close]")) closeMenuSheet();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menuModal.classList.contains("hidden")) closeMenuSheet();
    });
  }

  // cats click
  if (menuCats) {
    menuCats.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cat]");
      if (!btn) return;
      activeCatKey = btn.getAttribute("data-cat") || activeCatKey;
      renderCats(menuModalSearch?.value || "");
      renderItems(menuModalSearch?.value || "");
    });
  }

  // click on whole item -> toggle selection
  if (menuItems) {
    menuItems.addEventListener("click", (e) => {
      const item = e.target.closest(".v-sheet__item");
      if (!item) return;

      const id = item.getAttribute("data-item-id");
      if (!id) return;

      if (selected[id]) {
        delete selected[id];
        renderItems(menuModalSearch?.value || "");
        updateMenuHiddenFields();
        toast("Удалено");
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

  // search + reset
  if (menuModalSearch) {
    menuModalSearch.addEventListener("input", () => {
      const q = menuModalSearch.value || "";
      renderCats(q);
      renderItems(q);
    });
  }

  // ✅ FIX Reset: чистит всё
  if (menuModalReset) {
    menuModalReset.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      for (const k of Object.keys(selected)) delete selected[k];
      activeCatKey = MENU[0]?.key || "warm";

      if (menuModalSearch) menuModalSearch.value = "";

      renderCats("");
      renderItems("");
      updateMenuHiddenFields();

      toast("Сброшено ✓");
    });
  }

  // apply: only closes (selected already stored)
  if (menuApply) {
    menuApply.addEventListener("click", () => {
      updateMenuHiddenFields();
      closeMenuSheet();
      toast("Применено ✓");
    });
  }

  // init
  updateMenuHiddenFields();

  /* =========================================================
      Wizard Validation
  ========================================================== */
  function validateWizardStep(n) {
    const block = steps.find(s => String(s.getAttribute("data-step")) === String(n));
    if (!block) return true;

    const els = $$("input, select, textarea", block).filter(el => !el.disabled && el.type !== "hidden");

    for (const el of els) {
      if (el.id === "cf-guests" || el.name === "guests") {
        const v = Number(el.value || 0);
        if (!v) el.setCustomValidity("Укажите количество гостей (мин. 20).");
        else if (v < 20) el.setCustomValidity("Минимальный заказ: от 20 персон.");
        else el.setCustomValidity("");
      } else {
        el.setCustomValidity("");
      }

      if (el.hasAttribute("required") && !el.checkValidity()) {
        el.classList.add("field-error");
        el.focus();
        el.reportValidity();
        return false;
      } else {
        el.classList.remove("field-error");
      }
    }
    return true;
  }

  /* =========================================================
      Base Validation (всегда)
  ========================================================== */
  function validateBase() {
    if (!quickMessage || !quickMessage.value.trim()) {
      if (quickMessage) {
        quickMessage.classList.add("field-error");
        quickMessage.focus();
      }
      toast("Пожалуйста, заполните сообщение.");
      return false;
    }
    quickMessage.classList.remove("field-error");

    const e1 = (email && email.value) ? email.value.trim() : "";
    if (!e1) {
      if (email) {
        email.classList.add("field-error");
        email.focus();
      }
      toast("Пожалуйста, укажите e-mail.");
      return false;
    }
    if (email && !email.checkValidity()) {
      email.classList.add("field-error");
      email.focus();
      email.reportValidity();
      return false;
    }
    if (email) email.classList.remove("field-error");

    if (privacy && !privacy.checked) {
      toast("Пожалуйста, примите AGB и Datenschutz.");
      privacy.focus();
      return false;
    }
    return true;
  }

  /* =========================================================
      Email Body Builder (Сообщение первым)
  ========================================================== */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function buildStructuredEmail() {
    const message = getVal("cf_message");

    const finalName = (name && name.value) ? name.value.trim() : "Заявка с сайта";
    const finalEmail = (email && email.value) ? email.value.trim() : "—";
    const finalPhone = (phone && phone.value) ? phone.value.trim() : "—";

    const eventType = getVal("cf-eventType");
    const guests = getVal("cf-guests");
    const date = getVal("cf-date");
    const time = getVal("cf-time");
    const location = getVal("cf-location");

    const menuMode = (menuModeHidden?.value || "").trim();
    const allergies = getVal("cf-allergies");

    const pref = [];
    if (form.querySelector('input[name="pref_meat2"]')?.checked) pref.push("Мясо");
    if (form.querySelector('input[name="pref_fish2"]')?.checked) pref.push("Рыба");
    if (form.querySelector('input[name="pref_veg2"]')?.checked) pref.push("Вегетарианское");
    if (form.querySelector('input[name="pref_kids2"]')?.checked) pref.push("Детское");

    const selectedText = (menuSelectedText?.value || "—").trim();

    const optGeschirr = form.querySelector('input[name="opt_geschirr"]')?.checked ? "Да" : "Нет";
    const optBesteck = form.querySelector('input[name="opt_besteck"]')?.checked ? "Да" : "Нет";
    const optGlaeser = form.querySelector('input[name="opt_glaeser"]')?.checked ? "Да" : "Нет";
    const optServiceVal = form.querySelector('input[name="opt_service"]')?.checked ? "Да" : "Нет";
    const cleanupVal = form.querySelector('input[name="opt_cleanup"]')?.checked ? "Да" : "Нет";

    const preview =
`СООБЩЕНИЕ
• ${message}

КОНТАКТЫ
• Имя: ${finalName || "—"}
• E-mail: ${finalEmail || "—"}
• Телефон: ${finalPhone || "—"}

СОБЫТИЕ (опционально)
• Тип: ${eventType || "—"}
• Гостей: ${guests || "—"}
• Дата: ${date ? (date + (time ? " " + time : "")) : "—"}
• Адрес: ${location || "—"}

МЕНЮ (опционально)
• Режим: ${menuMode || "—"}
• Предпочтения: ${pref.length ? pref.join(", ") : "—"}
• Аллергены/пожелания: ${allergies || "—"}
• Выбор:
${selectedText || "—"}

ОПЦИИ (опционально)
• Посуда: ${optGeschirr}
• Приборы: ${optBesteck}
• Бокалы: ${optGlaeser}
• Персонал: ${optServiceVal}
• Уборка/мойка/сервис: ${cleanupVal}`.trim();

    const emailBody =
`=== VILANA ЗАЯВКА (СТРУКТУРИРОВАНО) ===

[СООБЩЕНИЕ]
${message}

[КОНТАКТЫ]
Имя: ${finalName || "—"}
E-mail: ${finalEmail || "—"}
Телефон: ${finalPhone || "—"}

[СОБЫТИЕ] (опционально)
Тип: ${eventType || "—"}
Гостей: ${guests || "—"}
Дата: ${date ? (date + (time ? " " + time : "")) : "—"}
Адрес: ${location || "—"}

[ВКЛЮЧЕНО]
- Доставка
- Установка/оформление буфета

[МЕНЮ] (опционально)
Режим: ${menuMode || "—"}
Предпочтения: ${pref.length ? pref.join(", ") : "—"}
Аллергены/пожелания: ${allergies || "—"}

Выбор (без количеств — мы рассчитаем оптимально):
${selectedText || "—"}

[ОПЦИИ] (опционально)
Посуда: ${optGeschirr}
Приборы: ${optBesteck}
Бокалы: ${optGlaeser}
Персонал: ${optServiceVal}
Уборка/мойка/сервис: ${cleanupVal}

=== КОНЕЦ ===
`;
    return { preview, emailBody };
  }

  /* =========================================================
      EmailJS Init
  ========================================================== */
  if (window.emailjs && EMAILJS_PUBLIC_KEY) {
    try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch (_) {}
  }

  /* =========================================================
      Submit (Quick + Wizard)
  ========================================================== */
  let sending = false;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (sending) return;

    // Honeypot
    if (form.honeypot && form.honeypot.value) return;

    // Minimal timing check (3 sec)
    const t0 = Number($("#cf_started_at")?.value || "0");
    if (t0 && (Date.now() - t0) < 3000) return;

    if (!validateBase()) return;

    if (wizardOpen) {
      if (!validateWizardStep(1)) return;
    }

    const { emailBody } = buildStructuredEmail();

    const finalName = (name && name.value) ? name.value.trim() : "Заявка с сайта";
    const finalEmail = (email && email.value) ? email.value.trim() : "";

    const subj = wizardOpen
      ? `Vilana: заявка — ${getVal("cf-eventType") || "Событие"} (${getVal("cf-date") || "дата"})`
      : `Vilana: сообщение / вопрос`;

    if (fromNameHidden) fromNameHidden.value = finalName;
    if (replyToHidden) replyToHidden.value = finalEmail;
    if (subjectHidden) subjectHidden.value = subj;
    if (msgHidden) msgHidden.value = emailBody;

    if (!window.emailjs || !emailjs.sendForm) {
      alert("EmailJS не загружен. Проверь: интернет / блокировщик скриптов.");
      return;
    }

    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
      alert("EmailJS не настроен. Проверь data-emailjs-public-key / data-emailjs-service-id / data-emailjs-template-id на <form>.");
      return;
    }

    sending = true;
    const submitBtns = $$('button[type="submit"]', form);
    submitBtns.forEach(b => { try { b.disabled = true; } catch (_) {} });

    emailjs.sendForm(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      form,
      { publicKey: EMAILJS_PUBLIC_KEY }
    )
    .then(() => {
      const ok = $("#formMsg");
      if (ok) ok.classList.remove("hidden");
      toast("Отправлено ✓");

      form.reset();
      if (startedAt) startedAt.value = String(Date.now());

      // reset menu state
      for (const k of Object.keys(selected)) delete selected[k];
      activeCatKey = MENU[0]?.key || "warm";
      updateMenuHiddenFields();

      if (menuModal && !menuModal.classList.contains("hidden")) closeMenuSheet();

      syncService();
      syncCleanup();
      setWizard(false);
    })
    .catch((err) => {
      alert("Ошибка отправки: " + (err && (err.text || err.message) ? (err.text || err.message) : String(err)));
    })
    .finally(() => {
      sending = false;
      submitBtns.forEach(b => { try { b.disabled = false; } catch (_) {} });
    });
  });

});
