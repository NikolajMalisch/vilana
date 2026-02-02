"use strict";

/**
 * Vilana Contact Form
 * - Quick Anfrage (Nachricht + E-Mail Pflicht)
 * - Wizard (Erweitert) mit Stepper + Menüauswahl
 * - EmailJS Versand (sendForm)
 * - Anti-Spam: Honeypot + Timing
 * - Menu: toggle item (click add/remove)
 */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
            Kleine Helpers
    ========================================================== */
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();

    const toastEl = document.getElementById("toast");
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
    const btn = document.getElementById("menuToggle");
    const menu = document.getElementById("mobileMenu");
    if (btn && menu) {
        const setOpen = (open) => {
            menu.classList.toggle("hidden", !open);
            btn.setAttribute("aria-expanded", String(open));
        };
        btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(menu.classList.contains("hidden")); });
        document.addEventListener("click", (e) => {
            if (!menu.classList.contains("hidden")) {
                const inside = menu.contains(e.target) || btn.contains(e.target);
                if (!inside) setOpen(false);
            }
        });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
        menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    }

    /* =========================================================
            Anti-bot timing start
    ========================================================== */
    const startedAt = document.getElementById("cf_started_at");
    if (startedAt) startedAt.value = String(Date.now());

    /* =========================================================
            Form refs
    ========================================================== */
    const form = document.getElementById("contactForm");
    if (!form) return;

    const quickMessage = document.getElementById("cf_message");
    const privacy = document.getElementById("cf-privacy");

    // Quick contact (oben)
    const name = document.getElementById("name");
    const email = document.getElementById("email");      // Pflicht
    const phone = document.getElementById("cf-phone");   // optional

    // Wizard contact (Step 4, optional – wird nur genutzt, wenn ausgefüllt)
    const name2 = document.getElementById("name2");
    const email2 = document.getElementById("email2");
    const phone2 = document.getElementById("phone2");

    // Wizard toggle
    const btnToggleWizard = document.getElementById("btnToggleWizard");
    const wizardWrap = document.getElementById("wizardWrap");
    const btnQuickSend = document.getElementById("btnQuickSend");
    const btnCloseWizard = document.getElementById("btnCloseWizard");

    // Wizard steps
    const steps = wizardWrap ? Array.from(wizardWrap.querySelectorAll("[data-step]")) : [];
    const dots = [1, 2, 3, 4, 5].map(n => document.getElementById("stepDot" + n));
    const btnBack = document.getElementById("btnBack");
    const btnNext = document.getElementById("btnNext");
    const summaryBox = document.getElementById("summaryBox");

    // Hidden EmailJS vars
    const fromNameHidden = document.getElementById("from_name_hidden");
    const replyToHidden = document.getElementById("reply_to_hidden");
    const subjectHidden = document.getElementById("subject_hidden");
    const msgHidden = document.getElementById("cf-message-hidden");

    // Menü
    const btnToggleAdvancedMenu = document.getElementById("btnToggleAdvancedMenu");
    const menuSelectBox = document.getElementById("menuSelectBox");
    const menuModeHidden = document.getElementById("menuModeHidden");
    const menuSelectedText = document.getElementById("menuSelectedText");
    const menuCategoriesEl = document.getElementById("menuCategories");
    const menuSelectedEl = document.getElementById("menuSelected");
    const menuSearch = document.getElementById("menuSearch");
    const menuReset = document.getElementById("menuReset");
    const btnClearSel = document.getElementById("btnClearSel");

    // (optional) Collapse Categories
    const btnToggleMenuCats = document.getElementById("btnToggleMenuCats");
    const menuCatsPanel = document.getElementById("menuCatsPanel");

    // Optionen toggles
    const optService = document.getElementById("opt_service");
    const serviceDetails = document.getElementById("serviceDetails");
    const optCleanup = document.getElementById("opt_cleanup");
    const cleanupDetails = document.getElementById("cleanupDetails");

    /* =========================================================
            Wizard open/close
    ========================================================== */
    let wizardOpen = false;

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

    /* =========================================================
            Optionen Details (Service/Cleanup) – show/hide
    ========================================================== */
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
            MENU DATA
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
                { id: "candy_08", name: "Schokolade in Variationen", desc: "Weiße, Vollmilch, Zartbitter." }
            ]
        }
    ];

    /* =========================================================
            Category UI (Tailwind classes) – can stay for now
            (CSS overrides may repaint them)
    ========================================================== */
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

    /* =========================================================
            Menü Auswahl State (keine Mengen, keine IDs sichtbar)
    ========================================================== */
    const selected = {}; // id -> { name, catKey }
    let advancedMenuOpen = false;

    function setAdvancedMenu(open) {
        advancedMenuOpen = open;
        if (menuSelectBox) menuSelectBox.classList.toggle("hidden", !open);
        if (btnToggleAdvancedMenu) btnToggleAdvancedMenu.textContent = open ? "Erweitert schließen" : "Erweitert: Gerichte auswählen (optional)";
        if (menuModeHidden) menuModeHidden.value = open ? "Gerichte ausgewählt" : "Keine Auswahl (Vilana schlägt vor)";
    }
    if (btnToggleAdvancedMenu) btnToggleAdvancedMenu.addEventListener("click", () => setAdvancedMenu(!advancedMenuOpen));
    setAdvancedMenu(false);

    // Optional collapse categories panel
    if (btnToggleMenuCats && menuCatsPanel) {
        btnToggleMenuCats.addEventListener("click", () => {
            const isHidden = menuCatsPanel.classList.toggle("hidden");
            btnToggleMenuCats.setAttribute("aria-expanded", String(!isHidden));
        });
    }

    /* =========================================================
            Render Kategorien (Accordion) + Auswahl
            - click on button[data-toggle] => add/remove
    ========================================================== */
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

            const wrap = document.createElement("div");
            wrap.className = `rounded-2xl border border-gray-200 overflow-hidden bg-white border-l-4 ${ui.rail} shadow-soft`;

            wrap.innerHTML = `
        <button type="button"
          class="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-b ${ui.head} hover:bg-black/5 transition"
          aria-expanded="false" data-acc="${esc(cat.key)}">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-2 w-2 rounded-full ${ui.dot}"></span>
            <span class="text-sm font-semibold text-gray-900">${esc(cat.title)}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full border ${ui.chip}">
              ${items.length} Gerichte
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-700" data-acc-label>Anzeigen</span>
            <svg class="h-4 w-4 text-gray-600 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
            </svg>
          </div>
        </button>
        <div class="p-4 space-y-2 hidden bg-white" data-panel="${esc(cat.key)}"></div>
      `;

            const panel = wrap.querySelector(`[data-panel="${cat.key}"]`);

            items.forEach(item => {
                const isAdded = !!selected[item.id];

                const row = document.createElement("div");
                row.className =
                    "flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 bg-white hover:border-gray-300 hover:shadow-sm transition";

                row.innerHTML = `
        <div class="min-w-0">
            <div class="text-sm font-medium text-gray-900 leading-snug break-words">
            ${esc(item.name)}
        </div>

            ${item.desc ? `<div class="text-xs text-gray-500 mt-0.5 hidden sm:block">${esc(item.desc)}</div>` : ``}
        </div>

        <button type="button"
        class="shrink-0 grid place-items-center
        h-9 w-9 rounded-full border transition
        btn-add-base ${isAdded ? "btn-added" : "btn-add"}"
        data-toggle="${esc(item.id)}"
        aria-label="${isAdded ? "Auswahl entfernen" : "Zur Auswahl hinzufügen"}"
        title="${isAdded ? "Entfernen" : "Hinzufügen"}">
        <span class="text-base leading-none">${isAdded ? "✓" : "+"}</span>
        </button>
        `;

                panel.appendChild(row);
            });

            // single delegated handler per category box
            wrap.addEventListener("click", (e) => {
                // accordion toggle
                const accBtn = e.target.closest("[data-acc]");
                if (accBtn) {
                    const key = accBtn.getAttribute("data-acc");
                    const pnl = wrap.querySelector(`[data-panel="${key}"]`);
                    const isOpen = !pnl.classList.contains("hidden");

                    pnl.classList.toggle("hidden", isOpen);
                    accBtn.setAttribute("aria-expanded", String(!isOpen));

                    const label = accBtn.querySelector("[data-acc-label]");
                    if (label) label.textContent = isOpen ? "Anzeigen" : "Verbergen";
                    accBtn.classList.toggle("acc-open", !isOpen);
                    return;
                }

                // item toggle add/remove
                const tglBtn = e.target.closest("[data-toggle]");
                if (tglBtn) {
                    const id = tglBtn.getAttribute("data-toggle");
                    if (!id) return;

                    // remove if exists
                    if (selected[id]) {
                        delete selected[id];
                        renderSelected();
                        renderCategories(menuSearch ? menuSearch.value : "");
                        toast("Entfernt");
                        return;
                    }

                    // add if not exists
                    let found = null, foundCatKey = null;
                    for (const c of MENU) {
                        const x = c.items.find(it => it.id === id);
                        if (x) { found = x; foundCatKey = c.key; break; }
                    }
                    if (!found) return;

                    selected[id] = { name: found.name, catKey: foundCatKey };
                    renderSelected();
                    renderCategories(menuSearch ? menuSearch.value : "");
                    toast("Hinzugefügt ✓");
                    return;
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
                renderSelected();
                renderCategories(menuSearch ? menuSearch.value : "");
                toast("Entfernt");
            }
        });
    }

    if (btnClearSel) {
        btnClearSel.addEventListener("click", () => {
            const keys = Object.keys(selected);
            if (!keys.length) return;
            keys.forEach(k => delete selected[k]);
            renderSelected();
            renderCategories(menuSearch ? menuSearch.value : "");
            toast("Auswahl geleert");
        });
    }

    if (menuSearch) menuSearch.addEventListener("input", () => renderCategories(menuSearch.value));
    if (menuReset) menuReset.addEventListener("click", () => {
        if (menuSearch) menuSearch.value = "";
        renderCategories("");
    });

    renderCategories("");
    renderSelected();

    /* =========================================================
            Wizard Stepper Logic
    ========================================================== */
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
        current = n;
        steps.forEach(s => s.classList.toggle("hidden", String(s.getAttribute("data-step")) !== String(n)));

        const isFirst = n === 1;
        if (btnBack) {
            btnBack.disabled = isFirst;
            btnBack.classList.toggle("opacity-50", isFirst);
            btnBack.classList.toggle("cursor-not-allowed", isFirst);
        }
        if (btnNext) btnNext.classList.toggle("hidden", n === 5);

        setDots(n);

        if (n === 5 && summaryBox) {
            summaryBox.textContent = buildStructuredEmail().preview;
        }
    }

    function validateWizardStep(n) {
        const block = steps.find(s => String(s.getAttribute("data-step")) === String(n));
        if (!block) return true;

        const els = Array.from(block.querySelectorAll("input, select, textarea"))
            .filter(el => !el.disabled && el.type !== "hidden");

        for (const el of els) {
            if (el.name === "guests") {
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

    if (btnBack) btnBack.addEventListener("click", () => { if (current > 1) showStep(current - 1); });
    if (btnNext) btnNext.addEventListener("click", () => {
        if (!validateWizardStep(current)) return;
        showStep(current + 1);
    });

    /* =========================================================
            Basis-Validierung (immer):
                - Nachricht Pflicht
                - E-Mail Pflicht (egal ob Wizard offen/zu)
                - Datenschutz Pflicht
    ========================================================== */
    function validateBase() {
        // Nachricht Pflicht
        if (!quickMessage || !quickMessage.value.trim()) {
            if (quickMessage) {
                quickMessage.classList.add("field-error");
                quickMessage.focus();
                quickMessage.reportValidity();
            }
            toast("Bitte Nachricht ausfüllen.");
            return false;
        }
        quickMessage.classList.remove("field-error");

        // E-Mail Pflicht: entweder email2 oder email
        const e2 = (email2 && email2.value) ? email2.value.trim() : "";
        const e1 = (email && email.value) ? email.value.trim() : "";
        const finalEmail = e2 || e1;

        if (!finalEmail) {
            if (email) {
                email.classList.add("field-error");
                email.focus();
                email.reportValidity?.();
            }
            toast("Bitte E-Mail angeben.");
            return false;
        }

        // Validierung Quick
        if (!e2 && email && !email.checkValidity()) {
            email.classList.add("field-error");
            email.focus();
            email.reportValidity();
            return false;
        }

        // Validierung Wizard email2
        if (e2 && email2 && !email2.checkValidity()) {
            email2.classList.add("field-error");
            email2.focus();
            email2.reportValidity();
            return false;
        }

        if (email) email.classList.remove("field-error");
        if (email2) email2.classList.remove("field-error");

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

        const qName = getVal("name");
        const qEmail = getVal("email");
        const qPhone = getVal("cf-phone");

        const wName = getVal("name2");
        const wEmail = getVal("email2");
        const wPhone = getVal("phone2");

        const finalName = wName || qName || "—";
        const finalEmail = wEmail || qEmail || "—";
        const finalPhone = wPhone || qPhone || "—";

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
• Name: ${finalName}
• E-Mail: ${finalEmail}
• Telefon: ${finalPhone}

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
Name: ${finalName}
E-Mail: ${finalEmail}
Telefon: ${finalPhone}

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
        try { emailjs.init("vfmomNKrMxrf2xDW"); } catch (e) { /* ignore */ }
    }

    /* =========================================================
            Submit (Quick + Wizard über ein Formular)
    ========================================================== */
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Honeypot
        if (form.honeypot && form.honeypot.value) return;

        // Minimal timing check (3 sec)
        const t0 = Number(document.getElementById("cf_started_at")?.value || "0");
        if (t0 && (Date.now() - t0) < 3000) return;

        // Basis-Checks (Nachricht + E-Mail + Datenschutz)
        if (!validateBase()) return;

        // Wenn Wizard offen: Event Step 1 muss ok sein
        if (wizardOpen) {
            if (!validateWizardStep(1)) return;
        }

        const { emailBody } = buildStructuredEmail();

        // final values for template
        const finalName = (getVal("name2") || getVal("name") || "Website Anfrage").trim();
        const finalEmail = (getVal("email2") || getVal("email") || "").trim();

        const subj =
            wizardOpen
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

        emailjs.sendForm("service_75biswm", "template_fuxgrlb", form)
            .then(() => {
                const ok = document.getElementById("formMsg");
                if (ok) ok.classList.remove("hidden");
                toast("Gesendet ✓");

                form.reset();
                if (startedAt) startedAt.value = String(Date.now());

                Object.keys(selected).forEach(k => delete selected[k]);
                renderSelected();
                renderCategories("");
                setAdvancedMenu(false);

                syncService();
                syncCleanup();
                setWizard(false);
            })
            .catch((err) => {
                alert("Fehler beim Senden: " + (err && err.text ? err.text : err));
            });
    });

    if (wizardWrap) {
        wizardWrap.addEventListener("change", () => {
            if (current === 5 && summaryBox) summaryBox.textContent = buildStructuredEmail().preview;
        });
    }

});
