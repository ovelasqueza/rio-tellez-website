import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { isGalleryCategory, galleryCategories, type GalleryCategory } from '../config/gallery';
import type { Lang } from './price';

type Localized = Record<Lang, string>;

export interface GalleryPhoto {
  /** "categoria/nombre-archivo" */
  id: string;
  category: GalleryCategory;
  image: ImageMetadata;
  orientation: 'landscape' | 'portrait';
  portada: boolean;
  destacada: boolean;
  orden?: number;
  title?: Localized;
  description?: Localized;
  alt?: Localized;
}

// Todas las imágenes dentro de src/assets/galeria/<categoria>/ (se detectan solas).
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/galeria/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
});

/** Lista de fotos de la galería, ordenadas. */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const details = new Map((await getCollection('galeria')).map((e) => [e.id, e.data]));

  const photos = Object.entries(files).map(([path, mod]) => {
    const [, folder, file] = /\/src\/assets\/galeria\/([^/]+)\/([^/]+)$/.exec(path) ?? [];
    if (!folder || !file || !isGalleryCategory(folder)) {
      throw new Error(
        `La carpeta "${folder}" no es una categoría válida de la galería (${path}). Use: ${galleryCategories.join(', ')}.`,
      );
    }
    const id = `${folder}/${file.replace(/\.[^.]+$/, '')}`;
    const meta = details.get(id);
    const image = mod.default;
    return {
      id,
      category: folder,
      image,
      orientation: image.height > image.width * 1.05 ? 'portrait' : 'landscape',
      portada: meta?.portada ?? false,
      destacada: meta?.destacada ?? false,
      orden: meta?.orden,
      title: meta?.title,
      description: meta?.description,
      alt: meta?.alt,
    } satisfies GalleryPhoto;
  });

  // Avisar si galeria.yaml menciona una foto que no existe (p. ej. nombre de archivo mal escrito).
  const found = new Set(photos.map((p) => p.id));
  for (const id of details.keys()) {
    if (!found.has(id)) console.warn(`[galería] "${id}" está en galeria.yaml pero no existe la foto src/assets/galeria/${id}.*`);
  }

  return photos.sort((a, b) => {
    const oa = a.orden ?? Number.POSITIVE_INFINITY;
    const ob = b.orden ?? Number.POSITIVE_INFINITY;
    return oa !== ob ? oa - ob : a.id.localeCompare(b.id);
  });
}

/** Fotos para la galería de la página principal: las marcadas "portada" o, si faltan, las primeras. */
export async function getHomeGallery(limit = 6): Promise<GalleryPhoto[]> {
  const all = await getGalleryPhotos();
  const chosen = all.filter((p) => p.portada).slice(0, limit);
  for (const p of all) {
    if (chosen.length >= limit) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen;
}
