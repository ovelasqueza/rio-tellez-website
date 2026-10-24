export type Lang = 'es' | 'en';

const LOCALES: Record<Lang, string> = { es: 'es-CO', en: 'en-US' };

export function localeOf(lang: Lang): string {
  return LOCALES[lang];
}

/**
 * Formatea un valor en pesos colombianos: 50000 → "$50.000 COP".
 * Se usa el formato colombiano (punto de miles) en ambos idiomas porque es la moneda local.
 */
export function formatCop(value: number): string {
  return `${formatCopAmount(value)} COP`;
}

/** 50000 → "$50.000" (sin sufijo de moneda). */
export function formatCopAmount(value: number): string {
  return `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.round(value))}`;
}

/** Limita el número de viajeros al rango permitido. */
export function clampTravelers(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Total estimado = precio por persona × personas. */
export function estimateTotal(pricePerPerson: number, travelers: number): number {
  if (!Number.isFinite(pricePerPerson) || pricePerPerson < 0) return 0;
  if (!Number.isFinite(travelers) || travelers < 0) return 0;
  return pricePerPerson * Math.trunc(travelers);
}
