import { getCollection } from 'astro:content';
import { site } from '../config/site';
import { cloudSource, localSource } from './photo';

/** Experiencias ordenadas con el precio final y la foto (local o Cloudinary) ya resueltos. */
export async function getExperiences() {
  const items = await getCollection('experiencias');
  return items
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      id: e.id,
      ...e.data,
      price: e.data.price ?? site.defaultPriceCop,
      source: e.data.cloudinary ? cloudSource(e.data.cloudinary) : localSource(e.data.image!),
    }));
}

export type Experience = Awaited<ReturnType<typeof getExperiences>>[number];
