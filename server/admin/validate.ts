/** Validación y limpieza de lo que envía el panel antes de guardarlo en el repositorio. */
import { galleryCategories } from '../../src/config/gallery';
import { HttpError } from './env';
import type { CloudImage, ExperienceData, GalleryEntry, Localized, SiteData } from './types';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function fail(msg: string): never {
  throw new HttpError(400, msg);
}

/** Texto ES/EN. Si falta un idioma se copia del otro; si faltan ambos → undefined. */
export function localized(v: unknown): Localized | undefined {
  if (!isObj(v)) return undefined;
  const es = str(v.es);
  const en = str(v.en);
  if (!es && !en) return undefined;
  return { es: es || en, en: en || es };
}

function requiredLocalized(v: unknown, label: string): Localized {
  return localized(v) ?? fail(`Falta el texto "${label}".`);
}

function int(v: unknown, label: string, { min = -1e9, max = 1e12 } = {}): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) fail(`"${label}" debe ser un número entero válido.`);
  return n;
}

function optionalInt(v: unknown, label: string, opts?: { min?: number; max?: number }): number | undefined {
  return v === undefined || v === null || v === '' ? undefined : int(v, label, opts);
}

function cloudImage(v: unknown, label: string): CloudImage | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isObj(v) || !str(v.id).startsWith('rio-tellez/')) fail(`Foto de Cloudinary inválida en ${label}.`);
  return { id: str(v.id), width: int(v.width, 'ancho', { min: 1 }), height: int(v.height, 'alto', { min: 1 }) };
}

const ID_RE = new RegExp(`^(${galleryCategories.join('|')})/[a-z0-9][a-z0-9_-]*$`);

export function validateGallery(input: unknown): GalleryEntry[] {
  if (!Array.isArray(input)) fail('La galería debe ser una lista.');
  const seen = new Set<string>();
  return input.map((raw, i) => {
    if (!isObj(raw)) fail(`Foto #${i + 1} inválida.`);
    const id = str(raw.id);
    if (!ID_RE.test(id)) fail(`Identificador de foto inválido: "${id}".`);
    if (seen.has(id)) fail(`Foto repetida: "${id}".`);
    seen.add(id);
    const entry: GalleryEntry = { id };
    const orden = optionalInt(raw.orden, `orden de ${id}`);
    if (orden !== undefined) entry.orden = orden;
    if (raw.portada === true) entry.portada = true;
    if (raw.destacada === true) entry.destacada = true;
    const title = localized(raw.title);
    const description = localized(raw.description);
    const alt = localized(raw.alt);
    if (title) entry.title = title;
    if (description) entry.description = description;
    if (alt) entry.alt = alt;
    const cloud = cloudImage(raw.cloudinary, id);
    if (cloud) entry.cloudinary = cloud;
    return entry;
  });
}

export function validateExperience(raw: unknown, slug: string): ExperienceData {
  if (!isObj(raw)) fail(`Experiencia "${slug}" inválida.`);
  const t = (k: string, label: string) => requiredLocalized(raw[k], `${label} (${slug})`);
  const includes = Array.isArray(raw.includes) ? raw.includes.map((x) => localized(x)).filter((x): x is Localized => !!x) : [];
  if (!includes.length) fail(`La experiencia "${slug}" necesita al menos un elemento en "Incluye".`);
  const image = str(raw.image);
  const cloud = cloudImage(raw.cloudinary, slug);
  if (!image && !cloud) fail(`La experiencia "${slug}" necesita una foto.`);
  if (image && !/^\.\.\/\.\.\/assets\/[\w./-]+$/.test(image)) fail(`Ruta de foto local inválida en "${slug}".`);

  const data: ExperienceData = {
    order: int(raw.order, `orden (${slug})`),
    ...(image ? { image } : {}),
    ...(cloud ? { cloudinary: cloud } : {}),
    imageAlt: t('imageAlt', 'Descripción de la foto'),
    duration: t('duration', 'Duración'),
    badgeColor: raw.badgeColor === 'primary' ? 'primary' : 'secondary',
    category: t('category', 'Categoría'),
    title: t('title', 'Título'),
    description: t('description', 'Descripción'),
    includes,
  };
  const chip = localized(raw.chip);
  if (chip) data.chip = chip;
  const price = optionalInt(raw.price, `precio (${slug})`, { min: 1 });
  if (price !== undefined) data.price = price;
  return data;
}

export function validateSlug(slug: unknown): string {
  const s = str(slug);
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(s)) fail(`Nombre de archivo de experiencia inválido: "${s}".`);
  return s;
}

const url = (v: unknown, label: string) => {
  const s = str(v);
  if (s && !/^https:\/\/\S+$/.test(s)) fail(`"${label}" debe empezar por https://`);
  return s;
};

export function validateSite(raw: unknown, current: SiteData): SiteData {
  if (!isObj(raw)) fail('Datos del sitio inválidos.');
  const address = isObj(raw.address) ? raw.address : {};
  const geo = isObj(raw.geo) ? raw.geo : {};
  const social = isObj(raw.social) ? raw.social : {};
  const req = (v: unknown, label: string) => str(v) || fail(`Falta "${label}".`);
  const num = (v: unknown, label: string) => {
    const n = Number(v);
    if (!Number.isFinite(n)) fail(`"${label}" debe ser un número.`);
    return n;
  };

  const whatsapp = str(raw.whatsapp).replace(/\D/g, '');
  if (whatsapp.length < 10 || whatsapp.length > 15) fail('El WhatsApp debe tener entre 10 y 15 dígitos, con indicativo (57…).');

  const departureTimes = (Array.isArray(raw.departureTimes) ? raw.departureTimes : []).map(str).filter(Boolean);
  if (!departureTimes.length) fail('Debe haber al menos un horario de salida.');
  for (const t of departureTimes) if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) fail(`Horario inválido "${t}" (use HH:MM en 24 h).`);

  const minTravelers = int(raw.minTravelers, 'Mínimo de viajeros', { min: 1, max: 100 });
  const maxTravelers = int(raw.maxTravelers, 'Máximo de viajeros', { min: 1, max: 500 });
  if (maxTravelers < minTravelers) fail('El máximo de viajeros no puede ser menor que el mínimo.');

  return {
    ...current,
    name: req(raw.name, 'Nombre'),
    shortName: req(raw.shortName, 'Nombre corto'),
    legalName: req(raw.legalName, 'Razón social'),
    nit: req(raw.nit, 'NIT'),
    address: {
      locality: req(address.locality, 'Vereda / sector'),
      municipality: req(address.municipality, 'Municipio'),
      region: req(address.region, 'Departamento'),
      country: req(address.country, 'País'),
      countryCode: req(address.countryCode, 'Código de país').toUpperCase(),
    },
    geo: { lat: num(geo.lat, 'Latitud'), lng: num(geo.lng, 'Longitud') },
    altitudeMsnm: int(raw.altitudeMsnm, 'Altura (msnm)', { min: 0, max: 9000 }),
    whatsapp,
    defaultPriceCop: int(raw.defaultPriceCop, 'Precio por defecto', { min: 0 }),
    coffeePriceCop: int(raw.coffeePriceCop, 'Precio del café', { min: 0 }),
    minTravelers,
    maxTravelers,
    departureTimes: [...new Set(departureTimes)].sort(),
    social: {
      facebook: url(social.facebook, 'Facebook'),
      tiktok: url(social.tiktok, 'TikTok'),
      instagram: url(social.instagram, 'Instagram'),
    },
    heroCloudinary: cloudImage(raw.heroCloudinary, 'foto de portada principal'),
  };
}
