/**
 * URLs de Cloudinary para fotos guardadas en la nube.
 *
 * Se entrega con `f_auto` (WebP o AVIF según el navegador) y `q_auto` (compresión
 * perceptual sin pérdida visible). El original se guarda intacto en Cloudinary.
 */

export interface CloudImage {
  /** public_id en Cloudinary, p. ej. "rio-tellez/galeria/rio/cascada-abc123" */
  id: string;
  width: number;
  height: number;
}

export type CloudQuality = 'auto:good' | 'auto:best' | 'auto:eco';

const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME as string | undefined;

export function cloudName(): string {
  if (!CLOUD_NAME) {
    throw new Error(
      'Falta PUBLIC_CLOUDINARY_CLOUD_NAME. Defínalo en .env (local) y en Cloudflare Pages → Settings → Variables.',
    );
  }
  return CLOUD_NAME;
}

/** URL de una versión redimensionada (nunca se agranda más que el original). */
export function cloudUrl(img: CloudImage, width: number, quality: CloudQuality = 'auto:good', name = cloudName()): string {
  const w = Math.min(Math.round(width), img.width);
  const path = img.id.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${name}/image/upload/f_auto,q_${quality},c_limit,w_${w}/${path}`;
}

/** `srcset` con los anchos pedidos que no superen el original. */
export function cloudSrcset(img: CloudImage, widths: number[], quality: CloudQuality = 'auto:good', name = cloudName()) {
  const valid = widths.filter((w) => w <= img.width);
  const list = valid.length ? valid : [img.width];
  return {
    src: cloudUrl(img, list[list.length - 1]!, quality, name),
    srcset: list.map((w) => `${cloudUrl(img, w, quality, name)} ${w}w`).join(', '),
  };
}
