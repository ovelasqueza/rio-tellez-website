/** Categorías de la galería. El nombre de la carpeta en src/assets/galeria/ debe ser una de estas claves. */
export const galleryCategories = ['rio', 'cafe', 'senderos', 'gastronomia', 'familias'] as const;
export type GalleryCategory = (typeof galleryCategories)[number];

export function isGalleryCategory(value: string): value is GalleryCategory {
  return (galleryCategories as readonly string[]).includes(value);
}
