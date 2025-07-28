document.addEventListener("DOMContentLoaded", function () {
  // Aktive Sprache laden oder auf Deutsch setzen
  setLanguage(getSavedLanguage() || "de");

  // Funktion zum Anzeigen der ausgewählten Menü-Kategorie
  window.showMenuCategory = function (category) {
    // Alle Kategorien ausblenden
    document.querySelectorAll(".menu-category").forEach((el) =>
      el.classList.add("hidden")
    );
    // Ausgewählte Kategorie anzeigen
    const activeCategory = document.querySelector(`#menu-${category}`);
    if (activeCategory) {
      activeCategory.classList.remove("hidden");
    }

    // Tab-Stile zurücksetzen
    document.querySelectorAll(".menu-tab").forEach((tab) => {
      tab.classList.remove("bg-amber-600", "text-white");
      tab.classList.add("bg-gray-300", "text-gray-700");
    });

    // Aktiven Tab hervorheben
    const activeTab = document.querySelector(`#menu-tab-${category}`);
    if (activeTab) {
      activeTab.classList.add("bg-amber-600", "text-white");
    }
  };

  // Standard-Kategorie beim Laden setzen
  showMenuCategory("warm");

  // Tab-Klicks aktivieren
  document.querySelectorAll(".menu-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const category = this.dataset.category;
      showMenuCategory(category);
    });
  });
});

// Sprache setzen (wie gehabt)
function setLanguage(lang) {
  document.querySelectorAll(".lang").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(`.lang-${lang}`).forEach((el) =>
    el.classList.remove("hidden")
  );

  document.getElementById("lang-de").classList.remove("lang-active");
  document.getElementById("lang-ru").classList.remove("lang-active");
  document.getElementById(`lang-${lang}`).classList.add("lang-active");

  localStorage.setItem("vilana-lang", lang);
}

function getSavedLanguage() {
  return localStorage.getItem("vilana-lang");
}
