// script.js – Sprachumschaltung und Menülogik für Vilana Event & Catering

document.addEventListener("DOMContentLoaded", function () {
  setLanguage(getSavedLanguage() || "de");

  // Menü-Kategorie-Anzeige
  window.showMenuCategory = function (category) {
    document.querySelectorAll(".menu-category").forEach((el) => el.classList.add("hidden"));
    document.querySelector(`#menu-${category}`).classList.remove("hidden");

    document.querySelectorAll(".menu-tab").forEach((tab) => {
      tab.classList.remove("bg-amber-600", "text-white");
      tab.classList.add("bg-gray-300", "text-gray-700");
    });
    document.querySelector(`#menu-tab-${category}`).classList.add("bg-amber-600", "text-white");
  };

  // Mobile-Menü umschalten
  window.toggleMobileMenu = function () {
    const menu = document.getElementById("mobile-menu");
    menu.classList.toggle("hidden");
  };
});

// Sprache setzen
function setLanguage(lang) {
  document.querySelectorAll(".lang").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(`.lang-${lang}`).forEach((el) => el.classList.remove("hidden"));

  // Sprache aktivieren im Umschalter
  document.getElementById("lang-de").classList.remove("lang-active");
  document.getElementById("lang-ru").classList.remove("lang-active");
  document.getElementById(`lang-${lang}").classList.add("lang-active");

  // Sprache speichern
  localStorage.setItem("vilana-lang", lang);
}

function getSavedLanguage() {
  return localStorage.getItem("vilana-lang");
}
// Initiale Sprache setzen
if (getSavedLanguage()) {
  setLanguage(getSavedLanguage());
}
// Event-Listener für Sprachumschalter
document.querySelectorAll(".lang-switch").forEach((el) => {
  el.addEventListener("click", function () {
    const lang = this.dataset.lang;
    setLanguage(lang);
  });
});
