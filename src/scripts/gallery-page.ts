/** Página de galería: filtros, aparición al hacer scroll y visor a pantalla completa. */

const SWIPE_DISTANCE = 50;

export function initGalleryPage(): void {
  const grid = document.querySelector<HTMLElement>('[data-gallery-grid]');
  if (!grid) return;
  const items = Array.from(grid.querySelectorAll<HTMLElement>('[data-category]'));

  initReveal(items);
  initFilters(items);
  initViewer(items);
}

function initReveal(items: HTMLElement[]) {
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  items.forEach((el) => observer.observe(el));
}

function initFilters(items: HTMLElement[]) {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-gallery-filters] [data-filter]');
  const empty = document.querySelector<HTMLElement>('[data-gallery-empty]');
  const anchor = document.getElementById('fotos');

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let visible = 0;
      items.forEach((item) => {
        const show = filter === 'all' || item.dataset.category === filter;
        item.hidden = !show;
        if (show) {
          visible++;
          item.classList.add('is-visible');
        }
      });
      empty?.classList.toggle('hidden', visible > 0);
      // Si la barra de filtros está fija, volver al inicio del mosaico.
      if (anchor && anchor.getBoundingClientRect().top <= 90) {
        anchor.scrollIntoView({ behavior: 'smooth' });
      }
    }),
  );
}

function initViewer(items: HTMLElement[]) {
  const dialog = document.querySelector<HTMLDialogElement>('[data-viewer]');
  if (!dialog) return;
  const img = dialog.querySelector<HTMLImageElement>('[data-viewer-img]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-viewer-stage]')!;
  const counter = dialog.querySelector<HTMLElement>('[data-viewer-counter]')!;
  const titleEl = dialog.querySelector<HTMLElement>('[data-viewer-title]')!;
  const categoryEl = dialog.querySelector<HTMLElement>('[data-viewer-category]')!;

  let list: HTMLButtonElement[] = [];
  let current = 0;
  let opener: HTMLElement | null = null;

  const visibleButtons = () =>
    items.filter((li) => !li.hidden).map((li) => li.querySelector<HTMLButtonElement>('[data-viewer-open]')!);

  function preload(btn?: HTMLButtonElement) {
    if (!btn) return;
    const pre = new Image();
    pre.sizes = '100vw';
    pre.srcset = btn.dataset.fullSrcset ?? '';
    pre.src = btn.dataset.fullSrc ?? '';
  }

  function show(index: number, direction = 0) {
    if (!list.length) return;
    current = (index + list.length) % list.length;
    const btn = list[current]!;
    img.style.opacity = '0';
    img.style.transform = `translateX(${direction * 40}px)`;
    img.onload = () => {
      img.style.opacity = '1';
      img.style.transform = 'none';
    };
    img.sizes = '100vw';
    img.srcset = btn.dataset.fullSrcset ?? '';
    img.src = btn.dataset.fullSrc ?? '';
    img.alt = btn.dataset.alt ?? '';
    if (img.complete) img.onload?.(new Event('load'));
    titleEl.textContent = btn.dataset.title ?? '';
    categoryEl.textContent = btn.dataset.categoryLabel ?? '';
    counter.textContent = `${current + 1} / ${list.length}`;
    preload(list[(current + 1) % list.length]);
    preload(list[(current - 1 + list.length) % list.length]);
  }

  function open(btn: HTMLButtonElement) {
    list = visibleButtons();
    opener = btn;
    dialog!.showModal();
    document.body.style.overflow = 'hidden';
    show(list.indexOf(btn));
  }

  function close() {
    if (dialog!.open) dialog!.close();
  }

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    img.removeAttribute('src');
    img.removeAttribute('srcset');
    opener?.focus();
  });

  items.forEach((li) => {
    const btn = li.querySelector<HTMLButtonElement>('[data-viewer-open]');
    btn?.addEventListener('click', () => open(btn));
  });

  dialog.querySelectorAll('[data-viewer-prev]').forEach((b) => b.addEventListener('click', () => show(current - 1, -1)));
  dialog.querySelectorAll('[data-viewer-next]').forEach((b) => b.addEventListener('click', () => show(current + 1, 1)));
  dialog.querySelector('[data-viewer-close]')?.addEventListener('click', close);

  // Clic en el fondo (fuera de la foto) cierra.
  stage.addEventListener('click', (e) => {
    if (e.target === stage) close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(current + 1, 1);
    else if (e.key === 'ArrowLeft') show(current - 1, -1);
  });

  // Gestos táctiles: deslizar horizontal = navegar; hacia abajo = cerrar.
  let startX = 0;
  let startY = 0;
  let tracking = false;

  stage.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    },
    { passive: true },
  );

  stage.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (!tracking || !t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
        img.style.transform = `translateY(${dy}px)`;
        img.style.opacity = String(Math.max(0.3, 1 - dy / 400));
      } else {
        img.style.transform = `translateX(${dx}px)`;
      }
    },
    { passive: true },
  );

  stage.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    if (!tracking || !t) return;
    tracking = false;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (dy > 120 && Math.abs(dy) > Math.abs(dx)) {
      close();
      return;
    }
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      show(dx < 0 ? current + 1 : current - 1, dx < 0 ? 1 : -1);
      return;
    }
    img.style.transform = 'none';
    img.style.opacity = '1';
  });
}
