import { en } from './en';
import { es, type Dictionary } from './es';
import type { Lang } from '../lib/price';

export type { Lang };
export const languages: Lang[] = ['es', 'en'];
export const defaultLang: Lang = 'es';

const dictionaries: Record<Lang, Dictionary> = { es, en };

export function t(lang: Lang): Dictionary {
  return dictionaries[lang];
}

/** Ruta base de cada idioma: "/" para español, "/en/" para inglés. */
export function homePath(lang: Lang): string {
  return lang === defaultLang ? '/' : `/${lang}/`;
}

/** Páginas del sitio (ruta relativa sin idioma). */
export type PageKey = '' | 'galeria';

/** URL de una página en un idioma: ('galeria','en') → "/en/galeria/". */
export function pagePath(page: PageKey, lang: Lang): string {
  return page ? `${homePath(lang)}${page}/` : homePath(lang);
}

/** Enlace a una sección de la página principal que funciona desde cualquier página. */
export function sectionHref(id: string, lang: Lang): string {
  return `${homePath(lang)}#${id}`;
}

/** Enlace de menú: "Galería" lleva a la página de galería; el resto, a su sección. */
export function navHref(id: string, lang: Lang): string {
  return id === 'galeria' ? pagePath('galeria', lang) : sectionHref(id, lang);
}

/** Texto bilingüe de las colecciones de contenido. */
export type Localized = Record<Lang, string>;

export function pick(value: Localized, lang: Lang): string {
  return value[lang];
}

/** "2144" → "2.144" (es) / "2,144" (en). */
export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-CO' : 'en-US', { useGrouping: 'always' } as Intl.NumberFormatOptions).format(n);
}

/** Etiqueta de altura: "2.144 msnm" / "2,144 m a.s.l." */
export function altitudeLabel(n: number, lang: Lang): string {
  return lang === 'es' ? `${formatNumber(n, 'es')} msnm` : `${formatNumber(n, 'en')} m a.s.l.`;
}
