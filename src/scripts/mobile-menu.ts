/** Panel de menú móvil: abrir/cerrar, Esc, foco atrapado y retorno del foco. */
export function initMobileMenu(): void {
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const openBtn = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!menu || !openBtn) return;

  const focusables = () =>
    Array.from(menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
      (el) => el.offsetParent !== null,
    );

  function open() {
    menu!.classList.remove('hidden');
    openBtn!.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    focusables()[0]?.focus();
  }

  function close(returnFocus = true) {
    menu!.classList.add('hidden');
    openBtn!.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (returnFocus) openBtn!.focus();
  }

  openBtn.addEventListener('click', open);
  menu.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', () => close()));
  // Al elegir una sección se cierra sin robar el foco al destino.
  menu.querySelectorAll('[data-menu-link]').forEach((el) => el.addEventListener('click', () => close(false)));

  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}
