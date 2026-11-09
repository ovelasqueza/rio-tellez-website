/**
 * Configuración central del sitio.
 *
 * Los valores viven en src/content/site.json y se editan desde el panel /admin
 * (o a mano en ese archivo). Aquí solo se documenta y se exporta.
 *
 * - whatsapp: número en formato internacional, solo dígitos.
 * - defaultPriceCop: precio provisional por persona si la experiencia no define el suyo (COP).
 * - coffeePriceCop: precio provisional de la bolsa de café (COP).
 * - altitudeMsnm: altura del territorio y del café (msnm).
 * - departureTimes: horarios de salida en formato 24 h.
 * - social: dejar una URL vacía ('') muestra el ícono sin enlace.
 */
import data from '../content/site.json';

export interface Site {
  name: string;
  shortName: string;
  legalName: string;
  nit: string;
  address: {
    locality: string;
    municipality: string;
    region: string;
    country: string;
    countryCode: string;
  };
  geo: { lat: number; lng: number };
  altitudeMsnm: number;
  whatsapp: string;
  defaultPriceCop: number;
  coffeePriceCop: number;
  minTravelers: number;
  maxTravelers: number;
  departureTimes: string[];
  social: { facebook: string; tiktok: string; instagram: string };
}

export const site: Readonly<Site> = data;

export const mapsUrl = `https://www.google.com/maps?q=${site.geo.lat},${site.geo.lng}`;
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${site.geo.lat},${site.geo.lng}&z=15&output=embed`;
