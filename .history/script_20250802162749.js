// script.js – Sprachumschaltung und Menülogik für Vilana Event & Catering

document.addEventListener("DOMContentLoaded", function () {
  // Sprache beim Laden setzen (aus localStorage oder Standard = "de")
  setLanguage(getSavedLanguage() || "de");

  // Funktion zur Anzeige der gewählten Menü-Kategorie
  window.showMenuCategory = function (category) {
    // Alle Kategorien ausblenden
    document.querySelectorAll(".menu-category").forEach((el) =>
      el.classList.add("hidden")
    );

    // Ausgewählte Kategorie anzeigen
    const selected = document.querySelector(`#menu-${category}`);
    if (!selected) {
      console.warn(`Kategorie "${category}" nicht gefunden.`);
      return;
    }
    selected.classList.remove("hidden");

    // Alle Tabs zurücksetzen
    document.querySelectorAll(".menu-tab").forEach((tab) => {
      tab.classList.remove("bg-amber-600", "text-white");
      tab.classList.add("bg-gray-300", "text-gray-700");
    });

    // Aktiven Tab hervorheben
    const activeTab = document.querySelector(`#menu-tab-${category}`);
    if (activeTab) {
      activeTab.classList.add("bg-amber-600", "text-white");
      activeTab.classList.remove("bg-gray-300", "text-gray-700");
    }
  };

  // Funktion zum Umschalten des mobilen Menüs
  window.toggleMobileMenu = function () {
    const menu = document.getElementById("mobile-menu");
    if (menu) menu.classList.toggle("hidden");
  };

  // Beim Laden eine Standard-Kategorie anzeigen
  const initialCategory = document
    .querySelector(".menu-category:not(.hidden)")
    ?.id.replace("menu-", "");
  if (initialCategory) {
    showMenuCategory(initialCategory);
  } else {
    showMenuCategory("warm"); // Standard: Warme Speisen
  }

  // Klicks auf Kategorie-Tabs verarbeiten
  document.querySelectorAll(".menu-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const category = this.dataset.category || this.id.replace("menu-tab-", "");
      showMenuCategory(category);
    });
  });

  // Klicks auf mobile Menüelemente
  document.querySelectorAll(".mobile-menu-item").forEach((item) => {
    item.addEventListener("click", function () {
      const category = this.dataset.category;
      showMenuCategory(category);
      toggleMobileMenu(); // Menü danach schließen
    });
  });

  // Mobile-Menü schließen, wenn außerhalb geklickt wird
  document.addEventListener("click", function (event) {
    const menu = document.getElementById("mobile-menu");
    const toggle = document.getElementById("mobile-menu-toggle");
    if (
      menu &&
      toggle &&
      !menu.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      menu.classList.add("hidden");
    }
  });

  // Mobile-Menü schließen bei ESC-Taste
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      const menu = document.getElementById("mobile-menu");
      if (menu && !menu.classList.contains("hidden")) {
        menu.classList.add("hidden");
      }
    }
  });

  // Sprachumschalter-Klicks verarbeiten
  document.querySelectorAll(".lang-switch").forEach((el) => {
    el.addEventListener("click", function () {
      const lang = this.dataset.lang;
      setLanguage(lang);
    });
  });
});

// Sprache setzen
function setLanguage(lang) {
  // Alle Sprachblöcke ausblenden
  document.querySelectorAll(".lang").forEach((el) =>
    el.classList.add("hidden")
  );

  // Elemente der gewählten Sprache anzeigen
  document.querySelectorAll(`.lang-${lang}`).forEach((el) =>
    el.classList.remove("hidden")
  );

  // Aktiven Sprachbutton hervorheben
  document.getElementById("lang-de-btn")?.classList.remove("lang-active");
  document.getElementById("lang-ru-btn")?.classList.remove("lang-active");
  document.getElementById(`lang-${lang}-btn`)?.classList.add("lang-active");

  // HTML-Sprachattribut setzen
  document.documentElement.lang = lang;

  // Sprache im localStorage speichern
  localStorage.setItem("vilana-lang", lang);
}

// Gespeicherte Sprache abrufen
function getSavedLanguage() {
  return localStorage.getItem("vilana-lang");
}

const gallery = document.getElementById('gallery');

imagePaths.forEach((path, index) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'overflow-hidden rounded-lg shadow-md cursor-pointer';
  wrapper.innerHTML = `
    <img src="${path}" alt="Event ${index + 1}" title="Event ${index + 1}"
         class="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
         onclick="openLightbox(${index})">`;
  gallery.appendChild(wrapper);
});
