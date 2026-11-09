import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { isGalleryCategory, galleryCategories, type GalleryCategory } from '../config/gallery';
import { cloudSource, localSource, orientationOf, type PhotoSource } from './photo';
import type { Lang } from './price';

type Localized = Record<Lang, string>;

export interface GalleryPhoto {
  /** "categoria/nombre" */
  id: string;
  category: GalleryCategory;
  source: PhotoSource;
  orientation: 'landscape' | 'portrait';
  portada: boolean;
  destacada: boolean;
  orden?: number;
  title?: Localized;
  description?: Localized;
  alt?: Localized;
  /** Ruta del archivo en el repositorio si la foto es local (p. ej. "src/assets/galeria/rio/x.jpg"). */
  repoPath?: string;
}

// Todas las imágenes dentro de src/assets/galeria/<categoria>/ (se detectan solas).
const files = import.meta.glob<{ default: ImageMetadata }>('/src/assets/galeria/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}', {
  eager: true,
});

function categoryOf(id: string, context: string): GalleryCategory {
  const folder = id.split('/')[0] ?? '';
  if (!isGalleryCategory(folder)) {
    throw new Error(`La categoría "${folder}" no es válida en la galería (${context}). Use: ${galleryCategories.join(', ')}.`);
  }
  return folder;
}

/** Lista de fotos de la galería (locales + Cloudinary), ordenadas. */
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const entries = await getCollection('galeria');
  const details = new Map(entries.map((e) => [e.id, e.data]));
  const photos = new Map<string, GalleryPhoto>();

  // 1) Fotos locales del repositorio.
  for (const [path, mod] of Object.entries(files)) {
    const [, folder, file] = /\/src\/assets\/galeria\/([^/]+)\/([^/]+)$/.exec(path) ?? [];
    if (!folder || !file) continue;
    const id = `${folder}/${file.replace(/\.[^.]+$/, '')}`;
    const meta = details.get(id);
    // Si la entrada tiene foto en la nube, la nube tiene prioridad.
    if (meta?.cloudinary) continue;
    const source = localSource(mod.default);
    photos.set(id, {
      id,
      category: categoryOf(id, path),
      source,
      orientation: orientationOf(source),
      portada: meta?.portada ?? false,
      destacada: meta?.destacada ?? false,
      orden: meta?.orden,
      title: meta?.title,
      description: meta?.description,
      alt: meta?.alt,
      repoPath: path.replace(/^\//, ''),
    });
  }

  // 2) Fotos en Cloudinary (definidas en galeria.yaml).
  for (const [id, meta] of details) {
    if (!meta.cloudinary) continue;
    const source = cloudSource(meta.cloudinary);
    photos.set(id, {
      id,
      category: categoryOf(id, `galeria.yaml → ${id}`),
      source,
      orientation: orientationOf(source),
      portada: meta.portada,
      destacada: meta.destacada,
      orden: meta.orden,
      title: meta.title,
      description: meta.description,
      alt: meta.alt,
    });
  }

  // Avisar si galeria.yaml menciona una foto que no existe (p. ej. nombre de archivo mal escrito).
  for (const id of details.keys()) {
    if (!photos.has(id)) console.warn(`[galería] "${id}" está en galeria.yaml pero no tiene foto (ni local ni en Cloudinary).`);
  }

  return [...photos.values()].sort((a, b) => {
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
