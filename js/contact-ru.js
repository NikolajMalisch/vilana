"use strict";

/**
 * Vilana Contact Form (RU) — v2 (без шага "Контакт")
 * - Быстрая заявка (Сообщение + E-mail обязательно)
 * - Wizard (Расширенно) со Stepper + выбором меню
 * - 4 шага: 1 Event → 2 Menü → 3 Optionen → 4 Итог
 * - EmailJS отправка (sendForm)
 * - Anti-Spam: Honeypot + timing
 * - Menu: toggle item (клик добавить/убрать) + сохранение состояния аккордеона
 */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
          Мелкие helpers
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
        toastTimer = setTimeout(() => { toastEl.style.display = "none"; }, 1700);
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

    // Quick contact (верх)
    const name = document.getElementById("name");
    const email = document.getElementById("email");      // обязательный
    const phone = document.getElementById("cf-phone");   // optional

    // Wizard toggle
    const btnToggleWizard = document.getElementById("btnToggleWizard");
    const wizardWrap = document.getElementById("wizardWrap");
    const btnSubmitQuick = document.getElementById("btnSubmitQuick");
    const btnCloseWizard = document.getElementById("btnCloseWizard");

    // Wizard steps
    const steps = wizardWrap ? Array.from(wizardWrap.querySelectorAll("[data-step]")) : [];
    const dots = [1, 2, 3, 4].map(n => document.getElementById("stepDot" + n));
    const btnBack = document.getElementById("btnBack");
    const btnNext = document.getElementById("btnNext");
    const summaryBox = document.getElementById("summaryBox");

    // Hidden EmailJS vars
    const fromNameHidden = document.getElementById("from_name_hidden");
    const replyToHidden = document.getElementById("reply_to_hidden");
    const subjectHidden = document.getElementById("subject_hidden");
    const msgHidden = document.getElementById("cf-message-hidden");

    // Меню
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

    // Опции toggles
    const optService = document.getElementById("opt_service");
    const serviceDetails = document.getElementById("serviceDetails");
    const optCleanup = document.getElementById("opt_cleanup");
    const cleanupDetails = document.getElementById("cleanupDetails");

    /* =========================================================
          EmailJS config (из data-атрибутов формы)
    ========================================================== */
    const EMAILJS_PUBLIC_KEY = (form.dataset.emailjsPublicKey || "").trim();
    const EMAILJS_TEMPLATE_ID = (form.dataset.emailjsTemplateId || "").trim();
    const EMAILJS_SERVICE_ID = (form.dataset.emailjsServiceId || "").trim();

    /* =========================================================
          Wizard open/close
    ========================================================== */
    let wizardOpen = false;

    function setWizard(open) {
        wizardOpen = open;
        if (wizardWrap) wizardWrap.classList.toggle("hidden", !open);
        if (btnSubmitQuick) btnSubmitQuick.classList.toggle("hidden", open);

        if (btnToggleWizard) {
            btnToggleWizard.textContent = open ? "Расширенно открыто" : "Расширенно (опционально)";
            btnToggleWizard.disabled = open;
        }

        if (open) showStep(1);
        if (!open && btnToggleWizard) btnToggleWizard.disabled = false;
    }

    if (btnToggleWizard) btnToggleWizard.addEventListener("click", () => setWizard(true));
    if (btnCloseWizard) btnCloseWizard.addEventListener("click", () => setWizard(false));

    /* =========================================================
          Опции Details (Service/Cleanup) – show/hide
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
          MENU DATA (RU, полное меню)
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
                { id: "salad_07", name: "Салат из белокочанной/острокочанной капусты с фисташками", desc: "Тонкая нарезка + ореховый акцент." },
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
                { id: "candy_05", name: "Мармеладные мишки (Bärenköpfe)", desc: "Для детей и взрослых." },
                { id: "candy_06", name: "Мармеладные шнурки", desc: "Разноцветный микс." },
                { id: "candy_07", name: "Мармелад (Schnuckies)", desc: "Фруктовый сюрприз." },
                { id: "candy_08", name: "Шоколад (вариации)", desc: "Белый, молочный, тёмный." }
            ]
        }
    ];

    /* =========================================================
          Category UI (Tailwind classes)
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
          Меню — состояние выбора (без количеств/ID)
    ========================================================== */
    const selected = {};       // id -> { name, catKey }
    const openState = {};      // catKey -> boolean (сохраняем состояние аккордеона)
    let advancedMenuOpen = false;

    function setAdvancedMenu(open) {
        advancedMenuOpen = open;
        if (menuSelectBox) menuSelectBox.classList.toggle("hidden", !open);
        if (btnToggleAdvancedMenu) btnToggleAdvancedMenu.textContent = open ? "Закрыть расширенно" : "Расширенно: выбрать блюда (опционально)";
        if (menuModeHidden) menuModeHidden.value = open ? "Блюда выбраны" : "Без выбора (Vilana предложит меню)";
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
          Render категорий (Accordion) + выбор
          - сохраняем open/close состояние категорий в openState
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

            // если есть поиск — можно раскрывать категории по умолчанию (чтобы результат был виден)
            const shouldOpen = (typeof openState[cat.key] === "boolean")
                ? openState[cat.key]
                : (q ? true : false);

            const wrap = document.createElement("div");
            wrap.className = `rounded-2xl border border-gray-200 overflow-hidden bg-white border-l-4 ${ui.rail} shadow-soft`;

            wrap.innerHTML = `
        <button type="button"
        class="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-b ${ui.head} hover:bg-black/5 transition ${shouldOpen ? "acc-open" : ""}"
        aria-expanded="${shouldOpen ? "true" : "false"}" data-acc="${esc(cat.key)}">
        <div class="flex items-center gap-3">
            <span class="inline-flex h-2 w-2 rounded-full ${ui.dot}"></span>
            <span class="text-sm font-semibold text-gray-900">${esc(cat.title)}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full border ${ui.chip}">
            ${items.length} позиций
            </span>
            </div>
            <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-gray-700" data-acc-label>${shouldOpen ? "Скрыть" : "Показать"}</span>
            <svg class="h-4 w-4 text-gray-600 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
            </svg>
            </div>
        </button>
        <div class="p-4 space-y-2 ${shouldOpen ? "" : "hidden"} bg-white" data-panel="${esc(cat.key)}"></div>
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
            class="shrink-0 grid place-items-center h-9 w-9 rounded-full border transition
            btn-add-base ${isAdded ? "btn-added" : "btn-add"}"
            data-toggle="${esc(item.id)}"
            aria-label="${isAdded ? "Убрать из выбора" : "Добавить в выбор"}"
            title="${isAdded ? "Убрать" : "Добавить"}">
            <span class="text-base leading-none">${isAdded ? "✓" : "+"}</span>
            </button>
        `;
                panel.appendChild(row);
            });

            // delegated handler per category box
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
                    if (label) label.textContent = isOpen ? "Показать" : "Скрыть";
                    accBtn.classList.toggle("acc-open", !isOpen);

                    openState[key] = !isOpen;
                    return;
                }

                // item toggle add/remove
                const tglBtn = e.target.closest("[data-toggle]");
                if (tglBtn) {
                    const id = tglBtn.getAttribute("data-toggle");
                    if (!id) return;

                    if (selected[id]) {
                        delete selected[id];
                        renderSelected();
                        renderCategories(menuSearch ? menuSearch.value : "");
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
                    renderSelected();
                    renderCategories(menuSearch ? menuSearch.value : "");
                    toast("Добавлено ✓");
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
            menuSelectedEl.innerHTML = `<div class="text-sm text-gray-600">Пока ничего не выбрано.</div>`;
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
            Убрать
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
                toast("Удалено");
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
            toast("Выбор очищен");
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
            Wizard Stepper Logic (4 шага)
    ========================================================== */
    let current = 1;
    const LAST_STEP = 4;

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

        if (btnNext) btnNext.classList.toggle("hidden", n === LAST_STEP);

        setDots(n);

        if (n === LAST_STEP && summaryBox) {
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

    if (btnBack) btnBack.addEventListener("click", () => { if (current > 1) showStep(current - 1); });
    if (btnNext) btnNext.addEventListener("click", () => {
        if (!validateWizardStep(current)) return;
        const next = Math.min(current + 1, LAST_STEP);
        showStep(next);
    });

    /* =========================================================
            Базовая валидация (всегда):
            - Сообщение обязательно
            - E-mail обязательно
            - AGB/Datenschutz обязательно
    ========================================================== */
    function validateBase() {
        if (!quickMessage || !quickMessage.value.trim()) {
            if (quickMessage) {
                quickMessage.classList.add("field-error");
                quickMessage.focus();
                quickMessage.reportValidity();
            }
            toast("Пожалуйста, заполните сообщение.");
            return false;
        }
        quickMessage.classList.remove("field-error");

        const finalEmail = (email && email.value ? email.value.trim() : "");
        if (!finalEmail) {
            if (email) {
                email.classList.add("field-error");
                email.focus();
                email.reportValidity?.();
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
            Email Body Builder (Сообщение всегда первым!)
    ========================================================== */
    function getVal(id) {
        const el = document.getElementById(id);
        return el ? (el.value || "").trim() : "";
    }

    function buildStructuredEmail() {
        const message = getVal("cf_message");

        const finalName = getVal("name") || "—";
        const finalEmail = getVal("email") || "—";
        const finalPhone = getVal("cf-phone") || "—";

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
        const optServiceVal = (optService && optService.checked) ? "Да" : "Нет";
        const cleanupVal = (optCleanup && optCleanup.checked) ? "Да" : "Нет";

        const preview =
            `СООБЩЕНИЕ
• ${message}

КОНТАКТЫ
• Имя: ${finalName}
• E-mail: ${finalEmail}
• Телефон: ${finalPhone}

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
Имя: ${finalName}
E-mail: ${finalEmail}
Телефон: ${finalPhone}

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
        try { emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch (e) { /* ignore */ }
    }

    /* =========================================================
            Submit (Quick + Wizard одно форма)
    ========================================================== */
    let sending = false;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (sending) return;

        // Honeypot
        if (form.honeypot && form.honeypot.value) {
            toast("Пожалуйста, повторите отправку.");
            return;
        }

        // Minimal timing check (3 sec)
        const t0 = Number(document.getElementById("cf_started_at")?.value || "0");
        if (t0 && (Date.now() - t0) < 3000) {
            toast("Подождите 3 секунды и отправьте снова.");
            return;
        }

        // Base checks
        if (!validateBase()) return;

        // Если Wizard открыт: Step 1 (Event) должен быть валиден (вкл. Gäste >= 20)
        if (wizardOpen) {
            if (!validateWizardStep(1)) return;
        }

        const { emailBody } = buildStructuredEmail();

        // final values for template
        const finalName = (getVal("name") || "Заявка с сайта").trim();
        const finalEmail = (getVal("email") || "").trim();

        const subj =
            wizardOpen
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
            alert("EmailJS не настроен в HTML. Проверь data-emailjs-public-key / data-emailjs-service-id / data-emailjs-template-id на <form>.");
            return;
        }

        sending = true;
        const submitBtns = form.querySelectorAll('button[type="submit"], #btnSubmitQuick, #btnSubmitWizard');
        submitBtns.forEach(b => { try { b.disabled = true; } catch (_) { } });

        emailjs.sendForm(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            form,
            { publicKey: EMAILJS_PUBLIC_KEY }
        )
            .then(() => {
                const ok = document.getElementById("formMsg");
                if (ok) ok.classList.remove("hidden");
                toast("Отправлено ✓");

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
                alert("Ошибка отправки: " + (err && err.text ? err.text : err));
            })
            .finally(() => {
                sending = false;
                submitBtns.forEach(b => { try { b.disabled = false; } catch (_) { } });
            });
    });

    if (wizardWrap) {
        wizardWrap.addEventListener("change", () => {
            if (current === LAST_STEP && summaryBox) summaryBox.textContent = buildStructuredEmail().preview;
        });
    }

});
