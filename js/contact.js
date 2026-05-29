"use strict";

/**
 * Vilana Contact Form (DE) — v3
 * - Mode picker: Schnell / Catering-Angebot (3 steps)
 * - Step 1: Event | Step 2: Menü + Optionen | Step 3: Übersicht
 * - Date min: today + 3 days
 * - Guests inline validation
 * - Wizard state preserved on close/reopen
 * - Summary cards (not <pre>)
 * - EmailJS sendForm
 * - Anti-spam: honeypot + 3s timing
 */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
      Helpers
  ========================================================= */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const show  = el => el && el.classList.remove("hidden");
  const hide  = el => el && el.classList.add("hidden");
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
  const form         = $("#contactForm");
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

  const fromNameHidden = $("#from_name_hidden");
  const replyToHidden  = $("#reply_to_hidden");
  const subjectHidden  = $("#subject_hidden");
  const msgHidden      = $("#cf-message-hidden");
  const menuSelectedText = $("#menuSelectedText");
  const menuModeHidden   = $("#menuModeHidden");

  // Mode cards
  const modeCardQuick = $("#modeCardQuick");
  const modeCardFull  = $("#modeCardFull");

  /* =========================================================
      Date — min = today + 3 days
  ========================================================= */
  const dateInput = $("#cf-date");
  if (dateInput) {
    const minD = new Date();
    minD.setDate(minD.getDate() + 3);
    dateInput.min = minD.toISOString().split("T")[0];
  }

  /* =========================================================
      Guests — inline validation
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
      Optionen — show/hide detail panels
  ========================================================= */
  const optService    = $("#opt_service");
  const serviceDetails = $("#serviceDetails");
  const optCleanup    = $("#opt_cleanup");
  const cleanupDetails = $("#cleanupDetails");

  function syncService() { toggle(serviceDetails, optService && optService.checked); }
  function syncCleanup() { toggle(cleanupDetails, optCleanup && optCleanup.checked); }
  if (optService) optService.addEventListener("change", syncService);
  if (optCleanup) optCleanup.addEventListener("change", syncCleanup);
  syncService(); syncCleanup();

  /* =========================================================
      Mode Picker
  ========================================================= */
  let currentMode = "quick"; // "quick" | "full"

  function setMode(mode) {
    currentMode = mode;

    // Update cards
    if (modeCardQuick) {
      modeCardQuick.classList.toggle("cf-mode-card--active", mode === "quick");
      modeCardQuick.setAttribute("aria-pressed", String(mode === "quick"));
    }
    if (modeCardFull) {
      modeCardFull.classList.toggle("cf-mode-card--active", mode === "full");
      modeCardFull.setAttribute("aria-pressed", String(mode === "full"));
    }

    // Show/hide wizard
    toggle(wizardWrap, mode === "full");
    toggle(btnQuickSend, mode === "quick");

    if (mode === "full" && btnToggleWizard) {
      btnToggleWizard.textContent = "Zur schnellen Anfrage";
    } else if (btnToggleWizard) {
      btnToggleWizard.textContent = "Catering-Angebot ausfüllen";
    }

    if (mode === "full") showStep(currentStep);
  }

  if (modeCardQuick) modeCardQuick.addEventListener("click", () => setMode("quick"));
  if (modeCardFull)  modeCardFull.addEventListener("click",  () => { setMode("full"); });
  if (btnToggleWizard) btnToggleWizard.addEventListener("click", () => {
    setMode(currentMode === "quick" ? "full" : "quick");
  });
  if (btnCloseWizard) btnCloseWizard.addEventListener("click", () => {
    if (hasWizardData() && !confirm("Erweiterte Daten gehen verloren. Trotzdem schließen?")) return;
    setMode("quick");
  });

  function hasWizardData() {
    const type = $("#cf-eventType");
    const guests = $("#cf-guests");
    const date = $("#cf-date");
    return (type && type.value) || (guests && guests.value) || (date && date.value);
  }

  /* =========================================================
      Wizard — 3 Steps
  ========================================================= */
  const TOTAL_STEPS = 3;
  const stepPanels  = wizardWrap ? $$("[data-step]", wizardWrap) : [];
  const stepTabs    = [$("#stepTab1"), $("#stepTab2"), $("#stepTab3")];
  const STEP_NAMES  = ["Event", "Menü & Optionen", "Übersicht"];
  const STEP_PCTS   = ["33%", "66%", "100%"];

  let currentStep = 1;

  function showStep(n) {
    currentStep = Math.max(1, Math.min(TOTAL_STEPS, n));

    // Panels
    stepPanels.forEach(p => {
      const sn = Number(p.getAttribute("data-step"));
      p.classList.toggle("hidden", sn !== currentStep);
    });

    // Tabs
    stepTabs.forEach((tab, i) => {
      if (!tab) return;
      const sn = i + 1;
      tab.classList.remove("cf-step--active", "cf-step--done");
      if (sn < currentStep) tab.classList.add("cf-step--done");
      if (sn === currentStep) { tab.classList.add("cf-step--active"); tab.setAttribute("aria-current", "step"); }
      else tab.removeAttribute("aria-current");
    });

    // Progress
    const fillEl = $("#wizProgressFill");
    if (fillEl) {
      fillEl.style.width = STEP_PCTS[currentStep - 1];
      const pb = fillEl.closest("[role='progressbar']");
      if (pb) pb.setAttribute("aria-valuenow", Math.round(parseInt(STEP_PCTS[currentStep - 1])));
    }
    const stepLabel = $("#wiz-step-label");
    const stepName  = $("#wiz-step-name");
    if (stepLabel) stepLabel.textContent = `Schritt ${currentStep} von ${TOTAL_STEPS}`;
    if (stepName)  stepName.textContent  = STEP_NAMES[currentStep - 1];

    // Nav buttons
    if (btnBack) {
      toggle(btnBack, currentStep > 1);
    }
    const isLast = currentStep === TOTAL_STEPS;
    if (btnNext) toggle(btnNext, !isLast);
    if (btnWizardSend) toggle(btnWizardSend, isLast);

    // Fill summary on step 3
    if (currentStep === TOTAL_STEPS) fillSummary();
  }

  if (btnBack) btnBack.addEventListener("click", () => showStep(currentStep - 1));
  if (btnNext) btnNext.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1);
  });

  // "Bearbeiten" buttons in summary
  $$("[data-goto]", form).forEach(btn => {
    btn.addEventListener("click", () => showStep(Number(btn.getAttribute("data-goto"))));
  });

  /* =========================================================
      Summary fill
  ========================================================= */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }

  function fillSummary() {
    // EVENT
    const eventType = getVal("cf-eventType");
    const guests    = getVal("cf-guests");
    const date      = getVal("cf-date");
    const time      = getVal("cf-time");
    const plz       = getVal("cf-plz");
    const street    = getVal("cf-street");

    const eventParts = [eventType || "—", guests ? `${guests} Gäste` : null].filter(Boolean).join(" · ");
    const datePart   = [date, time].filter(Boolean).join(", ");
    const locPart    = [plz, street].filter(Boolean).join(", ");
    const sumEventEl = $("#sumEventVal");
    if (sumEventEl) sumEventEl.innerHTML =
      `<strong>${esc(eventParts)}</strong>` +
      (datePart ? `<br><small>${esc(datePart)}</small>` : "") +
      (locPart  ? `<br><small>${esc(locPart)}</small>`  : "");

    // MENÜ — format + prefs + allergies + all selected dishes as tags
    const format    = form.querySelector('input[name="service_format"]:checked')?.value || "—";
    const prefs     = $$('input[name^="pref_"]:checked', form)
      .map(cb => cb.closest("label")?.querySelector("span")?.textContent).filter(Boolean);
    const allergies = getVal("cf-allergies");

    // Build dish tags HTML
    const dishEntries = Object.values(selected); // [{name, catKey}, ...]
    let dishesHtml = "";
    if (dishEntries.length) {
      // Group by category in MENU order
      const grouped = {};
      dishEntries.forEach(d => {
        if (!grouped[d.catKey]) grouped[d.catKey] = [];
        grouped[d.catKey].push(d.name);
      });
      const tagItems = [];
      MENU.forEach(cat => {
        (grouped[cat.key] || []).forEach(name => tagItems.push(name));
      });
      dishesHtml = `<div class="cf-summary__dishes">` +
        tagItems.map(n => `<span class="cf-summary__dish-tag">${esc(n)}</span>`).join("") +
        `</div>`;
    } else {
      dishesHtml = `<small>Gerichte: Vilana schlägt vor</small>`;
    }

    const menuParts = [
      `Format: ${esc(format)}`,
      prefs.length ? `Präf.: ${esc(prefs.join(", "))}` : null,
      allergies ? `Allergene: ${esc(allergies)}` : null,
    ].filter(Boolean);

    const sumMenuEl = $("#sumMenuVal");
    if (sumMenuEl) sumMenuEl.innerHTML =
      menuParts.join("<br>") + (menuParts.length ? "<br>" : "") + dishesHtml;

    // OPTIONEN
    const opts = [];
    if (form.querySelector('input[name="opt_geschirr"]')?.checked) opts.push("Inventar (Geschirr / Besteck / Gläser)");
    if (optService?.checked) {
      const cnt  = getVal("cf-service-count");
      const from = getVal("cf-service-from");
      const to   = getVal("cf-service-to");
      let svc    = "Service Personal";
      if (cnt)        svc += ` (${cnt} Pers.)`;
      if (from || to) svc += ` ${from}–${to}`;
      opts.push(svc);
    }
    if (optCleanup?.checked) opts.push("Abbau & Reinigung");
    const sumOptsEl = $("#sumOptionsVal");
    if (sumOptsEl) sumOptsEl.innerHTML = opts.length
      ? opts.map(o => esc(o)).join("<br>")
      : "Keine Zusatzleistungen";

    // KONTAKT
    const n = (nameInput?.value || "").trim() || "—";
    const e = (email?.value    || "").trim() || "—";
    const p = (phoneInput?.value || "").trim();
    const sumContactEl = $("#sumContactVal");
    if (sumContactEl) sumContactEl.innerHTML =
      `${esc(n)}<br>${esc(e)}${p ? `<br>${esc(p)}` : ""}`;
  }

  /* =========================================================
      Step validation
  ========================================================= */
  function validateStep(n) {
    const panel = stepPanels.find(p => String(p.getAttribute("data-step")) === String(n));
    if (!panel) return true;

    const required = $$("input[required], select[required], textarea[required]", panel)
      .filter(el => !el.disabled && el.closest(".hidden-field") === null);

    for (const el of required) {
      el.setCustomValidity("");
      if (el.id === "cf-guests" || el.name === "guests") {
        const v = parseInt(el.value || "0", 10);
        if (!el.value) el.setCustomValidity("Bitte Gästezahl angeben (mind. 20).");
        else if (v < 20) el.setCustomValidity("Mindestbestellung: ab 20 Personen.");
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
      toast("Bitte Nachricht ausfüllen.");
      return false;
    }
    quickMessage.classList.remove("field-error");

    if (!email || !email.value.trim()) {
      email?.classList.add("field-error");
      email?.focus();
      toast("Bitte E-Mail angeben.");
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
      toast("Bitte AGB & Datenschutz akzeptieren.");
      privacy.focus();
      return false;
    }
    return true;
  }

  /* =========================================================
      Email body builder
  ========================================================= */
  function buildEmailBody() {
    const message   = getVal("cf_message");
    const finalName = (nameInput?.value || "").trim() || "Website Anfrage";
    const finalEmail = (email?.value || "").trim() || "—";
    const finalPhone = (phoneInput?.value || "").trim() || "—";

    const eventType  = getVal("cf-eventType");
    const guests     = getVal("cf-guests");
    const date       = getVal("cf-date");
    const time       = getVal("cf-time");
    const plz        = getVal("cf-plz");
    const street     = getVal("cf-street");
    const location   = [plz, street].filter(Boolean).join(", ") || "—";

    const format = form.querySelector('input[name="service_format"]:checked')?.value || "—";
    const prefs  = $$('input[name^="pref_"]:checked', form)
      .map(cb => cb.closest("label")?.querySelector("span")?.textContent).filter(Boolean).join(", ") || "—";
    const allergies = getVal("cf-allergies") || "—";
    const menuMode  = (menuModeHidden?.value || "").trim() || "—";
    const selectedTxt = (menuSelectedText?.value || "—").trim();

    const optGeschirr = form.querySelector('input[name="opt_geschirr"]')?.checked ? "Ja" : "Nein";
    const optSvc      = optService?.checked ? "Ja" : "Nein";
    const optCleanupV = optCleanup?.checked  ? "Ja" : "Nein";

    return `=== VILANA ANFRAGE ===

[NACHRICHT]
${message}

[KONTAKT]
Name:    ${finalName}
E-Mail:  ${finalEmail}
Telefon: ${finalPhone}

[EVENT]
Typ:     ${eventType || "—"}
Gäste:   ${guests || "—"}
Datum:   ${date ? date + (time ? " " + time : "") : "—"}
Ort:     ${location}

[INKLUSIVE]
- Lieferung
- Buffet-Aufbau

[MENÜ]
Format:       ${format}
Präferenzen:  ${prefs}
Allergene:    ${allergies}
Menü-Modus:   ${menuMode}
Auswahl:
${selectedTxt}

[OPTIONEN]
Inventar (Geschirr/Besteck/Gläser): ${optGeschirr}
Service Personal:                   ${optSvc}
Abbau / Reinigung:                  ${optCleanupV}

=== ENDE ===`;
  }

  /* =========================================================
      EmailJS
  ========================================================= */
  if (window.emailjs) {
    try { emailjs.init({ publicKey: "vfmomNKrMxrf2xqDW" }); } catch (_) {}
  }

  /* =========================================================
      Submit
  ========================================================= */
  let sending = false;

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (sending) return;

    // Honeypot
    if (form.honeypot && form.honeypot.value) return;

    // Timing
    const t0 = Number(startedAt?.value || "0");
    if (t0 && Date.now() - t0 < 3000) return;

    // Validate base fields (always present)
    if (!validateBase()) return;

    // Wizard: validate step 1 minimum
    if (currentMode === "full" && !validateStep(1)) return;

    // Build body
    const body       = buildEmailBody();
    const finalName  = (nameInput?.value || "").trim() || "Website Anfrage";
    const finalEmail = (email?.value || "").trim() || "";
    const eventType  = getVal("cf-eventType");
    const date       = getVal("cf-date");

    const subject = currentMode === "full"
      ? `Vilana Anfrage: ${eventType || "Event"} (${date || "Datum offen"})`
      : "Vilana Anfrage: Schnelle Nachricht";

    if (fromNameHidden) fromNameHidden.value = finalName;
    if (replyToHidden)  replyToHidden.value  = finalEmail;
    if (subjectHidden)  subjectHidden.value  = subject;
    if (msgHidden)      msgHidden.value      = body;

    if (!window.emailjs?.sendForm) {
      alert("EmailJS nicht geladen. Bitte Internet-Verbindung prüfen.");
      return;
    }

    sending = true;
    $$('button[type="submit"]', form).forEach(b => { b.disabled = true; });

    emailjs.sendForm("service_75biswm", "template_fuxgrlb", form, { publicKey: "vfmomNKrMxrf2xqDW" })
      .then(() => {
        // Show success
        const okMsg = currentMode === "full" ? $("#formMsgWizard") : $("#formMsg");
        if (okMsg) show(okMsg);
        toast("Gesendet ✓");

        // Reset
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
        alert("Fehler beim Senden: " + (err?.text || String(err)));
      })
      .finally(() => {
        sending = false;
        $$('button[type="submit"]', form).forEach(b => { b.disabled = false; });
      });
  });

  /* =========================================================
      MENÜ SHEET — Data
  ========================================================= */
  const MENU = [
    { key: "warm", title: "Warme Speisen", items: [
      { id: "warm_01", name: "Schaschlik",                         desc: "Pute, Schwein oder Lamm – mariniert und gegrillt." },
      { id: "warm_02", name: "Gefüllte Paprika",                   desc: "Mit Hackfleisch oder vegetarisch gefüllt." },
      { id: "warm_03", name: "Rinderbraten",                       desc: "Zart geschmort mit klassischer Bratensoße." },
      { id: "warm_04", name: "Lammkoteletts",                      desc: "Mit Rosmarinkartoffeln und Bohnen im Speckmantel." },
      { id: "warm_05", name: "Kohlrouladen (Golubzi)",             desc: "Mit Fleisch-Reis-Füllung in Tomatensoße." },
      { id: "warm_06", name: "Knusprige Hähnchenschnitzel",        desc: "Klassisch paniert und goldbraun gebraten." },
      { id: "warm_07", name: "Hähnchenbrust in Champignonrahmsauce", desc: "Cremige Pilzsoße auf zarter Hähnchenbrust." },
      { id: "warm_08", name: "Köfte / Frikadellen",                desc: "Orientalisch oder klassisch gewürzt." },
      { id: "warm_09", name: "Plov",                               desc: "Reispfanne mit Möhren und Fleisch." },
      { id: "warm_10", name: "Kassler mit Sauerkraut",             desc: "Deftig und traditionell." },
      { id: "warm_11", name: "Hähnchenrouladen mit Spinat in Béarnaise", desc: "Herzhaft gefüllt mit feiner Sauce." },
      { id: "warm_12", name: "Entenbrust mit Orangensauce",        desc: "Fruchtig und edel – perfekt für besondere Anlässe." },
      { id: "warm_13", name: "Kartoffelgratin / Püree",            desc: "Cremige Klassiker als Beilage." },
      { id: "warm_14", name: "China-Nudeln mit Gemüse (vegan)",    desc: "Leicht gewürzt, frisch und aromatisch." },
      { id: "warm_15", name: "Frittierte Calamari",                desc: "Knusprig und zart mit Dip." },
      { id: "warm_16", name: "Gegrillte Garnelen",                 desc: "Aromatisch mariniert, leicht gegrillt." },
      { id: "warm_17", name: "Bohnen im Speckmantel",              desc: "Herzhaft im Speckmantel gebraten." },
      { id: "warm_18", name: "Reis oder Spätzle",                  desc: "Als Beilage zu Fleisch- oder Fischgerichten." },
      { id: "warm_19", name: "Mediterranes Gemüse",                desc: "Gegrillt mit Olivenöl und Kräutern." },
      { id: "warm_20", name: "Gemüse in Sauce Hollandaise",        desc: "Gedämpft mit cremiger Sauce Hollandaise." },
      { id: "warm_21", name: "Lachs in Kräuterrahmsauce",          desc: "Zartes Filet in cremiger Kräutersauce." },
      { id: "warm_22", name: "Zanderfilet in Dillsauce",           desc: "Mild gegart in feiner Dillsahnesauce." },
    ]},
    { key: "cold", title: "Kalte Platten", items: [
      { id: "cold_01", name: "Auberginen mit Tomaten geschichtet", desc: "Aromatisch mariniert." },
      { id: "cold_02", name: "Tomate-Mozzarella",                  desc: "Klassiker mit Basilikum und Balsamico." },
      { id: "cold_03", name: "Surimi",                             desc: "Frisch oder als Häppchen." },
      { id: "cold_04", name: "Frittierte Surimi im Knuspermantel", desc: "Knusprig ummantelte Meeresfrüchte." },
      { id: "cold_05", name: "Gefüllte Eier",                      desc: "Hausgemacht mit feiner Creme." },
      { id: "cold_06", name: "Garnelen im Kartoffelfadenmantel",   desc: "Knusprig, elegant, ein Hingucker." },
      { id: "cold_07", name: "Antipasti",                          desc: "Mediterraner Mix aus Gemüse & Käse." },
      { id: "cold_08", name: "Sarma (gefüllte Weinblätter)",       desc: "Mild gewürzt, auf Wunsch vegan." },
      { id: "cold_09", name: "Sushi",                              desc: "Frisch und kreativ serviert." },
      { id: "cold_10", name: "Baguette mit Lachs",                 desc: "Frisch belegt mit Dill und Creme." },
      { id: "cold_11", name: "Avocadocreme / Hummus",              desc: "Cremige Dips als Vorspeise." },
      { id: "cold_12", name: "Garnelencreme",                      desc: "Fein abgeschmeckt als Dip." },
      { id: "cold_13", name: "Kanapee (Häppchen)",                 desc: "Elegant belegte Appetizer." },
      { id: "cold_14", name: "Fischplatte",                        desc: "Butterfisch, Lachs, Hering, Makrele." },
      { id: "cold_15", name: "Käse- und Schinkenplatte",           desc: "Ausgewählte Spezialitäten." },
    ]},
    { key: "salad", title: "Salate", items: [
      { id: "salad_01", name: "Pilzsalat",                         desc: "Mit marinierten Champignons." },
      { id: "salad_02", name: "Möhrensalat",                       desc: "Geraspelt mit Apfel oder Knoblauch." },
      { id: "salad_03", name: "Krabbensalat",                      desc: "Mit Mayo und Gemüsewürfeln." },
      { id: "salad_04", name: "Sommersalat",                       desc: "Mit Gurke, Tomate, Paprika." },
      { id: "salad_05", name: "Rucola-Salat",                      desc: "Mit Parmesan und Balsamico." },
      { id: "salad_06", name: "Chinakohlsalat",                    desc: "Knackig, leicht süßlich." },
      { id: "salad_07", name: "Spitzkohlsalat mit Pistazien",      desc: "Fein geschnitten, nussiges Topping." },
      { id: "salad_08", name: "Griechischer Salat",                desc: "Mit Feta, Gurken, Tomaten, Oliven." },
      { id: "salad_09", name: "Tomaten-Oliven-Salat",              desc: "Mit Zwiebeln und Kräutern." },
      { id: "salad_10", name: "Granatapfelsalat",                  desc: "Fruchtige Note, knackiges Gemüse." },
      { id: "salad_11", name: "Heringssalat (Pod Schuboj)",        desc: "Mit Roter Bete und Mayo." },
      { id: "salad_12", name: "Kartoffelsalat (Olivje)",           desc: "Mit Erbsen, Ei und Mayo." },
      { id: "salad_13", name: "Vinegret",                          desc: "Russische Rote-Bete-Gemüsemischung." },
    ]},
    { key: "dessert", title: "Nachspeisen", items: [
      { id: "dessert_01", name: "Windbeutel-Dessert",              desc: "Gefüllt mit Vanillecreme und Sahne." },
      { id: "dessert_02", name: "Lotus-Keks-Dessert",              desc: "Cremig mit karamellisierten Keksen." },
      { id: "dessert_03", name: "Mousse au Chocolat",              desc: "Luftige Schokocreme." },
      { id: "dessert_04", name: "Panna Cotta",                     desc: "Klassisch mit Fruchtsauce." },
      { id: "dessert_05", name: "Tiramisu",                        desc: "Mit Mascarpone, Kaffee, Kakao." },
      { id: "dessert_06", name: "Früchte mit Schokoladenüberzug",  desc: "Frisches Obst mit Schokolade." },
      { id: "dessert_07", name: "Cookiedessert mit Weintrauben",   desc: "Knusprig und cremig." },
    ]},
    { key: "candy", title: "Candy Bar", items: [
      { id: "candy_01", name: "Donuts",                            desc: "Bunt dekoriert." },
      { id: "candy_02", name: "Cake Pops",                         desc: "Kleine Kuchen am Stiel." },
      { id: "candy_03", name: "CupCakes",                          desc: "Mit cremigem Topping." },
      { id: "candy_04", name: "Popcorn",                           desc: "Klassisch, süß oder salzig." },
      { id: "candy_05", name: "Fruchtgummi Bärenköpfe",            desc: "Für alle Gäste." },
      { id: "candy_06", name: "Fruchtgummi Schnüre",               desc: "Bunte Vielfalt." },
      { id: "candy_07", name: "Fruchtgummi Schnuckies",            desc: "Fruchtige Überraschung." },
      { id: "candy_08", name: "Schokolade",                        desc: "Weiß, Vollmilch, Zartbitter." },
    ]},
  ];

  /* =========================================================
      MENÜ SHEET — State & Elements
  ========================================================= */
  const selected   = {};
  let activeCatKey = MENU[0]?.key || "warm";

  const menuModal       = $("#menuModal");
  const menuClose       = $("#menuClose");
  const menuApply       = $("#menuApply");
  const menuCount       = $("#menuCount");
  const menuCats        = $("#menuCats");
  const menuItems       = $("#menuItems");
  const menuModalSearch = $("#menuModalSearch");
  const menuModalReset  = $("#menuModalReset");
  const menuRow         = $("#menuRow");
  const menuRowHint     = $("#menuRowHint");

  function updateMenuHiddenFields() {
    const entries = Object.entries(selected);

    // Tags container under menu row button
    let tagsEl = $("#menuRowTags");
    if (!tagsEl && menuRow) {
      tagsEl = document.createElement("div");
      tagsEl.id = "menuRowTags";
      tagsEl.className = "cf-menu-tags";
      menuRow.insertAdjacentElement("afterend", tagsEl);
    }

    if (!entries.length) {
      if (menuModeHidden)   menuModeHidden.value   = "Keine Auswahl (Vilana schlägt vor)";
      if (menuSelectedText) menuSelectedText.value = "—";
      if (menuRowHint)      menuRowHint.textContent = "Keine Auswahl – Vilana schlägt vor";
      if (menuCount)        menuCount.textContent   = "0";
      if (tagsEl)           tagsEl.innerHTML        = "";
      return;
    }

    // Group by category order
    const groups = {};
    entries.forEach(([id, v]) => {
      if (!groups[v.catKey]) groups[v.catKey] = [];
      groups[v.catKey].push(v);
    });
    const lines = [];
    MENU.forEach(cat => (groups[cat.key] || []).forEach(x => lines.push(`• ${cat.title}: ${x.name}`)));

    if (menuModeHidden)   menuModeHidden.value   = "Gerichte ausgewählt";
    if (menuSelectedText) menuSelectedText.value = lines.join("\n");
    if (menuRowHint)      menuRowHint.textContent = `${entries.length} Gericht${entries.length !== 1 ? "e" : ""} ausgewählt`;
    if (menuCount)        menuCount.textContent   = String(entries.length);

    // Render tags under the row button
    if (tagsEl) {
      const allNames = [];
      MENU.forEach(cat => (groups[cat.key] || []).forEach(x => allNames.push(x.name)));
      tagsEl.innerHTML = allNames
        .map(n => `<span class="cf-menu-tag">${esc(n)}</span>`)
        .join("");
    }
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
      btn.innerHTML = `<span class="v-sheet__catTitle">${esc(cat.title)}</span><span class="v-sheet__catMeta">${cat.items.length} Gerichte</span>`;
      menuCats.appendChild(btn);
    });
  }

  function renderItems(q = "") {
    if (!menuItems) return;
    const cat   = getCatByKey(activeCatKey);
    const items = q ? cat.items.filter(i => i.name.toLowerCase().includes(q) || (i.desc||"").toLowerCase().includes(q)) : cat.items;
    menuItems.innerHTML = "";
    if (!items.length) { menuItems.innerHTML = `<div class="v-sheet__empty">Keine Treffer.</div>`; return; }
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
          data-toggle="${esc(item.id)}" aria-label="${on ? "Entfernen" : "Hinzufügen"}">
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
        toast("Entfernt");
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
      toast("Hinzugefügt ✓");
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
      toast("Reset ✓");
    });
  }

  if (menuApply) {
    menuApply.addEventListener("click", () => {
      updateMenuHiddenFields();
      closeMenuSheet();
      toast("Übernommen ✓");
    });
  }

  /* =========================================================
      Init
  ========================================================= */
  updateMenuHiddenFields();
  setMode("quick");    // start in quick mode
  showStep(1);
  hide(btnBack);       // back hidden on step 1

});