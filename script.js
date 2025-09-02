// script.js – Sprachumschaltung, Menü & kleine Utilities
// Vilana Event & Catering

document.addEventListener("DOMContentLoaded", function () {
  /* =============================
    Sprache beim Laden setzen
     ============================= */
  setLanguage(getSavedLanguage() || "de");

  /* =============================
    Burger / Mobile Menu (IDs по HTML)
     ============================= */
  const menuBtn   = document.getElementById("menuToggle");
  const mobileNav = document.getElementById("mobileMenu");

  if (menuBtn && mobileNav) {
    // Clone-Hack: убираем старые слушатели, если файл подключён повторно
    const btnClone = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(btnClone, menuBtn);

    function setMenuOpen(open) {
      mobileNav.classList.toggle("hidden", !open);
      btnClone.setAttribute("aria-expanded", String(open));
    }

    btnClone.addEventListener("click", (e) => {
      e.stopPropagation();
      setMenuOpen(mobileNav.classList.contains("hidden"));
    });

    // Закрывать меню при клике по пункту
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setMenuOpen(false))
    );

    // Клик вне меню — закрыть
    document.addEventListener("click", (e) => {
      if (!mobileNav.classList.contains("hidden")) {
        const inside = mobileNav.contains(e.target) || btnClone.contains(e.target);
        if (!inside) setMenuOpen(false);
      }
    });

    // ESC — закрыть
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    });
  }

  /* =============================
    Меню категорий (если есть на странице)
     ============================= */
  window.showMenuCategory = function (category) {
    const cats = document.querySelectorAll(".menu-category");
    if (!cats.length) return;

    cats.forEach((el) => el.classList.add("hidden"));

    const selected = document.querySelector(`#menu-${category}`);
    if (selected) selected.classList.remove("hidden");

    // Табы
    document.querySelectorAll(".menu-tab").forEach((tab) => {
      tab.classList.remove("bg-amber-600", "text-white");
      tab.classList.add("bg-gray-300", "text-gray-700");
    });
    const activeTab = document.querySelector(`#menu-tab-${category}`);
    if (activeTab) {
      activeTab.classList.add("bg-amber-600", "text-white");
      activeTab.classList.remove("bg-gray-300", "text-gray-700");
    }
  };

  // Инициализация категории, если блоки существуют
  (function initMenuCategory() {
    const anyCategory = document.querySelector(".menu-category");
    if (!anyCategory) return;

    const initialCategory =
      document.querySelector(".menu-category:not(.hidden)")?.id?.replace("menu-", "") || "warm";
    showMenuCategory(initialCategory);

    document.querySelectorAll(".menu-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        const category = this.dataset.category || this.id.replace("menu-tab-", "");
        showMenuCategory(category);
      });
    });

    document.querySelectorAll(".mobile-menu-item").forEach((item) => {
      item.addEventListener("click", function () {
        const category = this.dataset.category;
        showMenuCategory(category);
        if (mobileNav) mobileNav.classList.add("hidden");
      });
    });
  })();

  /* =============================
    Sprachumschalter (если есть элементы .lang-switch)
     ============================= */
  document.querySelectorAll(".lang-switch").forEach((el) => {
    el.addEventListener("click", function () {
      const lang = (this.dataset.lang || "de").toLowerCase();
      setLanguage(lang);
      updateLangUI();
    });
  });

  /* =============================
    Галерея (безопасная инициализация)
     ============================= */
  (function initGallery() {
    try {
      const gallery = document.getElementById("gallery");
      if (!gallery) return;
      const images = Array.isArray(window.imagePaths) ? window.imagePaths : [];
      if (!images.length) return;

      images.forEach((path, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "overflow-hidden rounded-lg shadow-md cursor-pointer";
        const clickAttr =
          typeof window.openLightbox === "function" ? `onclick="openLightbox(${index})"` : "";
        wrapper.innerHTML = `
          <img src="${path}" alt="Event ${index + 1}" title="Event ${index + 1}"
              class="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
              ${clickAttr}>
        `;
        gallery.appendChild(wrapper);
      });
    } catch (e) {
      console.warn("Gallery init skipped:", e);
    }
  })();

  /* =============================
    Телефоны: привести оба к одному виду
     ============================= */
  unifyPhones();
});

/* =========================================
  Язык — совместимо с твоей HTML-логикой:
  .lang {display:none}, .lang-de / .lang-ru — видны
  Ключ localStorage: "vilana_lang"
========================================= */
function setLanguage(lang) {
  lang = (lang || "de").toLowerCase();

  // Скрыть всё с классом .lang
  document.querySelectorAll(".lang").forEach((el) => {
    el.style.display = "none";
  });

  // Показать выбранный язык
  document.querySelectorAll(`.lang-${lang}`).forEach((el) => {
    el.style.display = "inline";
  });

  document.documentElement.setAttribute("lang", lang === "ru" ? "ru" : "de");
  localStorage.setItem("vilana_lang", lang);
  updateLangUI();
}

function getSavedLanguage() {
  return (localStorage.getItem("vilana_lang") || "de").toLowerCase();
}

function updateLangUI() {
  const l = (localStorage.getItem("vilana_lang") || "de").toUpperCase();
  const labelD = document.getElementById("langLabel");
  const btnM   = document.getElementById("langBtnMobile");
  if (labelD) labelD.textContent = l;
  if (btnM)   btnM.textContent   = l;
}

/* =========================================
  Phones: выравнивание формата для #ev-phone и #ev-phone-2
  (безопасно — если элемента нет, просто игнор)
========================================= */
function unifyPhones() {
  const p1 = document.getElementById("ev-phone");
  const p2 = document.getElementById("ev-phone-2");
  const a1 = document.getElementById("ev-phone-link");
  const a2 = document.getElementById("ev-phone-link-2");

  if (p1) {
    const raw = stripSpaces(p1.textContent);
    p1.textContent = formatPhone(raw);
    if (a1) a1.href = "tel:" + raw;
  }

  if (p2) {
    const raw2 = stripSpaces(p2.textContent);
    p2.textContent = formatPhone(raw2);
    if (a2) a2.href = "tel:" + raw2;
  }
}

function stripSpaces(s) {
  return String(s || "").replace(/\s+/g, "");
}

/* Формат: +49 176 5777 5996 / +49 176 4228 8707 (группы для DE-мобильных) */
function formatPhone(raw) {
  const s = stripSpaces(raw);
  // Попытка разбивки: +CC NNN NNNN NNNN…
  const m = s.match(/^(\+\d{2})(\d{3})(\d{3,4})(\d{3,4})$/);
  if (m) {
    return [m[1], m[2], m[3], m[4]].join(" ");
  }
  // fallback: вернуть как есть
  return raw;
}
