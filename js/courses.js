/* OnlineJobs University — course pages
   - All courses: category filter
   - Course page: Expand All for the lesson accordions, and paging through
     sections when they are grouped into more than one data-page */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Category filter ---------- */
  const filter = document.querySelector('[data-course-filter]');
  if (filter) {
    const cards = [...document.querySelectorAll('[data-category]')];
    const count = document.querySelector('[data-course-count]');
    const apply = (announce) => {
      let shown = 0;
      cards.forEach((card) => {
        const match = filter.value === 'all' || card.dataset.category === filter.value;
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (announce && count) count.textContent = `Showing ${shown} ${shown === 1 ? 'course' : 'courses'}`;
    };
    filter.addEventListener('change', () => apply(true));
    apply(false);   // the browser may restore a previous choice on back navigation
  }

  /* ---------- Course content ---------- */
  const curriculum = document.querySelector('[data-curriculum]');
  if (!curriculum) return;

  const sections = [...curriculum.querySelectorAll('[data-page]')];
  const pages = [...new Set(sections.map((s) => s.dataset.page))];
  const toggleAll = curriculum.querySelector('[data-expand-all]');
  const toggleLabel = toggleAll.querySelector('span');
  const visibleLessons = () => sections.filter((s) => !s.hidden).flatMap((s) => [...s.querySelectorAll('details')]);

  const sync = () => {
    const allOpen = visibleLessons().every((d) => d.open);
    toggleAll.setAttribute('aria-expanded', String(allOpen));
    toggleLabel.textContent = allOpen ? 'Collapse All' : 'Expand All';
  };
  toggleAll.addEventListener('click', () => {
    const open = toggleAll.getAttribute('aria-expanded') !== 'true';
    visibleLessons().forEach((d) => { d.open = open; });
    sync();
  });
  // toggle doesn't bubble, but it does pass through the capture phase
  curriculum.addEventListener('toggle', sync, true);

  const pager = curriculum.querySelector('[data-pager]');
  if (pager && pages.length > 1) {
    const prev = pager.querySelector('[data-prev]');
    const next = pager.querySelector('[data-next]');
    const label = pager.querySelector('[data-page-label]');
    let page = 0;

    const show = (i, scroll) => {
      page = i;
      sections.forEach((s) => { s.hidden = s.dataset.page !== pages[i]; });
      label.textContent = `${i + 1} of ${pages.length}`;
      prev.disabled = i === 0;
      next.disabled = i === pages.length - 1;
      sync();
      if (scroll) curriculum.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => show(page - 1, true));
    next.addEventListener('click', () => show(page + 1, true));
    pager.hidden = false;
    show(0, false);
  }
  sync();
})();
