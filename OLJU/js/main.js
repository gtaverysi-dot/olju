/* OnlineJobs University — page interactions
   - Educate → Elevate → Earn advances only with scroll progress
   - Mission map avatars pop in when the map enters view
   - Final CTA badge rises from the bottom of the screen, then drifts with parallax
   - Nav: scrolled state, scroll spy, mobile menu */
(() => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  // Must match the stacked-mode media query in styles.css
  const stacked = matchMedia('(max-width: 860px), (max-height: 620px)');

  /* ---------- Nav ---------- */
  const nav = document.querySelector('[data-nav]');
  const toggle = nav.querySelector('[data-nav-toggle]');
  const sheet = nav.querySelector('[data-nav-sheet]');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-list');
    sheet.hidden = !open;
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (!sheet.hidden && !nav.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) { setMenu(false); toggle.focus(); }
  });
  stacked.addEventListener('change', () => setMenu(false));

  const spyLinks = [...nav.querySelectorAll('[data-spy]')];
  const spyTargets = spyLinks.map((a) => document.getElementById(a.dataset.spy));
  let spyIndex = 0;

  function updateSpy(vh) {
    let n = 0;
    spyTargets.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= vh * 0.4) n = i; });
    if (n === spyIndex) return;
    spyIndex = n;
    spyLinks.forEach((a, i) => {
      a.classList.toggle('is-current', i === n);
      if (i === n) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- Educate · Elevate · Earn ---------- */
  const pillars = document.querySelector('[data-pillars]');
  const words = [...pillars.querySelectorAll('[data-word]')];
  const items = [...pillars.querySelectorAll('[data-pillar]')];
  const cards = items.map((el) => el.querySelector('.pillar__card'));
  const segs = [...pillars.querySelectorAll('[data-seg]')];
  const stairs = pillars.querySelector('[data-stairs]');
  let step = 0;

  function setStep(n) {
    if (n === step) return;
    step = n;
    pillars.dataset.step = n;
    pillars.style.setProperty('--step', n);
    words.forEach((w, i) => w.classList.toggle('is-active', i === n));
    items.forEach((el, i) => el.classList.toggle('is-active', i === n));
    cards.forEach((c, i) => {
      if (i === n) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current');
    });
  }

  function updatePillars(vh) {
    if (stacked.matches) {
      // Stacked layout: the card that has scrolled past 60% of the screen is active
      let n = 0;
      items.forEach((el, i) => { if (el.getBoundingClientRect().top < vh * 0.6) n = i; });
      setStep(n);
      segs.forEach((s, i) => s.style.setProperty('--fill', i <= n ? 1 : 0));
      return;
    }
    // Pinned layout: scroll progress through the section picks the step
    const r = pillars.getBoundingClientRect();
    const run = r.height - vh;
    const p = run > 0 ? clamp(-r.top / run, 0, 1) : 0;
    setStep(Math.min(items.length - 1, Math.floor(p * items.length)));
    segs.forEach((s, i) => s.style.setProperty('--fill', clamp(p * segs.length - i, 0, 1).toFixed(3)));
  }

  // The staircase needs equal card heights; the tallest card sets them
  function equalizeCards() {
    stairs.style.removeProperty('--card-h');
    if (stacked.matches) return;
    const h = Math.max(...cards.map((c) => c.offsetHeight));
    stairs.style.setProperty('--card-h', `${h}px`);
  }

  /* ---------- Mission map ---------- */
  const map = document.querySelector('[data-map]');
  if (map && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { map.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(map);
  } else if (map) {
    map.classList.add('is-in');
  }

  /* ---------- Final CTA badge ---------- */
  // The badge rises in from the bottom edge of the screen, then keeps drifting
  // with a light parallax. The orbits follow at a slower rate and the glow lags
  // behind the seal, so the three layers separate in depth. Motion is eased
  // toward the scroll target each frame so it floats rather than snaps.
  const cta = document.querySelector('[data-cta]');
  const badge = cta.querySelector('[data-cta-badge]');
  const PARALLAX = 0.14;   // extra speed relative to the page
  const ORBIT_FOLLOW = 0.6;
  const GLOW_LAG = -0.4;
  const footer = document.querySelector('.footer');
  let travel = 0;          // how far below its resting spot the badge starts
  let parZero = 0;         // scroll position where the parallax offset is zero
  const target = { rise: 0, y: 0, par: 0 };
  const shown = { rise: -1, y: 0, par: 0 };
  let ctaRaf = 0;
  let ctaLast = 0;

  function measureCta() {
    const below = cta.offsetHeight - badge.offsetTop; // badge top → section bottom
    travel = below * 1.25;
    // Centre the drift on the scroll left after the section settles (the footer)
    parZero = -Math.min(footer ? footer.offsetHeight : 0, window.innerHeight * 0.6) / 2;
  }

  function updateCta(vh) {
    const r = cta.getBoundingClientRect();
    const t = r.bottom - vh; // 0 when the section's bottom meets the screen's bottom
    if (reduceMotion.matches) {
      target.rise = 1; target.y = 0; target.par = 0;
    } else {
      const start = vh * 0.35;
      const end = -vh * 0.12;
      const e = easeOutCubic(clamp((start - t) / (start - end), 0, 1));
      target.rise = e;
      target.par = clamp((t - parZero) * PARALLAX, -40, vh);
      target.y = (1 - e) * travel + target.par;
    }
    if (!ctaRaf) { ctaLast = performance.now(); ctaRaf = requestAnimationFrame(stepCta); }
  }

  function stepCta(now) {
    const dt = Math.min(64, now - ctaLast) / 1000;
    ctaLast = now;
    // Snap on the first frame and under reduced motion; ease otherwise
    const k = shown.rise < 0 || reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    shown.rise = Math.max(0, shown.rise) + (target.rise - Math.max(0, shown.rise)) * k;
    shown.y += (target.y - shown.y) * k;
    shown.par += (target.par - shown.par) * k;
    cta.style.setProperty('--rise', shown.rise.toFixed(4));
    cta.style.setProperty('--badge-y', `${shown.y.toFixed(2)}px`);
    cta.style.setProperty('--glow-y', `${(shown.par * GLOW_LAG).toFixed(2)}px`);
    if (window.OLJOrbit) {
      window.OLJOrbit.setReveal(shown.rise);
      window.OLJOrbit.setOffset(shown.y * ORBIT_FOLLOW);
    }
    const settled = Math.abs(target.y - shown.y) < 0.1 && Math.abs(target.rise - shown.rise) < 0.001;
    ctaRaf = settled ? 0 : requestAnimationFrame(stepCta);
  }

  /* ---------- Frame loop ---------- */
  let queued = false;
  function update() {
    queued = false;
    const vh = window.innerHeight;
    nav.classList.toggle('is-scrolled', window.scrollY > 8);
    updatePillars(vh);
    updateCta(vh);
    updateSpy(vh);
  }
  function requestUpdate() {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => { equalizeCards(); measureCta(); requestUpdate(); });
  stacked.addEventListener('change', () => { equalizeCards(); requestUpdate(); });
  if ('ResizeObserver' in window) new ResizeObserver(equalizeCards).observe(stairs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(equalizeCards);

  equalizeCards();
  measureCta();
  update();
})();
