/* OnlineJobs University — shared page interactions (About, Courses, Course)
   - Nav: scrolled state + mobile menu (same behaviour as the landing page)
   - Cards and timeline stages fade up as they enter the viewport */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = matchMedia('(max-width: 860px), (max-height: 620px)');

  /* ---------- Nav ---------- */
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    const toggle = nav.querySelector('[data-nav-toggle]');
    const sheet = nav.querySelector('[data-nav-sheet]');

    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-list');
      sheet.hidden = !open;
    };
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', (e) => { if (!sheet.hidden && !nav.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); toggle.focus(); }
    });
    stacked.addEventListener('change', () => setMenu(false));

    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll reveal ---------- */
  const targets = [...document.querySelectorAll('[data-reveal]')];
  if (!targets.length || reduceMotion.matches || !('IntersectionObserver' in window)) return;

  // Anything already on screen at load shows immediately; only below-the-fold items animate.
  const vh = innerHeight;
  const below = targets.filter((el) => el.getBoundingClientRect().top > vh * 0.92);
  if (!below.length) return;
  document.documentElement.classList.add('can-reveal');
  targets.filter((el) => !below.includes(el)).forEach((el) => el.classList.add('is-in'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Stagger siblings that enter together (card rows)
      const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
      el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 3) * 80}ms`;
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  below.forEach((el) => io.observe(el));
})();
