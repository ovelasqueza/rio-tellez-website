import { clampTravelers, estimateTotal, formatCop, type Lang } from '../lib/price';
import { buildBookingMessage, buildWhatsAppUrl } from '../lib/whatsapp';

interface BookingConfig {
  lang: Lang;
  phone: string;
  min: number;
  max: number;
  errors: { name: string; date: string; datePast: string };
}

/** Fecha local de hoy en formato "AAAA-MM-DD". */
function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function initBookingForm(): void {
  const form = document.querySelector<HTMLFormElement>('#booking-form');
  if (!form?.dataset.booking) return;
  const cfg = JSON.parse(form.dataset.booking) as BookingConfig;

  const experience = form.querySelector<HTMLSelectElement>('#bk-experience')!;
  const date = form.querySelector<HTMLInputElement>('#bk-date')!;
  const time = form.querySelector<HTMLSelectElement>('#bk-time')!;
  const name = form.querySelector<HTMLInputElement>('#bk-name')!;
  const travelersOut = form.querySelector<HTMLOutputElement>('#bk-travelers')!;
  const totalOut = form.querySelector<HTMLOutputElement>('#bk-total')!;
  const stepButtons = form.querySelectorAll<HTMLButtonElement>('[data-travelers-step]');

  let travelers = clampTravelers(Number(travelersOut.textContent), cfg.min, cfg.max);
  date.min = todayIso();

  const selected = () => experience.selectedOptions[0];
  const price = () => Number(selected()?.dataset.price ?? 0);
  const total = () => estimateTotal(price(), travelers);

  function render() {
    travelersOut.textContent = String(travelers);
    totalOut.textContent = formatCop(total());
    stepButtons.forEach((btn) => {
      const step = Number(btn.dataset.travelersStep);
      btn.disabled = step < 0 ? travelers <= cfg.min : travelers >= cfg.max;
    });
  }

  function setError(input: HTMLInputElement, message: string) {
    const el = document.getElementById(`${input.id}-error`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (el) {
      el.textContent = message;
      el.classList.toggle('hidden', !message);
    }
  }

  function validate(): boolean {
    const nameError = name.value.trim().length < 2 ? cfg.errors.name : '';
    let dateError = '';
    if (!date.value) dateError = cfg.errors.date;
    else if (date.value < todayIso()) dateError = cfg.errors.datePast;

    setError(name, nameError);
    setError(date, dateError);

    const firstInvalid = dateError ? date : nameError ? name : null;
    firstInvalid?.focus();
    return !firstInvalid;
  }

  stepButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      travelers = clampTravelers(travelers + Number(btn.dataset.travelersStep), cfg.min, cfg.max);
      render();
    }),
  );
  experience.addEventListener('change', render);
  name.addEventListener('input', () => name.getAttribute('aria-invalid') === 'true' && setError(name, ''));
  date.addEventListener('change', () => date.getAttribute('aria-invalid') === 'true' && setError(date, ''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validate()) return;
    const message = buildBookingMessage(cfg.lang, {
      experience: selected()?.dataset.title ?? '',
      date: date.value,
      time: time.value,
      travelers,
      name: name.value,
      totalCop: total(),
    });
    window.open(buildWhatsAppUrl(cfg.phone, message), '_blank', 'noopener');
  });

  // "Elegir" en una tarjeta de experiencia → preselecciona en el formulario.
  document.querySelectorAll<HTMLAnchorElement>('[data-choose-experience]').forEach((link) =>
    link.addEventListener('click', () => {
      experience.value = link.dataset.chooseExperience ?? experience.value;
      render();
      // Tras el desplazamiento, llevar el foco al formulario para teclado/lectores.
      window.setTimeout(() => experience.focus({ preventScroll: true }), 400);
    }),
  );

  render();
}
