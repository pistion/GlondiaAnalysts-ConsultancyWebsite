/**
 * assets/js/site.js
 * - Mobile nav toggle
 * - Portfolio filtering
 * - Footer year + demo CTA
 */

// Mobile nav
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
hamburger?.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
});

// Portfolio filters
const chips = document.querySelectorAll('#portfolio-filters .chip');
const cards = document.querySelectorAll('#portfolio-grid .card');
chips.forEach(chip => chip.addEventListener('click', () => {
  chips.forEach(c => c.classList.remove('is-active'));
  chip.classList.add('is-active');
  const f = chip.dataset.filter;
  cards.forEach(card => {
    const show = f === 'all' || (card.dataset.tags || '').includes(f);
    card.style.display = show ? '' : 'none';
  });
}));

// Footer year + CTA
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
  const applyBtn = document.getElementById('apply-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      window.location.href = 'apply';
    });
  }
});

// === Scrollspy: highlight active nav link while scrolling ===
(function(){
  const linkSelector = 'a.nav__link[href^="#"], a.mobile-menu__link[href^="#"]';
  const links = Array.from(document.querySelectorAll(linkSelector));
  if (!links.length) return;

  const linkFor = (id) => links.find(a => (a.getAttribute('href') || '').slice(1) === id);
  const setActive = (id) => {
    links.forEach(a => a.classList.toggle('is-active', (a.getAttribute('href') || '').slice(1) === id));
  };

  // Close mobile menu after clicking an in-page link
  links.forEach(a => a.addEventListener('click', () => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) {
      const menu = document.getElementById('mobile-menu');
      const burger = document.getElementById('hamburger');
      if (menu && burger && menu.classList.contains('open')) {
        menu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    }
  }));

  // Observe sections
  const sections = Array.from(document.querySelectorAll('section[id]'));
  if (!sections.length) return;

  let currentId = null;
  const observer = new IntersectionObserver((entries) => {
    let best = { id: null, ratio: 0 };
    for (const e of entries) {
      if (e.isIntersecting) {
        const id = e.target.id;
        if (e.intersectionRatio > best.ratio) {
          best = { id, ratio: e.intersectionRatio };
        }
      }
    }
    if (best.id && best.id !== currentId) {
      currentId = best.id;
      setActive(currentId);
    }
  }, { threshold: [0.1, 0.55, 0.9] });

  sections.forEach(sec => observer.observe(sec));

  // Initialize on load/hash
  const init = () => {
    const startId = (location.hash || '').slice(1) || (sections[0] && sections[0].id);
    if (startId) setActive(startId);
  };



  window.addEventListener('hashchange', () => {
    const id = (location.hash || '').slice(1);
    if (id) setActive(id);
  });
  init();
})();


// End of site.jss

// === form handlers (only run on pages that actually have the form) ===
document.addEventListener("DOMContentLoaded", () => {
  // APPLY FORM
  const applyForm = document.getElementById("applyForm");
  if (applyForm) {
    applyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const res = await fetch("http://localhost:8787/api/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        alert(result.message || "Application submitted!");
        applyForm.reset();
      } catch (err) {
        alert("❌ Could not send application. Is the server running?");
      }
    });
  }

  // CONTACT FORM
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const res = await fetch("http://localhost:8787/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        alert(result.message || "Message sent!");
        contactForm.reset();
      } catch (err) {
        alert("❌ Could not send message. Is the server running?");
      }
    });
  }
});


// site.js
document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    fullName: document.getElementById('fullName').value,
    businessName: document.getElementById('businessName').value,
    address: document.getElementById('address').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    serviceRequest: document.getElementById('serviceRequest').value
  };

  const response = await fetch('/api/apply', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(formData)
  });

  if (response.ok) {
    alert('Application submitted successfully!');
  } else {
    alert('Failed to submit application.');
  }
});








