import { getCollection } from 'astro:content';
import { site } from '../config/site';

/** Experiencias ordenadas con el precio final ya resuelto. */
export async function getExperiences() {
  const items = await getCollection('experiencias');
  return items
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({ id: e.id, ...e.data, price: e.data.price ?? site.defaultPriceCop }));
}

export type Experience = Awaited<ReturnType<typeof getExperiences>>[number];
