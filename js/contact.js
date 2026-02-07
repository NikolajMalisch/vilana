"use strict";

/**
 * Vilana Contact Form (DE) — v2 (Sheet Menu)
 * - Quick Anfrage (Nachricht + E-Mail Pflicht)
 * - Wizard (Erweitert) 4 Steps
 * - Step 2 Menü: opens Sheet/Modal (#menuModal)
 * - EmailJS sendForm: from_name, reply_to, subject, message
 * - Anti-Spam: Honeypot + 3s timing
 * - УЛУЧШЕНИЕ: Клик на весь item для выбора блюда
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
    toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 1600);
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
      Wizard Setup (4 Schritte)
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
      btnToggleWizard.textContent = open ? "Erweitert geöffnet" : "Erweitert (optional)";
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
      MENÜ SHEET — Data
  ========================================================== */
  const MENU = [
    {
      key: "warm", title: "Warme Speisen", items: [
        { id: "warm_01", name: "Schaschlik", desc: "Pute, Schwein oder Lamm – mariniert und gegrillt." },
        { id: "warm_02", name: "Gefüllte Paprika", desc: "Mit Hackfleisch oder vegetarisch gefüllt." },
        { id: "warm_03", name: "Rinderbraten", desc: "Zart geschmort mit klassischer Bratensoße." },
        { id: "warm_04", name: "Lammkoteletts", desc: "Mit Rosmarinkartoffeln und Bohnen im Speckmantel." },
        { id: "warm_05", name: "Kohlrouladen (Golubzi)", desc: "Mit Fleisch-Reis-Füllung in Tomatensoße." },
        { id: "warm_06", name: "Knusprige Hähnchenschnitzel", desc: "Klassisch paniert und goldbraun gebraten." },
        { id: "warm_07", name: "Hähnchenbrust in Champignonrahmsauce", desc: "Cremige Pilzsoße auf zarter Hähnchenbrust." },
        { id: "warm_08", name: "Köfte / Frikadellen", desc: "Orientalisch oder klassisch gewürzt." },
        { id: "warm_09", name: "Plov", desc: "Reispfanne mit Möhren und Fleisch." },
        { id: "warm_10", name: "Kassler mit Sauerkraut", desc: "Deftig und traditionell." },
        { id: "warm_11", name: "Hähnchenrouladen mit Spinat in Béarnaise", desc: "Herzhaft gefüllt mit feiner Sauce." },
        { id: "warm_12", name: "Entenbrust mit Orangensauce", desc: "Fruchtig und edel – perfekt für besondere Anlässe." },
        { id: "warm_13", name: "Kartoffelgratin / Püree", desc: "Cremige Klassiker als Beilage." },
        { id: "warm_14", name: "China-Nudeln mit Gemüse (vegan)", desc: "Leicht gewürzt, frisch und aromatisch." },
        { id: "warm_15", name: "Frittierte Calamari", desc: "Knusprig und zart mit Dip." },
        { id: "warm_16", name: "Gegrillte Garnelen", desc: "Aromatisch mariniert, leicht gegrillt." },
        { id: "warm_17", name: "Bohnen im Speckmantel", desc: "Herzhaft im Speckmantel gebraten." },
        { id: "warm_18", name: "Reis oder Spätzle", desc: "Als Beilage zu Fleisch- oder Fischgerichten." },
        { id: "warm_19", name: "Mediterranes Gemüse", desc: "Gegrillt mit Olivenöl und Kräutern." },
        { id: "warm_20", name: "Gemüse in Sauce Hollandaise", desc: "Gedämpft mit cremiger Sauce Hollandaise." },
        { id: "warm_21", name: "Lachs in einer Kräuterrahmsauce", desc: "Zartes Filet in cremiger Kräutersauce." },
        { id: "warm_22", name: "Zanderfilet in einer Dillsauce", desc: "Mild gegart in feiner Dillsahnesauce." }
      ]
    },
    {
      key: "cold", title: "Kalte Platten", items: [
        { id: "cold_01", name: "Auberginen mit Tomaten geschichtet", desc: "In Schichten, aromatisch mariniert." },
        { id: "cold_02", name: "Tomate-Mozzarella", desc: "Klassiker mit Basilikum und Balsamico." },
        { id: "cold_03", name: "Surimi", desc: "Frisch oder als Häppchen serviert." },
        { id: "cold_04", name: "Frittierte Surimi im Knuspermantel", desc: "Knusprig ummantelte Meeresfrüchte." },
        { id: "cold_05", name: "Gefüllte Eier", desc: "Hausgemacht mit feiner Creme." },
        { id: "cold_06", name: "Garnelen im Kartoffelfadenmantel", desc: "Knusprig, elegant, ein Hingucker." },
        { id: "cold_07", name: "Antipasti in verschiedenen Variationen", desc: "Mediterraner Mix aus Gemüse & Käse." },
        { id: "cold_08", name: "Sarma (gefüllte Weinblätter)", desc: "Mild gewürzt, auf Wunsch vegan." },
        { id: "cold_09", name: "Sushi in verschiedenen Variationen", desc: "Frisch und kreativ serviert." },
        { id: "cold_10", name: "Baguette mit Lachs", desc: "Frisch belegt mit Dill und Creme." },
        { id: "cold_11", name: "Avocadocreme / Hummus", desc: "Cremige Dips, perfekt als Vorspeise." },
        { id: "cold_12", name: "Garnelencreme", desc: "Fein abgeschmeckt als Brotaufstrich oder Dip." },
        { id: "cold_13", name: "Kanapee (Häppchen)", desc: "Elegant belegte Appetizer auf Mini-Brot." },
        { id: "cold_14", name: "Fischplatte", desc: "Butterfisch, geräucherter Lachs, Hering, Makrele." },
        { id: "cold_15", name: "Käse- und Schinkenplatte", desc: "Ausgewählte Käsesorten & Schinkenspezialitäten." }
      ]
    },
    {
      key: "salad", title: "Salate", items: [
        { id: "salad_01", name: "Pilzsalat", desc: "Mit marinierten Champignons und Zwiebeln." },
        { id: "salad_02", name: "Möhrensalat", desc: "Frisch geraspelt mit Apfel oder Knoblauch." },
        { id: "salad_03", name: "Krabbensalat", desc: "Mit Mayonnaise und Gemüsewürfeln." },
        { id: "salad_04", name: "Sommersalat", desc: "Leicht und frisch mit Gurke, Tomate, Paprika." },
        { id: "salad_05", name: "Rucola-Salat", desc: "Mit Parmesan und Balsamico." },
        { id: "salad_06", name: "Chinakohlsalat", desc: "Knackig, leicht süßlich, mit Joghurt oder Essig." },
        { id: "salad_07", name: "Spitzkohlsalat mit Pistazien", desc: "Fein geschnitten mit nussigem Topping." },
        { id: "salad_08", name: "Griechischer Salat", desc: "Mit Feta, Gurken, Tomaten, Oliven." },
        { id: "salad_09", name: "Tomaten-Oliven-Salat", desc: "Mit roten Zwiebeln und frischen Kräutern." },
        { id: "salad_10", name: "Granatapfelsalat", desc: "Mit knackigem Gemüse und fruchtiger Note." },
        { id: "salad_11", name: "Heringssalat (Pod Schuboj)", desc: "Traditionell mit Roter Bete und Mayonnaise." },
        { id: "salad_12", name: "Kartoffelsalat (Olivje)", desc: "Klassiker mit Erbsen, Ei und Mayo." },
        { id: "salad_13", name: "Vinegret", desc: "Russische Rote-Bete-Gemüsemischung." }
      ]
    },
    {
      key: "dessert", title: "Nachspeisen", items: [
        { id: "dessert_01", name: "Windbeutel-Dessert", desc: "Gefüllt mit Vanillecreme und Sahne." },
        { id: "dessert_02", name: "Lotus-Keks-Dessert", desc: "Cremiger Nachtisch mit karamellisierten Keksen." },
        { id: "dessert_03", name: "Mousse au Chocolat", desc: "Luftige Schokocreme." },
        { id: "dessert_04", name: "Panna Cotta", desc: "Klassisch mit Fruchtsauce." },
        { id: "dessert_05", name: "Tiramisu", desc: "Mit Mascarpone, Kaffee und Kakao." },
        { id: "dessert_06", name: "Früchte mit Schokoladenüberzug", desc: "Frisches Obst mit Schokolade." },
        { id: "dessert_07", name: "Cookiedessert mit Weintrauben", desc: "Knusprig und cremig." }
      ]
    },
    {
      key: "candy", title: "Candy Bar", items: [
        { id: "candy_01", name: "Donuts", desc: "Bunt dekoriert." },
        { id: "candy_02", name: "Cake Pops", desc: "Kleine Kuchen am Stiel." },
        { id: "candy_03", name: "CupCakes", desc: "Mit cremigem Topping." },
        { id: "candy_04", name: "Popcorn", desc: "Klassisch, süß oder salzig." },
        { id: "candy_05", name: "Fruchtgummi Bärenköpfe", desc: "Für kleine und große Gäste." },
        { id: "candy_06", name: "Fruchtgummi Schnüre", desc: "Bunte Vielfalt." },
        { id: "candy_07", name: "Fruchtgummi Schnuckies", desc: "Fruchtige Überraschung." },
        { id: "candy_08", name: "Schokolade", desc: "Weiße, Vollmilch, Zartbitter." }
      ]
    }
  ];

  /* =========================================================
      MENÜ SHEET — Elements
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
      if (menuModeHidden) menuModeHidden.value = "Keine Auswahl (Vilana schlägt vor)";
      if (menuSelectedText) menuSelectedText.value = "—";
      if (menuRowHint) menuRowHint.textContent = "Keine Auswahl – Vilana schlägt vor";
      if (menuCount) menuCount.textContent = "0";
      return;
    }

    // build lines grouped by category in original order
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

    if (menuModeHidden) menuModeHidden.value = "Gerichte ausgewählt";
    if (menuSelectedText) menuSelectedText.value = lines.join("\n");
    if (menuRowHint) menuRowHint.textContent = `${entries.length} ausgewählt`;
    if (menuCount) menuCount.textContent = String(entries.length);
  }

  function renderCats(query = "") {
    if (!menuCats) return;
    const q = query.trim().toLowerCase();

    menuCats.innerHTML = "";

    MENU.forEach(cat => {
      // if query, keep cats that have at least one match
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
        <div class="v-sheet__catMeta">${cat.items.length} Gerichte</div>
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
      menuItems.innerHTML = `<div class="v-sheet__empty">Keine Treffer.</div>`;
      return;
    }

    items.forEach(item => {
      const isAdded = !!selected[item.id];

      const row = document.createElement("div");
      row.className = "v-sheet__item";
      row.setAttribute("data-item-id", item.id); // для клика
      row.innerHTML = `
        <div class="v-sheet__itemText">
          <div class="v-sheet__itemName">${esc(item.name)}</div>
          ${item.desc ? `<div class="v-sheet__itemDesc">${esc(item.desc)}</div>` : ``}
        </div>
        <button type="button"
          class="v-sheet__toggle ${isAdded ? "is-on" : ""}"
          data-toggle="${esc(item.id)}"
          aria-label="${isAdded ? "Entfernen" : "Hinzufügen"}">
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

    // default render
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
      if (e.target && (e.target.matches("[data-sheet-close]"))) closeMenuSheet();
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

  // ✅ УЛУЧШЕНИЕ: клик на весь item (не только на кнопку!)
  if (menuItems) {
    menuItems.addEventListener("click", (e) => {
      // Клик на весь item
      const item = e.target.closest(".v-sheet__item");
      if (!item) return;

      const id = item.getAttribute("data-item-id");
      if (!id) return;

      // toggle выбора
      if (selected[id]) {
        delete selected[id];
        renderItems(menuModalSearch?.value || "");
        updateMenuHiddenFields();
        toast("Entfernt");
        return;
      }

      // find item in all cats
      let found = null, foundCatKey = null;
      for (const c of MENU) {
        const x = c.items.find(it => it.id === id);
        if (x) { found = x; foundCatKey = c.key; break; }
      }
      if (!found) return;

      selected[id] = { name: found.name, catKey: foundCatKey };
      renderItems(menuModalSearch?.value || "");
      updateMenuHiddenFields();
      toast("Hinzugefügt ✓");
    });
  }

  // search + reset
  if (menuModalSearch) {
    menuModalSearch.addEventListener("input", () => {
      const q = menuModalSearch.value || "";
      // keep cat list filtered + items filtered
      renderCats(q);
      renderItems(q);
    });
  }
  if (menuModalReset) {
    menuModalReset.addEventListener("click", () => {
      if (menuModalSearch) menuModalSearch.value = "";
      renderCats("");
      renderItems("");
    });
  }

  // apply: only closes (selected already stored)
  if (menuApply) {
    menuApply.addEventListener("click", () => {
      updateMenuHiddenFields();
      closeMenuSheet();
      toast("Übernommen ✓");
    });
  }

  // initial hidden fields
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
        if (!v) el.setCustomValidity("Bitte geben Sie die Gästezahl an (mind. 20).");
        else if (v < 20) el.setCustomValidity("Mindestbestellung: ab 20 Personen.");
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
      Base Validation (immer)
  ========================================================== */
  function validateBase() {
    // Nachricht Pflicht
    if (!quickMessage || !quickMessage.value.trim()) {
      if (quickMessage) {
        quickMessage.classList.add("field-error");
        quickMessage.focus();
      }
      toast("Bitte Nachricht ausfüllen.");
      return false;
    }
    quickMessage.classList.remove("field-error");

    // E-Mail Pflicht
    const e1 = (email && email.value) ? email.value.trim() : "";
    if (!e1) {
      if (email) {
        email.classList.add("field-error");
        email.focus();
      }
      toast("Bitte E-Mail angeben.");
      return false;
    }
    if (email && !email.checkValidity()) {
      email.classList.add("field-error");
      email.focus();
      email.reportValidity();
      return false;
    }
    if (email) email.classList.remove("field-error");

    // Datenschutz Pflicht
    if (privacy && !privacy.checked) {
      toast("Bitte AGB & Datenschutz akzeptieren.");
      privacy.focus();
      return false;
    }
    return true;
  }

  /* =========================================================
      Email Body Builder (Nachricht immer zuerst!)
  ========================================================== */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function buildStructuredEmail() {
    const message = getVal("cf_message");

    const finalName = (name && name.value) ? name.value.trim() : "Website Anfrage";
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
    if (form.querySelector('input[name="pref_meat2"]')?.checked) pref.push("Fleisch");
    if (form.querySelector('input[name="pref_fish2"]')?.checked) pref.push("Fisch");
    if (form.querySelector('input[name="pref_veg2"]')?.checked) pref.push("Vegetarisch");
    if (form.querySelector('input[name="pref_kids2"]')?.checked) pref.push("Kinder");

    const selectedText = (menuSelectedText?.value || "—").trim();

    const optGeschirr = form.querySelector('input[name="opt_geschirr"]')?.checked ? "Ja" : "Nein";
    const optBesteck = form.querySelector('input[name="opt_besteck"]')?.checked ? "Ja" : "Nein";
    const optGlaeser = form.querySelector('input[name="opt_glaeser"]')?.checked ? "Ja" : "Nein";
    const optServiceVal = (optService && optService.checked) ? "Ja" : "Nein";
    const cleanupVal = (optCleanup && optCleanup.checked) ? "Ja" : "Nein";

    const preview =
`NACHRICHT
• ${message}

KONTAKT
• Name: ${finalName || "—"}
• E-Mail: ${finalEmail || "—"}
• Telefon: ${finalPhone || "—"}

EVENT (optional)
• Typ: ${eventType || "—"}
• Gäste: ${guests || "—"}
• Datum: ${date ? (date + (time ? " " + time : "")) : "—"}
• Ort: ${location || "—"}

MENÜ (optional)
• Modus: ${menuMode || "—"}
• Präferenzen: ${pref.length ? pref.join(", ") : "—"}
• Allergene/Wünsche: ${allergies || "—"}
• Auswahl:
${selectedText || "—"}

OPTIONEN (optional)
• Geschirr: ${optGeschirr}
• Besteck: ${optBesteck}
• Gläser: ${optGlaeser}
• Service: ${optServiceVal}
• Abbau/Reinigung/Spülservice: ${cleanupVal}`.trim();

    const emailBody =
`=== VILANA ANFRAGE (STRUKTURIERT) ===

[NACHRICHT]
${message}

[KONTAKT]
Name: ${finalName || "—"}
E-Mail: ${finalEmail || "—"}
Telefon: ${finalPhone || "—"}

[EVENT] (optional)
Typ: ${eventType || "—"}
Gäste: ${guests || "—"}
Datum: ${date ? (date + (time ? " " + time : "")) : "—"}
Ort/Adresse: ${location || "—"}

[INKLUSIVE]
- Lieferung
- Buffet-Aufbau

[MENÜ] (optional)
Modus: ${menuMode || "—"}
Präferenzen: ${pref.length ? pref.join(", ") : "—"}
Allergene/Wünsche: ${allergies || "—"}

Auswahl (ohne Mengen, wir kalkulieren passend):
${selectedText || "—"}

[OPTIONEN] (optional)
Geschirr anbieten: ${optGeschirr}
Besteck anbieten: ${optBesteck}
Gläser anbieten: ${optGlaeser}
Service Personal anfragen: ${optServiceVal}
Abbau/Reinigung/Spülservice anfragen: ${cleanupVal}

=== ENDE ===
`;
    return { preview, emailBody };
  }

  /* =========================================================
      EmailJS Init
  ========================================================== */
  if (window.emailjs) {
    try { emailjs.init({ publicKey: "vfmomNKrMxrf2xqDW" }); } catch (_) {}
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

    // Base checks
    if (!validateBase()) return;

    // Wenn Wizard offen: Step 1 muss ok sein (Minimum)
    if (wizardOpen) {
      if (!validateWizardStep(1)) return;
    }

    const { emailBody } = buildStructuredEmail();

    const finalName = (name && name.value) ? name.value.trim() : "Website Anfrage";
    const finalEmail = (email && email.value) ? email.value.trim() : "";

    const subj = wizardOpen
      ? `Vilana Anfrage: ${getVal("cf-eventType") || "Event"} (${getVal("cf-date") || "Datum"})`
      : `Vilana Anfrage: Nachricht / Info`;

    if (fromNameHidden) fromNameHidden.value = finalName;
    if (replyToHidden) replyToHidden.value = finalEmail;
    if (subjectHidden) subjectHidden.value = subj;
    if (msgHidden) msgHidden.value = emailBody;

    if (!window.emailjs || !emailjs.sendForm) {
      alert("EmailJS ist nicht geladen. Bitte prüfen: Internet/Script-Blocker.");
      return;
    }

    sending = true;
    const submitBtns = $$('button[type="submit"]', form);
    submitBtns.forEach(b => { try { b.disabled = true; } catch (_) {} });

    emailjs.sendForm(
      "service_75biswm",
      "template_fuxgrlb",
      form,
      { publicKey: "vfmomNKrMxrf2xqDW" }
    )
    .then(() => {
      const ok = $("#formMsg");
      if (ok) ok.classList.remove("hidden");
      toast("Gesendet ✓");

      form.reset();
      if (startedAt) startedAt.value = String(Date.now());

      // reset menu state
      Object.keys(selected).forEach(k => delete selected[k]);
      activeCatKey = MENU[0]?.key || "warm";
      updateMenuHiddenFields();

      // close sheet if open
      if (menuModal && !menuModal.classList.contains("hidden")) closeMenuSheet();

      // reset wizard
      syncService();
      syncCleanup();
      setWizard(false);
    })
    .catch((err) => {
      alert("Fehler beim Senden: " + (err && err.text ? err.text : String(err)));
    })
    .finally(() => {
      sending = false;
      submitBtns.forEach(b => { try { b.disabled = false; } catch (_) {} });
    });
  });

});