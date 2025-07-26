// script.js – Sprachumschaltung und Menülogik für Vilana Event & Catering

document.addEventListener("DOMContentLoaded", function () {
  // Sprache setzen
  setLanguage(getSavedLanguage() || "de");

  // Menü-Kategorie beim Laden anzeigen
  const initialCategory = document.querySelector(".menu-category:not(.hidden)")?.id.replace("menu-", "") || "warm";
  showMenuCategory(initialCategory);

  // Sprachumschalter
  document.querySelectorAll(".lang-switch").forEach((el) => {
    el.addEventListener("click", function () {
      const lang = this.dataset.lang;
      setLanguage(lang);
    });
  });

  // Menü-Klicks
  document.querySelectorAll(".menu-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const category = this.dataset.category;
      showMenuCategory(category);
    });
  });

  // Mobile-Menü öffnen/schließen
  const toggleButton = document.getElementById("mobile-menu-toggle");
  if (toggleButton) {
    toggleButton.addEventListener("click", toggleMobileMenu);
  }

  // Mobile-Menü-Klicks
  document.querySelectorAll(".mobile-menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      const category = this.dataset.category;
      showMenuCategory(category);
      toggleMobileMenu();
    });
  });

  // Schließen bei Klick außerhalb
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("mobile-menu");
    if (menu && !menu.contains(event.target) && !toggleButton.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });

  // Schließen bei Escape
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const menu = document.getElementById("mobile-menu");
      if (menu && !menu.classList.contains("hidden")) {
        menu.classList.add("hidden");
      }
    }
  });
});

// Sprache setzen
function setLanguage(lang) {
  document.querySelectorAll(".lang").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(`.lang-${lang}`).forEach((el) => el.classList.remove("hidden"));

  document.getElementById("lang-de").classList.remove("lang-active");
  document.getElementById("lang-ru").classList.remove("lang-active");
  document.getElementById(`lang-${lang}`).classList.add("lang-active");

  localStorage.setItem("vilana-lang", lang);
}

function getSavedLanguage() {
  return localStorage.getItem("vilana-lang");
}

// Menü-Kategorie anzeigen
function showMenuCategory(category) {
  document.querySelectorAll(".menu-category").forEach((el) => el.classList.add("hidden"));
  const selected = document.getElementById(`menu-${category}`);
  if (selected) selected.classList.remove("hidden");

  document.querySelectorAll(".menu-tab").forEach((tab) => {
    tab.classList.remove("bg-amber-600", "text-white");
    tab.classList.add("bg-gray-300", "text-gray-700");
  });

  const activeTab = document.querySelector(`#menu-tab-${category}`);
  if (activeTab) {
    activeTab.classList.remove("bg-gray-300", "text-gray-700");
    activeTab.classList.add("bg-amber-600", "text-white");
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.toggle("hidden");
}
