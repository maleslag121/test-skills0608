(function () {
  const header = document.querySelector(".site-header");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const reveals = document.querySelectorAll(".reveal");
  const contactForm = document.querySelector(".contact-form");

  // Header scroll state
  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile nav
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.classList.toggle("open");
      navLinks.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navToggle.classList.remove("open");
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Scroll reveal
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  reveals.forEach((el) => {
    revealObserver.observe(el);
    // Hero 首屏内容立即可见
    if (el.closest(".hero")) el.classList.add("visible");
  });

  // Hero stats counter
  function animateCounter(el, target, duration = 1600) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const statsSection = document.querySelector(".hero-stats");
  if (statsSection) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll(".stat-num").forEach((num) => {
            const target = parseInt(num.dataset.target, 10);
            if (!isNaN(target)) animateCounter(num, target);
          });
          counterObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );
    counterObserver.observe(statsSection);
  }

  // Contact form (demo)
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const note = contactForm.querySelector(".form-note");
      contactForm.classList.add("submitted");
      if (note) note.textContent = "感谢您的留言，我们会尽快与您联系！";
      contactForm.reset();
    });
  }
})();
