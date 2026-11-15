/**
 * Animaciones suaves al hacer scroll hacia abajo y hacia arriba.
 * Usa IntersectionObserver + transiciones GPU (transform/opacity) sin librerías externas.
 */
export function initScrollReveal(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!targets.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  document.documentElement.classList.add('reveal-ready');

  let lastY = window.scrollY;
  let scrollingUp = false;

  const updateScrollDir = () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) > 2) {
      scrollingUp = y < lastY;
      lastY = y;
    }
  };
  window.addEventListener('scroll', updateScrollDir, { passive: true });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          // Si entra desde arriba al hacer scroll hacia arriba, desliza suavemente desde arriba.
          if (scrollingUp && entry.boundingClientRect.top < window.innerHeight * 0.5) {
            el.dataset.revealFrom = 'top';
          } else {
            delete el.dataset.revealFrom;
          }
          requestAnimationFrame(() => el.classList.add('is-visible'));
        } else {
          // Al salir del viewport, prepara el origen para la próxima entrada (arriba o abajo).
          el.classList.remove('is-visible');
          if (entry.boundingClientRect.top < 0) {
            el.dataset.revealFrom = 'top';
          } else {
            delete el.dataset.revealFrom;
          }
        }
      }
    },
    {
      threshold: 0.08,
      rootMargin: '0px 0px -4% 0px',
    },
  );

  targets.forEach((el) => observer.observe(el));
}
