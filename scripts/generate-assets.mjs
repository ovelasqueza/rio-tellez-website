/**
 * Genera favicon, apple-touch-icon, logo recortado e imagen Open Graph
 * a partir del logo y la foto de portada.
 *
 * Uso: npm run assets   (volver a correr si cambia el logo o la foto de portada)
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const LOGO_SRC = 'src/assets/logo.png';
const HERO_SRC = 'src/assets/images/hero-canon.jpg';
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const BOSQUE = { r: 15, g: 61, b: 46, alpha: 1 };

await mkdir('public', { recursive: true });

// 1) Logo sin márgenes blancos sobrantes (se usa en encabezado y pie).
const trimmed = await sharp(LOGO_SRC).trim({ background: '#ffffff', threshold: 20 }).png().toBuffer();
await sharp(trimmed).toFile('src/assets/logo-trim.png');
const meta = await sharp(trimmed).metadata();
console.log(`logo-trim.png ${meta.width}x${meta.height}`);

// Logo centrado en un cuadrado blanco con margen.
async function squareLogo(size, padding) {
  const inner = size - padding * 2;
  const logo = await sharp(trimmed).resize(inner, inner, { fit: 'contain', background: WHITE }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png();
}

// 2) Favicons.
await (await squareLogo(512, 40)).toFile('public/favicon.png');
await (await squareLogo(180, 14)).toFile('public/apple-touch-icon.png');
await (await squareLogo(32, 1)).toFile('public/favicon-32.png');
console.log('favicon.png, favicon-32.png, apple-touch-icon.png');

// 3) Imagen Open Graph 1200x630: foto del cañón oscurecida + logo en tarjeta blanca.
const W = 1200;
const H = 630;
const hero = await sharp(HERO_SRC).resize(W, H, { fit: 'cover' }).modulate({ brightness: 0.7 }).toBuffer();
const shade = await sharp({ create: { width: W, height: H, channels: 4, background: { ...BOSQUE, alpha: 0.35 } } })
  .png()
  .toBuffer();
const card = await (await squareLogo(300, 24)).toBuffer();
await sharp(hero)
  .composite([
    { input: shade, blend: 'over' },
    { input: card, gravity: 'center' },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/og-image.jpg');
console.log('og-image.jpg 1200x630');

// 4) Logo del café con fondo transparente (el original trae fondo crema).
//    La parte oscura del logo se vuelve el canal alfa y se pinta en verde Bosque.
const COFFEE_LOGO_SRC = 'src/assets/logo-cafe.png';
const coffee = sharp(COFFEE_LOGO_SRC);
const { width: cw, height: ch } = await coffee.metadata();
const alpha = await sharp(COFFEE_LOGO_SRC)
  .greyscale()
  .negate()
  .linear(2.4, -90) // fondo crema → 0 (transparente), trazos → opacos con bordes suaves
  .toColourspace('b-w')
  .raw()
  .toBuffer();
const coloured = await sharp({ create: { width: cw, height: ch, channels: 3, background: { r: 15, g: 61, b: 46 } } })
  .joinChannel(alpha, { raw: { width: cw, height: ch, channels: 1 } })
  .png()
  .toBuffer();
await sharp(coloured).trim({ threshold: 1 }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ width: 700, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile('src/assets/logo-cafe-trim.png');
const cm = await sharp('src/assets/logo-cafe-trim.png').metadata();
console.log(`logo-cafe-trim.png ${cm.width}x${cm.height} (transparente)`);
