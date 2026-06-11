/* ============================================================
   Vilana Event & Catering — animations.js
   Подключение перед </body>:
   <script src="js/animations.js" defer></script>
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (reduceMotion) return; // ничего не анимируем

  /* ----------------------------------------------------------
     1. STAGGER: контейнерам с data-stagger навешиваем .reveal
        на детей + каскадную задержку
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-stagger]").forEach(function (container) {
    var step = parseInt(container.getAttribute("data-stagger"), 10) || 90;
    Array.prototype.forEach.call(container.children, function (child, i) {
      child.classList.add("reveal");
      child.style.setProperty("--reveal-delay", (i * step) / 1000 + "s");
    });
  });

  /* ----------------------------------------------------------
     2. SCROLL REVEAL: IntersectionObserver
     ---------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) {
      io.observe(el);
    });
  } else {
    // старые браузеры — показать всё сразу
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ----------------------------------------------------------
     3. HERO CLIP REVEAL: оборачиваем текст строк в .clip-line
        (чтобы не править HTML руками внутри span)
     ---------------------------------------------------------- */
  document
    .querySelectorAll(".clip-reveal > span")
    .forEach(function (line) {
      if (line.querySelector(".clip-line")) return;
      var inner = document.createElement("span");
      inner.className = "clip-line";
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
    });

  /* ----------------------------------------------------------
     4. MAGNETIC КНОПКИ — только устройства с мышью
     ---------------------------------------------------------- */
  if (window.matchMedia("(pointer: fine)").matches) {
    var STRENGTH = 0.25; // сила притяжения (0.15–0.35)
    var MAX = 6; // макс. смещение, px

    document.querySelectorAll(".btn-magnetic").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * STRENGTH;
        var y = (e.clientY - r.top - r.height / 2) * STRENGTH;
        x = Math.max(-MAX, Math.min(MAX, x));
        y = Math.max(-MAX, Math.min(MAX, y));
        btn.style.transform = "translate(" + x + "px," + y + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  /* ----------------------------------------------------------
     5. FAQ-АККОРДЕОН
        Структура: .faq-item > .faq-q (кнопка) + .faq-a > .faq-a-inner
     ---------------------------------------------------------- */
  document.querySelectorAll(".faq-item .faq-q").forEach(function (q) {
    q.setAttribute("aria-expanded", "false");
    q.addEventListener("click", function () {
      var item = q.closest(".faq-item");
      var open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
})();
