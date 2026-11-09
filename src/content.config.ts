import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Texto obligatorio en español e inglés. */
const localized = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
});

/** Foto guardada en Cloudinary (subida desde el panel /admin). */
const cloudImage = z.object({
  id: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const experiencias = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/experiencias' }),
  schema: ({ image }) =>
    z
      .object({
        order: z.number().int(),
        /** Foto local (src/assets). Se ignora si hay `cloudinary`. */
        image: image().optional(),
        /** Foto en la nube (subida desde /admin); tiene prioridad sobre `image`. */
        cloudinary: cloudImage.optional(),
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
      })
      .refine((d) => d.image || d.cloudinary, { message: 'La experiencia necesita `image` o `cloudinary`.' }),
});

/**
 * Detalles de cada foto. La imagen puede estar en Cloudinary (campo `cloudinary`, se sube desde /admin)
 * o en src/assets/galeria/<categoria>/ (se detecta sola).
 */
const galeria = defineCollection({
  loader: file('./src/content/galeria.yaml'),
  schema: z.object({
    orden: z.number().int().optional(),
    portada: z.boolean().default(false),
    destacada: z.boolean().default(false),
    title: localized.optional(),
    description: localized.optional(),
    alt: localized.optional(),
    cloudinary: cloudImage.optional(),
  }),
});

export const collections = { experiencias, galeria };
