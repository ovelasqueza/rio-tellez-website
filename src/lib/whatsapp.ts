import { formatCop, localeOf, type Lang } from './price';

export interface BookingData {
  experience: string;
  /** Fecha ISO "AAAA-MM-DD" (valor de <input type="date">). */
  date: string;
  /** Hora 24 h "HH:MM". */
  time: string;
  travelers: number;
  name: string;
  totalCop: number;
}

/** Construye la URL de WhatsApp con texto prellenado. */
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** "13:30" → "01:30 PM". */
export function formatTime12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const h = Number(match[1]);
  const m = match[2];
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
}

/** "2026-11-15" → "domingo, 15 de noviembre de 2026" / "Sunday, November 15, 2026". */
export function formatIsoDate(iso: string, lang: Lang): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, y, mo, d] = match;
  // Se usa UTC para que la zona horaria no corra el día.
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return new Intl.DateTimeFormat(localeOf(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

const BOOKING_LABELS = {
  es: {
    greeting: 'Hola, quiero reservar una experiencia en Río Téllez 🌿',
    experience: 'Experiencia',
    date: 'Fecha',
    time: 'Horario',
    travelers: 'Personas',
    name: 'Nombre',
    total: 'Total estimado',
  },
  en: {
    greeting: 'Hello, I would like to book an experience at Río Téllez 🌿',
    experience: 'Experience',
    date: 'Date',
    time: 'Time',
    travelers: 'People',
    name: 'Name',
    total: 'Estimated total',
  },
} as const;

export function buildBookingMessage(lang: Lang, data: BookingData): string {
  const l = BOOKING_LABELS[lang];
  return [
    l.greeting,
    `• ${l.experience}: ${data.experience}`,
    `• ${l.date}: ${formatIsoDate(data.date, lang)}`,
    `• ${l.time}: ${formatTime12h(data.time)}`,
    `• ${l.travelers}: ${data.travelers}`,
    `• ${l.name}: ${data.name.trim()}`,
    `• ${l.total}: ${formatCop(data.totalCop)}`,
  ].join('\n');
}

export function buildGenericBookingMessage(lang: Lang): string {
  return lang === 'es'
    ? 'Hola, quiero información para reservar una experiencia en Río Téllez 🌿'
    : 'Hello, I would like information to book an experience at Río Téllez 🌿';
}

export function buildCoffeeOrderMessage(lang: Lang): string {
  return lang === 'es'
    ? 'Hola, quiero pedir Café de Origen Río Téllez ☕ (café de altura). ¿Me cuentan presentaciones y disponibilidad?'
    : 'Hello, I would like to order Río Téllez Origin Coffee ☕ (high-altitude coffee). Could you share sizes and availability?';
}
