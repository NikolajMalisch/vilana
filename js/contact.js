"use strict";

/**
 * Vilana Contact Form (DE)
 * - Quick Anfrage (Nachricht + E-Mail Pflicht)
 * - Wizard (Erweitert) mit Stepper + Menüauswahl (Sheet)
 * - EmailJS Versand (sendForm) + publicKey
 * - Anti-Spam: Honeypot + Timing (3s)
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

  // Optional
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
          Menü (Sheet) — MOBILE FIT FIX
  ========================================================== */
  const menuModeHidden = $("#menuModeHidden");
  const menuSelectedText = $("#menuSelectedText");

  const menuRow = $("#menuRow");
  const menuRowHint = $("#menuRowHint");

  const sheet = $("#menuModal");
  const sheetClose = $("#menuClose");
  const sheetApply = $("#menuApply");
  const sheetSearch = $("#menuModalSearch");
  const sheetReset = $("#menuModalReset");
  const catsEl = $("#menuCats");
  const itemsEl = $("#menuItems");
  const countEl = $("#menuCount");

  // DATA
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

  const picked = new Set();         // item.id
  let activeCatKey = MENU[0]?.key || "warm";

  function setBodyLock(lock) {
    document.documentElement.classList.toggle("is-locked", lock);
    document.body.classList.toggle("is-locked", lock);
  }

  function openSheet() {
    if (!sheet) return;
    sheet.classList.remove("hidden");
    sheet.setAttribute("aria-hidden", "false");
    setBodyLock(true);
    if (sheetSearch) {
      sheetSearch.value = "";
      setTimeout(() => sheetSearch.focus(), 30);
    }
    renderCats();
    renderItems("");
    syncCount();
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.classList.add("hidden");
    sheet.setAttribute("aria-hidden", "true");
    setBodyLock(false);
  }

  function syncCount() {
    if (countEl) countEl.textContent = String(picked.size);
  }

  function countCat(catKey) {
    const cat = MENU.find(c => c.key === catKey);
    if (!cat) return 0;
    let n = 0;
    for (const it of cat.items) if (picked.has(it.id)) n++;
    return n;
  }

  function renderCats() {
    if (!catsEl) return;
    catsEl.innerHTML = MENU.map(c => {
      const isActive = c.key === activeCatKey ? " is-active" : "";
      const cnt = countCat(c.key);
      return `
        <button type="button" class="v-cat${isActive}" data-cat="${esc(c.key)}">
          <span class="v-cat__name">${esc(c.title)}</span>
          <span class="v-cat__count">${cnt ? cnt : ""}</span>
        </button>
      `;
    }).join("");

    $$("[data-cat]", catsEl).forEach(btn => {
      btn.addEventListener("click", () => {
        activeCatKey = btn.getAttribute("data-cat") || activeCatKey;
        if (sheetSearch) sheetSearch.value = "";
        renderCats();
        renderItems("");
      });
    });
  }

  function renderItems(query) {
    if (!itemsEl) return;
    const cat = MENU.find(c => c.key === activeCatKey) || MENU[0];
    if (!cat) return;

    const q = (query || "").trim().toLowerCase();
    const list = !q ? cat.items : cat.items.filter(i =>
      i.name.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q)
    );

    if (!list.length) {
      itemsEl.innerHTML = `<div class="v-empty">Keine Treffer.</div>`;
      return;
    }

    itemsEl.innerHTML = list.map(it => {
      const checked = picked.has(it.id) ? "checked" : "";
      return `
        <label class="v-item">
          <input class="v-item__chk" type="checkbox" data-id="${esc(it.id)}" ${checked} />
          <div class="v-item__body">
            <div class="v-item__name">${esc(it.name)}</div>
            ${it.desc ? `<div class="v-item__desc">${esc(it.desc)}</div>` : ""}
          </div>
        </label>
      `;
    }).join("");

    $$("[data-id]", itemsEl).forEach(cb => {
      cb.addEventListener("change", () => {
        const id = cb.getAttribute("data-id");
        if (!id) return;
        if (cb.checked) picked.add(id); else picked.delete(id);
        renderCats();
        syncCount();
      });
    });
  }

  function buildSelectedText() {
    if (!picked.size) return "—";
    const lines = [];
    for (const cat of MENU) {
      const arr = cat.items.filter(it => picked.has(it.id));
      if (!arr.length) continue;
      lines.push(`• ${cat.title}:`);
      for (const it of arr) lines.push(`  - ${it.name}`);
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  function applySelectionToForm() {
    if (!picked.size) {
      if (menuSelectedText) menuSelectedText.value = "—";
      if (menuModeHidden) menuModeHidden.value = "Keine Auswahl (Vilana schlägt vor)";
      if (menuRowHint) menuRowHint.textContent = "Keine Auswahl – Vilana schlägt vor";
      return;
    }

    const txt = buildSelectedText();
    if (menuSelectedText) menuSelectedText.value = txt;
    if (menuModeHidden) menuModeHidden.value = `Auswahl getroffen (${picked.size} Gerichte)`;
    if (menuRowHint) menuRowHint.textContent = `Ausgewählt: ${picked.size} Gerichte`;
  }

  function resetSelection() {
    picked.clear();
    if (sheetSearch) sheetSearch.value = "";
    renderCats();
    renderItems("");
    syncCount();
    applySelectionToForm();
    toast("Auswahl geleert");
  }

  if (menuRow) menuRow.addEventListener("click", openSheet);
  if (sheetClose) sheetClose.addEventListener("click", closeSheet);

  // backdrop close
  if (sheet) {
    sheet.addEventListener("click", (e) => {
      const closeHit = e.target.closest("[data-sheet-close]");
      if (closeHit) closeSheet();
    });
  }

  // ESC
  document.addEventListener("keydown", (e) => {
    if (!sheet || sheet.classList.contains("hidden")) return;
    if (e.key === "Escape") closeSheet();
  });

  if (sheetSearch) {
    sheetSearch.addEventListener("input", () => renderItems(sheetSearch.value));
  }
  if (sheetReset) sheetReset.addEventListener("click", resetSelection);

  if (sheetApply) {
    sheetApply.addEventListener("click", () => {
      applySelectionToForm();
      closeSheet();
      toast("Übernommen ✓");
      // если мы на шаге 4 — обновим summary
      if (current === TOTAL_STEPS && summaryBox) {
        summaryBox.textContent = buildStructuredEmail().preview;
      }
    });
  }

  // init
  applySelectionToForm();
  syncCount();

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
    if (!quickMessage || !quickMessage.value.trim()) {
      if (quickMessage) {
        quickMessage.classList.add("field-error");
        quickMessage.focus();
        quickMessage.reportValidity?.();
      }
      toast("Bitte Nachricht ausfüllen.");
      return false;
    }
    quickMessage.classList.remove("field-error");

    const e1 = (email && email.value) ? email.value.trim() : "";
    if (!e1) {
      if (email) {
        email.classList.add("field-error");
        email.focus();
        email.reportValidity?.();
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

    const comment = getVal("cf-comment");

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

[ZUSATZ]
${comment || "—"}

=== ENDE ===
`;
    return { preview, emailBody };
  }

  /* =========================================================
          EmailJS Init
  ========================================================== */
  if (window.emailjs) {
    try { emailjs.init({ publicKey: "vfmomNKrMxrf2xqDW" }); } catch (e) { /* ignore */ }
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

    // Wenn Wizard offen: Step 1 muss ok sein
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
    submitBtns.forEach(b => { try { b.disabled = true; } catch (_) { } });

    emailjs.sendForm(
      "service_75biswm",
      "template_fuxgrlb",
      form,
      { publicKey: "vfmomNKrMxrf2xDW" }
    )
      .then(() => {
        const ok = $("#formMsg");
        if (ok) ok.classList.remove("hidden");
        toast("Gesendet ✓");

        form.reset();
        if (startedAt) startedAt.value = String(Date.now());

        // reset menu
        picked.clear();
        applySelectionToForm();
        syncCount();

        // reset wizard
        syncService();
        syncCleanup();
        setWizard(false);

        // close sheet if open
        closeSheet();
      })
      .catch((err) => {
        alert("Fehler beim Senden: " + (err && err.text ? err.text : err));
      })
      .finally(() => {
        sending = false;
        submitBtns.forEach(b => { try { b.disabled = false; } catch (_) { } });
      });
  });

});
