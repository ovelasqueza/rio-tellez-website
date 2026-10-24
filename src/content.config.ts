import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Texto obligatorio en español e inglés. */
const localized = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
});

const experiencias = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/experiencias' }),
  schema: ({ image }) =>
    z.object({
      order: z.number().int(),
      image: image(),
      imageAlt: localized,
      duration: localized,
      /** Etiqueta inferior de la foto; si falta se muestra la altura del territorio. */
      chip: localized.optional(),
      badgeColor: z.enum(['primary', 'secondary']),
      /** Precio por persona en COP. Si falta se usa `site.defaultPriceCop`. */
      price: z.number().int().positive().optional(),
      category: localized,
      title: localized,
      description: localized,
      includes: z.array(localized).min(1),
    }),
});

/** Detalles opcionales de cada foto (las imágenes viven en src/assets/galeria/<categoria>/). */
const galeria = defineCollection({
  loader: file('./src/content/galeria.yaml'),
  schema: z.object({
    orden: z.number().int().optional(),
    portada: z.boolean().default(false),
    destacada: z.boolean().default(false),
    title: localized.optional(),
    description: localized.optional(),
    alt: localized.optional(),
  }),
});

export const collections = { experiencias, galeria };
