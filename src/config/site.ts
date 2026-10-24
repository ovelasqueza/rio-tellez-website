/**
 * Configuración central del sitio.
 * Para cambiar precios, WhatsApp, redes o datos de contacto, edite SOLO este archivo.
 */
export const site = {
  name: 'Río Téllez',
  shortName: 'ATURTELLEZCOOP',
  legalName: 'Cooperativa Multiactiva Agroturística del Río Téllez – ATURTELLEZCOOP',
  nit: '901.851.272-6',
  address: {
    locality: 'Vereda La Vega, sector Puente Río Téllez',
    municipality: 'Funes',
    region: 'Nariño',
    country: 'Colombia',
    countryCode: 'CO',
  },
  geo: { lat: 1.0083266692228996, lng: -77.43155836414786 },

  /** Altura del territorio y del café (msnm). */
  altitudeMsnm: 2144,

  /** Número de WhatsApp en formato internacional, solo dígitos. */
  whatsapp: '573206807016',

  /** Precio provisional por persona si la experiencia no define el suyo (COP). */
  defaultPriceCop: 50000,
  /** Precio provisional de la bolsa de café (COP). */
  coffeePriceCop: 50000,

  minTravelers: 1,
  maxTravelers: 8,

  /** Horarios de salida en formato 24 h. */
  departureTimes: ['06:30', '08:30', '13:30'],

  /** Dejar una URL vacía ('') muestra el ícono sin enlace. */
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61553108319451',
    tiktok: 'https://www.tiktok.com/@agroecoturism',
    instagram: '',
  },
} as const;

export type Site = typeof site;

export const mapsUrl = `https://www.google.com/maps?q=${site.geo.lat},${site.geo.lng}`;
export const mapsEmbedUrl = `https://maps.google.com/maps?q=${site.geo.lat},${site.geo.lng}&z=15&output=embed`;
