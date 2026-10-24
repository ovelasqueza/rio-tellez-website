/**
 * Optimiza las fotos de la galería ANTES de guardarlas en el proyecto.
 *
 * Uso: npm run fotos
 *
 * - Recorre src/assets/galeria/<categoria>/
 * - Si una foto mide más de 2.000 px o pesa más de 1 MB:
 *   la gira según la orientación de la cámara, la reduce a 2.000 px (lado mayor)
 *   y la guarda como JPG de calidad 82, sin metadatos (se elimina la ubicación GPS).
 * - Las fotos .png/.webp grandes se convierten a .jpg (se borra el original).
 *
 * Nota: las fotos HEIC del iPhone deben exportarse primero a JPG.
 */
import sharp from 'sharp';
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const ROOT = 'src/assets/galeria';
const MAX_SIDE = 2000;
const MAX_BYTES = 1024 * 1024;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

let optimized = 0;
let skipped = 0;
const kb = (n) => `${Math.round(n / 1024)} KB`;

for (const category of await readdir(ROOT, { withFileTypes: true })) {
  if (!category.isDirectory()) continue;
  const dir = join(ROOT, category.name);

  for (const file of await readdir(dir)) {
    const ext = extname(file).toLowerCase();
    if (ext === '.heic' || ext === '.heif') {
      console.warn(`⚠  ${category.name}/${file}: formato HEIC no soportado. Expórtela a JPG.`);
      continue;
    }
    if (!EXTENSIONS.has(ext)) continue;

    const path = join(dir, file);
    const { size } = await stat(path);
    const meta = await sharp(path).metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

    if (longest <= MAX_SIDE && size <= MAX_BYTES) {
      skipped++;
      continue;
    }

    const outName = `${basename(file, extname(file)).toLowerCase().replace(/\s+/g, '-')}.jpg`;
    const outPath = join(dir, outName);
    const tmpPath = `${outPath}.tmp`;

    await sharp(path)
      .rotate() // aplica la orientación EXIF
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tmpPath);

    if (outPath !== path) await unlink(path);
    await rename(tmpPath, outPath);

    const after = (await stat(outPath)).size;
    console.log(`✔  ${category.name}/${outName}: ${longest}px ${kb(size)} → ${kb(after)}`);
    optimized++;
  }
}

console.log(`\nListo: ${optimized} optimizada(s), ${skipped} ya estaban bien.`);
