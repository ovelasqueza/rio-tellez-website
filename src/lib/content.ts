import { getCollection } from 'astro:content';
import { cloudSource, localSource } from './photo';

/** Experiencias ordenadas con la foto (local o Cloudinary) ya resuelta. */
export async function getExperiences() {
  const items = await getCollection('experiencias');
  return items
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      id: e.id,
      ...e.data,
      source: e.data.cloudinary ? cloudSource(e.data.cloudinary) : localSource(e.data.image!),
    }));
}

export type Experience = Awaited<ReturnType<typeof getExperiences>>[number];
