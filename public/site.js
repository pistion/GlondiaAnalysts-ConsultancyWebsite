/**
 * assets/js/site.js
 * Handles:
 * - Mobile nav
 * - Portfolio filters
 * - Footer year
 * - Form submissions (Apply + Contact)
 */

const API_BASE = ""; // ✅ Live backend

// === Mobile Navigation ===
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(open));
    });
  }

  // === Portfolio Filters ===
  const chips = document.querySelectorAll("#portfolio-filters .chip");
  const cards = document.querySelectorAll("#portfolio-grid .card");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const f = chip.dataset.filter;
      cards.forEach(card => {
        const show = f === "all" || (card.dataset.tags || "").includes(f);
        card.style.display = show ? "" : "none";
      });
    });
  });

  // === Footer Year ===
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // === Apply Button Navigation ===
  const applyBtn = document.getElementById("apply-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      window.location.href = "apply";
    });
  }

  // === Scrollspy ===
  const linkSelector = 'a.nav__link[href^="#"], a.mobile-menu__link[href^="#"]';
  const links = Array.from(document.querySelectorAll(linkSelector));
  const sections = Array.from(document.querySelectorAll("section[id]"));
  if (links.length && sections.length) {
    const setActive = (id) => {
      links.forEach(a =>
        a.classList.toggle("is-active", (a.getAttribute("href") || "").slice(1) === id)
      );
    };
    const observer = new IntersectionObserver((entries) => {
      let best = { id: null, ratio: 0 };
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > best.ratio) {
          best = { id: e.target.id, ratio: e.intersectionRatio };
        }
      }
      if (best.id) setActive(best.id);
    }, { threshold: [0.1, 0.55, 0.9] });
    sections.forEach(sec => observer.observe(sec));
    const init = () => {
      const startId = (location.hash || "").slice(1) || (sections[0] && sections[0].id);
      if (startId) setActive(startId);
    };
    window.addEventListener("hashchange", () => {
      const id = (location.hash || "").slice(1);
      if (id) setActive(id);
    });
    init();
  }

  // === APPLY FORM ===
  const applyForm = document.getElementById("applyForm");
  if (applyForm) {
    applyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const res = await fetch(`${API_BASE}/api/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Application failed.");
        alert(result.message || "✅ Application submitted!");
        applyForm.reset();
      } catch (err) {
        console.error("❌ Application error:", err);
        alert("❌ Failed to submit application. Please try again later.");
      }
    });
  }

  // === CONTACT FORM ===
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const res = await fetch(`${API_BASE}/api/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Message failed.");
        alert(result.message || "✅ Message sent!");
        contactForm.reset();
      } catch (err) {
        console.error("❌ Contact error:", err);
        alert("❌ Failed to send message. Please try again later.");
      }
    });
  }
});
