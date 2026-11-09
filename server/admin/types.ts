/** Tipos compartidos entre el panel (navegador) y la API (Cloudflare Pages Functions). */
import type { Site } from '../../src/config/site';

export type Localized = { es: string; en: string };

export interface CloudImage {
  id: string;
  width: number;
  height: number;
}

/** Una entrada de src/content/galeria.yaml */
export interface GalleryEntry {
  id: string;
  orden?: number;
  portada?: boolean;
  destacada?: boolean;
  title?: Localized;
  description?: Localized;
  alt?: Localized;
  cloudinary?: CloudImage;
}

/** Contenido de src/content/experiencias/<slug>.yaml */
export interface ExperienceData {
  order: number;
  /** Ruta relativa a una foto local, p. ej. "../../assets/images/experiencias/x.jpg" */
  image?: string;
  cloudinary?: CloudImage;
  imageAlt: Localized;
  duration: Localized;
  chip?: Localized;
  badgeColor: 'primary' | 'secondary';
  price?: number;
  category: Localized;
  title: Localized;
  description: Localized;
  includes: Localized[];
}

export interface ExperienceFile {
  slug: string;
  data: ExperienceData;
}

export type SiteData = Site;

export interface ContentPayload {
  /** Commit sobre el que se editó (control de cambios simultáneos). */
  head: string;
  cloudName: string;
  email: string;
  gallery: GalleryEntry[];
  experiences: ExperienceFile[];
  site: SiteData;
}

export interface SaveResult {
  head: string;
  changed: boolean;
  url?: string;
  warnings?: string[];
}
