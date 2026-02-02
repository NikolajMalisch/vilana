"use strict";

/**
 * Vilana Contact Form (DE)
 * - Quick Anfrage (Nachricht + E-Mail Pflicht)
 * - Wizard (Erweitert) mit Stepper + Menüauswahl
 * - EmailJS Versand (sendForm) + publicKey
 * - Anti-Spam: Honeypot + Timing (3s)
 *
 * WICHTIG (HTML Erwartung):
 * - Wizard Steps: data-step="1..4" (4 Schritte, Step 4 = Übersicht)
 * - Step Dots: #stepDot1..#stepDot4
 * - Submit Buttons: besser UNIQUE IDs (kein Duplicate btnQuickSend!)
 * - Hidden EmailJS Felder:
 *   - #from_name_hidden (name="from_name")
 *   - #reply_to_hidden  (name="reply_to")
 *   - #subject_hidden   (name="subject")
 *   - #cf-message-hidden (name="message")
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

    // Optional (falls im HTML noch vorhanden)
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

    // Anti-spam honeypot (name="honeypot" уже есть в HTML)
    // form.honeypot доступен, если name="honeypot"

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
            Menü (Erweitert)
    ========================================================== */
    const btnToggleAdvancedMenu = $("#btnToggleAdvancedMenu");
    const menuSelectBox = $("#menuSelectBox");
    const menuModeHidden = $("#menuModeHidden");
    const menuSelectedText = $("#menuSelectedText");
    const menuCategoriesEl = $("#menuCategories");
    const menuSelectedEl = $("#menuSelected");
    const menuSearch = $("#menuSearch");
    const menuReset = $("#menuReset");
    const btnClearSel = $("#btnClearSel");

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

    const CAT_UI = {
        warm: { chip: "bg-amber-50 text-amber-900 border-amber-200", rail: "border-amber-400", head: "from-amber-50/80 to-white", dot: "bg-amber-400" },
        cold: { chip: "bg-sky-50 text-sky-900 border-sky-200", rail: "border-sky-400", head: "from-sky-50/80 to-white", dot: "bg-sky-400" },
        salad: { chip: "bg-emerald-50 text-emerald-900 border-emerald-200", rail: "border-emerald-400", head: "from-emerald-50/80 to-white", dot: "bg-emerald-400" },
        dessert: { chip: "bg-rose-50 text-rose-900 border-rose-200", rail: "border-rose-400", head: "from-rose-50/80 to-white", dot: "bg-rose-400" },
        candy: { chip: "bg-violet-50 text-violet-900 border-violet-200", rail: "border-violet-400", head: "from-violet-50/80 to-white", dot: "bg-violet-400" }
    };
    function catUI(key) {
        return CAT_UI[key] || { chip: "bg-gray-50 text-gray-900 border-gray-200", rail: "border-gray-300", head: "from-gray-50/80 to-white", dot: "bg-gray-300" };
    }

    // State
    const selected = {}; // id -> { name, catKey }
    let advancedMenuOpen = false;

    // Offen/zu pro Kategorie (damit NICHT zuklappt nach Auswahl)
    const openCats = {}; // key -> bool

    function setAdvancedMenu(open) {
        advancedMenuOpen = open;
        if (menuSelectBox) menuSelectBox.classList.toggle("hidden", !open);
        if (btnToggleAdvancedMenu) btnToggleAdvancedMenu.textContent = open ? "Erweitert schließen" : "Erweitert: Gerichte auswählen (optional)";
        if (menuModeHidden) menuModeHidden.value = open ? "Gerichte ausgewählt" : "Keine Auswahl (Vilana schlägt vor)";
    }
    if (btnToggleAdvancedMenu) btnToggleAdvancedMenu.addEventListener("click", () => setAdvancedMenu(!advancedMenuOpen));
    setAdvancedMenu(false);

    function updateToggleButtons(id, isAdded) {
        if (!menuCategoriesEl) return;
        const btns = $$(`[data-toggle="${CSS.escape(id)}"]`, menuCategoriesEl);
        btns.forEach(btn => {
            btn.classList.toggle("btn-added", isAdded);
            btn.classList.toggle("btn-add", !isAdded);
            btn.setAttribute("aria-label", isAdded ? "Auswahl entfernen" : "Zur Auswahl hinzufügen");
            btn.setAttribute("title", isAdded ? "Entfernen" : "Hinzufügen");
            const span = btn.querySelector("span");
            if (span) span.textContent = isAdded ? "✓" : "+";
        });
    }

    function renderCategories(query = "") {
        if (!menuCategoriesEl) return;

        const q = query.trim().toLowerCase();
        menuCategoriesEl.innerHTML = "";

        MENU.forEach(cat => {
            const items = !q ? cat.items : cat.items.filter(i =>
                i.name.toLowerCase().includes(q) || (i.desc || "").toLowerCase().includes(q)
            );
            if (!items.length) return;

            const ui = catUI(cat.key);

            // Wenn gesucht wird: Kategorien automatisch öffnen
            const isOpen = q ? true : !!openCats[cat.key];

            const wrap = document.createElement("div");
            wrap.className = `rounded-2xl border border-gray-200 overflow-hidden bg-white border-l-4 ${ui.rail} shadow-soft`;

            wrap.innerHTML = `
        <button type="button"
        class="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-b ${ui.head} hover:bg-black/5 transition"
        aria-expanded="${isOpen ? "true" : "false"}" data-acc="${esc(cat.key)}">
        <div class="flex items-center gap-3">
            <span class="inline-flex h-2 w-2 rounded-full ${ui.dot}"></span>
            <span class="text-sm font-semibold text-gray-900">${esc(cat.title)}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full border ${ui.chip}">
            ${items.length} Gerichte
            </span>
        </div>
        <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-700" data-acc-label>${isOpen ? "Verbergen" : "Anzeigen"}</span>
            <svg class="h-4 w-4 text-gray-600 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
            </svg>
        </div>
        </button>
        <div class="p-4 space-y-2 ${isOpen ? "" : "hidden"} bg-white" data-panel="${esc(cat.key)}"></div>
      `;

            const panel = wrap.querySelector(`[data-panel="${cat.key}"]`);

            items.forEach(item => {
                const isAdded = !!selected[item.id];

                const row = document.createElement("div");
                row.className = "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 bg-white hover:border-gray-300 hover:shadow-sm transition";

                row.innerHTML = `
        <div class="min-w-0">
            <div class="text-sm font-medium text-gray-900 leading-snug break-words">${esc(item.name)}</div>
            ${item.desc ? `<div class="text-xs text-gray-500 mt-0.5 hidden sm:block">${esc(item.desc)}</div>` : ``}
        </div>

        <button type="button"
            class="shrink-0 grid place-items-center h-9 w-9 rounded-full border transition btn-add-base ${isAdded ? "btn-added" : "btn-add"}"
            data-toggle="${esc(item.id)}"
            aria-label="${isAdded ? "Auswahl entfernen" : "Zur Auswahl hinzufügen"}"
            title="${isAdded ? "Entfernen" : "Hinzufügen"}">
            <span class="text-base leading-none">${isAdded ? "✓" : "+"}</span>
        </button>
        `;
                panel.appendChild(row);
            });

            // Delegation
            wrap.addEventListener("click", (e) => {
                // accordion toggle
                const accBtn = e.target.closest("[data-acc]");
                if (accBtn) {
                    const key = accBtn.getAttribute("data-acc");
                    const pnl = wrap.querySelector(`[data-panel="${key}"]`);
                    const nowOpen = pnl.classList.contains("hidden"); // будет открыть
                    pnl.classList.toggle("hidden", !nowOpen);
                    accBtn.setAttribute("aria-expanded", String(nowOpen));
                    openCats[key] = nowOpen;

                    const label = accBtn.querySelector("[data-acc-label]");
                    if (label) label.textContent = nowOpen ? "Verbergen" : "Anzeigen";
                    accBtn.classList.toggle("acc-open", nowOpen);
                    return;
                }

                // item toggle add/remove
                const tglBtn = e.target.closest("[data-toggle]");
                if (tglBtn) {
                    const id = tglBtn.getAttribute("data-toggle");
                    if (!id) return;

                    if (selected[id]) {
                        delete selected[id];
                        updateToggleButtons(id, false);
                        renderSelected();
                        toast("Entfernt");
                        return;
                    }

                    // find item
                    let found = null, foundCatKey = null;
                    for (const c of MENU) {
                        const x = c.items.find(it => it.id === id);
                        if (x) { found = x; foundCatKey = c.key; break; }
                    }
                    if (!found) return;

                    selected[id] = { name: found.name, catKey: foundCatKey };
                    updateToggleButtons(id, true);
                    renderSelected();
                    toast("Hinzugefügt ✓");
                }
            });

            menuCategoriesEl.appendChild(wrap);
        });
    }

    function renderSelected() {
        if (!menuSelectedEl) return;

        const entries = Object.entries(selected).map(([id, v]) => ({ id, ...v }));
        menuSelectedEl.innerHTML = "";

        if (!entries.length) {
            menuSelectedEl.innerHTML = `<div class="text-sm text-gray-600">Noch keine Auswahl.</div>`;
            if (menuSelectedText) menuSelectedText.value = "—";
            return;
        }

        const groups = {};
        entries.forEach(it => {
            const k = it.catKey || "other";
            if (!groups[k]) groups[k] = [];
            groups[k].push(it);
        });

        const emailLines = [];

        MENU.forEach(cat => {
            const list = groups[cat.key] || [];
            if (!list.length) return;

            const ui = catUI(cat.key);

            const groupWrap = document.createElement("div");
            groupWrap.className = "rounded-2xl border border-gray-200 bg-white/90 overflow-hidden";

            groupWrap.innerHTML = `
        <div class="px-3 py-2 bg-gradient-to-b ${ui.head} border-b border-gray-200 flex items-center gap-2">
        <span class="inline-flex h-2 w-2 rounded-full ${ui.dot}"></span>
        <div class="text-xs font-semibold text-gray-900">${esc(cat.title)}</div>
        </div>
        <div class="p-3 space-y-2" data-group="${esc(cat.key)}"></div>
        `;

            const body = groupWrap.querySelector(`[data-group="${cat.key}"]`);

            list.forEach(x => {
                const card = document.createElement("div");
                card.className = "rounded-xl border border-gray-200 bg-white p-3 shadow-sm";

                card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
        <div class="text-sm font-medium text-gray-900 truncate">${esc(x.name)}</div>
        </div>
        <button type="button"
            class="text-xs font-semibold text-gray-600 hover:text-gray-900 underline underline-offset-2"
            data-remove="${esc(x.id)}">
            Entfernen
            </button>
        </div>
        `;
                body.appendChild(card);
                emailLines.push(`• ${cat.title}: ${x.name}`);
            });

            menuSelectedEl.appendChild(groupWrap);
        });

        if (menuSelectedText) menuSelectedText.value = emailLines.join("\n");
    }

    if (menuSelectedEl) {
        menuSelectedEl.addEventListener("click", (e) => {
            const rem = e.target.closest("[data-remove]")?.getAttribute("data-remove");
            if (rem && selected[rem]) {
                delete selected[rem];
                updateToggleButtons(rem, false);
                renderSelected();
                toast("Entfernt");
            }
        });
    }

    if (btnClearSel) {
        btnClearSel.addEventListener("click", () => {
            const keys = Object.keys(selected);
            if (!keys.length) return;
            keys.forEach(k => {
                delete selected[k];
                updateToggleButtons(k, false);
            });
            renderSelected();
            toast("Auswahl geleert");
        });
    }

    if (menuSearch) {
        menuSearch.addEventListener("input", () => renderCategories(menuSearch.value));
    }
    if (menuReset) {
        menuReset.addEventListener("click", () => {
            if (menuSearch) menuSearch.value = "";
            renderCategories("");
        });
    }

    renderCategories("");
    renderSelected();

    /* =========================================================
          Wizard Validation
    ========================================================== */
    function validateWizardStep(n) {
        const block = steps.find(s => String(s.getAttribute("data-step")) === String(n));
        if (!block) return true;

        const els = $$("input, select, textarea", block).filter(el => !el.disabled && el.type !== "hidden");

        for (const el of els) {
            // Gästezahl min 20
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
                quickMessage.reportValidity?.();
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
            { publicKey: "vfmomNKrMxrf2xqDW" }
        )
            .then(() => {
                const ok = $("#formMsg");
                if (ok) ok.classList.remove("hidden");
                toast("Gesendet ✓");

                form.reset();
                if (startedAt) startedAt.value = String(Date.now());

                // clear selection
                Object.keys(selected).forEach(k => {
                    delete selected[k];
                    updateToggleButtons(k, false);
                });
                renderSelected();

                // close advanced menu
                setAdvancedMenu(false);

                // reset wizard
                syncService();
                syncCleanup();
                setWizard(false);
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
