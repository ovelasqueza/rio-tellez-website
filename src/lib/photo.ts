import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { cloudSrcset, type CloudImage } from './cloudinary';

/** Foto local (procesada por Astro al compilar) o en Cloudinary (servida por su CDN). */
export type PhotoSource =
  | { kind: 'local'; image: ImageMetadata; width: number; height: number }
  | { kind: 'cloud'; cloud: CloudImage; width: number; height: number };

export function localSource(image: ImageMetadata): PhotoSource {
  return { kind: 'local', image, width: image.width, height: image.height };
}

export function cloudSource(cloud: CloudImage): PhotoSource {
  return { kind: 'cloud', cloud, width: cloud.width, height: cloud.height };
}

export function orientationOf(s: PhotoSource): 'landscape' | 'portrait' {
  return s.height > s.width * 1.05 ? 'portrait' : 'landscape';
}

/** Versión grande (para el visor a pantalla completa). */
export async function fullSize(s: PhotoSource): Promise<{ src: string; srcset: string }> {
  if (s.kind === 'cloud') return cloudSrcset(s.cloud, [800, 1200, 1600, 2400], 'auto:best');
  const widths = [800, 1200, 1600].filter((w) => w <= s.width);
  const full = await getImage({ src: s.image, widths: widths.length ? widths : [s.width], format: 'webp', quality: 75 });
  return { src: full.src, srcset: full.srcSet.attribute };
}
