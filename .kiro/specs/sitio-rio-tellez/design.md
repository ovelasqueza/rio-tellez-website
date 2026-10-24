# Diseño técnico — Sitio web Río Téllez (ATURTELLEZCOOP)

Basado en `requirements.md`. Referencias visuales: `_stitch/codigo/viewMovil.html` (móvil) y `_stitch/codigo/viewPC.html` (escritorio).

## 1. Stack

| Capa | Herramienta | Versión fijada |
|---|---|---|
| Framework (sitio estático) | Astro | 7.4.2 |
| Estilos | Tailwind CSS + `@tailwindcss/vite` | 4.3.3 |
| Fuentes autoalojadas | Archivos `woff2` (latín y latín ext.) en `src/assets/fonts`, tomados de Fontsource (OFL) | — |
| Íconos (SVG en build, sin fuente de íconos) | `astro-icon` + `@iconify-json/material-symbols` + `@iconify-json/simple-icons` | 1.2.0 / 1.2.96 / 1.2.100 |
| Sitemap | `@astrojs/sitemap` | 3.7.4 |
| Tipado / chequeo | TypeScript + `@astrojs/check` | 7.0.2 / 0.9.12 |
| Pruebas unitarias | Vitest | se fija al instalar |
| Runtime local | Node 24.20 (requiere ≥ 22.23) | — |

Decisiones clave frente al HTML de Stitch:

- **Tailwind compilado** en vez del CDN `cdn.tailwindcss.com` (que pesa ~300 KB y es solo para prototipos).
- **Íconos como SVG en línea** en vez de la fuente Material Symbols (la fuente variable pesa cientos de KB; aquí solo se envían los ~25 íconos usados).
- **Fuentes autoalojadas** (sin Google Fonts) → menos peticiones y sin depender de terceros.
- **Cero frameworks JS en el cliente**: la interactividad (formulario, filtros de galería, menú) son 3 scripts pequeños en TypeScript.

## 2. Estructura del proyecto

```
rio-tellez-website/
├── _stitch/                      # Referencia de diseño (no se publica)
├── .kiro/specs/sitio-rio-tellez/ # requirements.md, design.md, tasks.md
├── public/
│   ├── favicon.png, apple-touch-icon.png   # generados desde el logo
│   ├── og-image.jpg                        # vista previa al compartir
│   └── robots.txt
├── src/
│   ├── assets/
│   │   ├── logo.png
│   │   └── images/               # fotos (temporales de Stitch → reales)
│   │       ├── hero-canon.jpg
│   │       ├── experiencias/*.jpg
│   │       ├── galeria/*.jpg
│   │       └── cafe.jpg
│   ├── config/
│   │   └── site.ts               # WhatsApp, redes, precio, altura, GPS, horarios
│   ├── content/
│   │   ├── experiencias/*.yaml   # 4 experiencias (textos ES/EN)
│   │   └── galeria.yaml          # fotos de la galería (textos ES/EN)
│   ├── content.config.ts         # esquemas Zod de las colecciones
│   ├── i18n/
│   │   ├── es.ts                 # textos de la interfaz y secciones
│   │   ├── en.ts
│   │   └── index.ts              # useTranslations(lang), getLangFromUrl()
│   ├── lib/
│   │   ├── whatsapp.ts           # arma URLs y mensajes prellenados (puro, testeable)
│   │   ├── price.ts              # formato COP y total estimado (puro, testeable)
│   │   └── *.test.ts
│   ├── scripts/
│   │   ├── booking-form.ts       # validación, total en vivo, abrir WhatsApp
│   │   ├── gallery-filter.ts     # filtros por categoría
│   │   └── mobile-menu.ts        # panel del menú móvil
│   ├── components/
│   │   ├── Header.astro          # logo, nav escritorio, ES/EN, CTA, botón menú
│   │   ├── MobileMenu.astro
│   │   ├── BottomNav.astro       # barra inferior solo móvil
│   │   ├── LanguageSwitch.astro
│   │   ├── WhatsAppFloat.astro
│   │   ├── sections/
│   │   │   ├── Hero.astro
│   │   │   ├── Essence.astro     # Nuestra Esencia + 4 pilares
│   │   │   ├── Experiences.astro # + ExperienceCard.astro
│   │   │   ├── Booking.astro     # formulario de reserva
│   │   │   ├── Gallery.astro
│   │   │   ├── HowToArrive.astro
│   │   │   └── Coffee.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro      # <head>: SEO, OG, hreflang, JSON-LD, fuentes
│   ├── pages/
│   │   ├── index.astro           # español  → /
│   │   └── en/index.astro        # inglés   → /en/
│   └── styles/
│       └── global.css            # Tailwind + tokens @theme del diseño Stitch
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Ambas páginas renderizan el mismo componente `HomePage` recibiendo `lang`, así el contenido nunca se desincroniza entre idiomas.

## 3. Sistema de diseño (tokens)

Los tokens del `tailwind.config` de Stitch se pasan a `@theme` de Tailwind v4 en `global.css`, conservando los mismos nombres de clase (`bg-primary-container`, `text-on-surface-variant`, `font-headline-sm`, `text-label-caps`, `px-margin-mobile`…). Esto permite copiar casi literal el marcado de Stitch.

```css
@import "tailwindcss";

@theme {
  --color-primary: #00261a;
  --color-primary-container: #0f3d2e;   /* "Bosque" */
  --color-secondary: #aa3528;           /* "Cereza" (CTAs de reserva) */
  --color-surface: #fff8f3;
  --color-surface-container-low: #fff2e0;
  /* … resto de colores del diseño … */

  --font-display: "Playfair Display Variable", serif;
  --font-sans: "Plus Jakarta Sans Variable", sans-serif;

  --text-display-hero: 56px;  --text-display-hero--line-height: 68px;
  --text-headline-lg-mobile: 28px; /* … resto de escalas … */

  --spacing-margin-mobile: 1.25rem;
  --spacing-margin: 3rem;
  /* … */
}
```

Se respetan los radios del HTML de Stitch (que es lo que se ve en las capturas), no los del `.md`, porque difieren.

Contraste: se verificará `text-on-primary-container` (#7ba894) sobre `#0f3d2e`, que en Stitch se usa para texto pequeño y podría no cumplir AA; si no cumple, se aclara el tono.

## 4. Configuración central (`src/config/site.ts`)

```ts
export const site = {
  name: 'Río Téllez',
  legalName: 'Cooperativa Multiactiva Agroturística del Río Téllez – ATURTELLEZCOOP',
  nit: '901.851.272-6',
  address: 'Vereda La Vega, sector Puente Río Téllez, Funes, Nariño, Colombia',
  geo: { lat: 1.0083266692228996, lng: -77.43155836414786 },
  altitudeMsnm: 2144,
  whatsapp: '573206807016',
  defaultPriceCop: 50000,      // provisional, aplica si la experiencia no define precio
  coffeePriceCop: 50000,       // provisional
  maxTravelers: 8,
  departureTimes: ['06:30', '08:30', '13:30'],
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61553108319451',
    tiktok: 'https://www.tiktok.com/@agroecoturism',
    instagram: '',             // vacío → ícono visible, no clicable
  },
} as const;
```

Cambiar un precio, el WhatsApp o activar Instagram = editar solo este archivo.

## 5. Modelo de contenido

`src/content/experiencias/caminatas-cascadas.yaml`:

```yaml
order: 1
slug: caminatas-cascadas
image: ../../assets/images/experiencias/caminatas-cascadas.jpg
duration: { es: "4 horas", en: "4 hours" }
badgeColor: primary          # primary | secondary (alterna como en Stitch)
# price: 50000               # opcional; si falta usa site.defaultPriceCop
category: { es: "Senderismo & Agua", en: "Hiking & Water" }
title: { es: "Caminatas Ecológicas & Cascadas", en: "Eco Hikes & Waterfalls" }
description: { es: "…", en: "…" }
includes:
  - { es: "Guianza comunitaria local", en: "Local community guides" }
  - { es: "Pozas naturales y caídas de agua", en: "Natural pools and waterfalls" }
```

`src/content/galeria.yaml`: lista de `{ image, category: rio|cafe|senderos|gastronomia, title {es,en}, description {es,en} }`.

`content.config.ts` valida todo con Zod; si falta una traducción o una imagen, **el build falla** (evita publicar contenido incompleto).

## 6. Internacionalización

- Rutas: `/` (es, por defecto) y `/en/`. Config `i18n` de Astro con `defaultLocale: 'es'`, `prefixDefaultLocale: false`.
- Los IDs de sección son los mismos en ambos idiomas (`#origen`, `#rutas`, `#reservas`, `#galeria`, `#como-llegar`, `#cafe`), así `LanguageSwitch` conserva el `#hash` al cambiar de idioma.
- Textos de interfaz en `src/i18n/es.ts` y `en.ts`; `en.ts` se tipa como `typeof es`, así TypeScript avisa si falta una traducción.
- `<html lang>`, `<link rel="alternate" hreflang="es|en|x-default">` y `og:locale` por página.

## 7. Flujo de reserva por WhatsApp

```
[Elegir en tarjeta] → scroll a #reservas + preselecciona experiencia (data-attribute)
[Formulario] experiencia · fecha (min = hoy) · horario · personas (1–8, botones − / +) · nombre
      │  cada cambio → total = precio × personas → formato COP
      ▼
[Reservar por WhatsApp] → valida → buildBookingMessage(lang, datos) → window.open(wa.me/573206807016?text=…)
```

Mensaje (ES):

```
Hola, quiero reservar una experiencia en Río Téllez 🌿
• Experiencia: Caminatas Ecológicas & Cascadas
• Fecha: sábado 15 de noviembre de 2026
• Horario: 06:30 AM
• Personas: 2
• Nombre: Mariana Gómez
• Total estimado: $100.000 COP
```

- `lib/whatsapp.ts` expone `buildWhatsAppUrl(phone, text)`, `buildBookingMessage(lang, data)` y `buildCoffeeOrderMessage(lang)`; son funciones puras con pruebas unitarias.
- **Mejora progresiva**: sin JavaScript, el botón "Reservar" sigue siendo un enlace `wa.me` con un mensaje genérico.
- Validación accesible: errores con `aria-invalid` y `aria-describedby`, foco al primer campo con error.
- No se almacena nada; no hay backend.

## 8. Comportamiento por pantalla

| Elemento | Móvil (< 768 px) | Escritorio (≥ 1280 px) |
|---|---|---|
| Navegación | Botón menú (panel) + barra inferior fija de 6 ítems | Menú horizontal en el encabezado |
| Botón WhatsApp flotante | Encima de la barra inferior (respeta `safe-area-inset`) | Esquina inferior derecha |
| Pilares | Lista vertical (ícono a la izquierda) | Grilla de 4 columnas |
| Experiencias | 1 columna | 4 columnas (2 en tablet) |
| Formulario | Una columna, campos de 48 px | Texto a la izquierda (5/12), formulario a la derecha (7/12) |
| Galería | 2 columnas, filtros con scroll horizontal | 3 columnas |
| Cómo llegar | Tarjetas, luego mapa | Tarjetas (5/12) + mapa (7/12) |
| Café | Foto arriba, ficha abajo | Foto y ficha lado a lado |

Las secciones se anclan con `scroll-margin-top` para que el encabezado fijo no tape los títulos.

## 9. Imágenes

- Las imágenes de Stitch (alojadas en `googleusercontent.com`) se descargan una vez a `src/assets/images/` como **temporales**. Se descartó la foto de "café" de Stitch porque mostraba empaques de Etiopía, Guatemala y Kenia frente a los Alpes (no representa un café de origen de Nariño).
- Se renderizan con `<Image>`/`<Picture>` de `astro:assets`: AVIF/WebP, `srcset` por tamaño, `width`/`height` explícitos (sin saltos de diseño), `loading="lazy"` excepto la portada (`fetchpriority="high"`).
- Logo: PNG actual en un contenedor blanco con `object-contain` y relleno; favicon y `apple-touch-icon` se generan a partir del logo.
- Reemplazar una foto = sobrescribir el archivo con el mismo nombre.

## 10. SEO y vista previa al compartir

- `<title>` y `<meta description>` por idioma.
- Open Graph y Twitter Card con `og-image.jpg` (1200×630, foto del cañón + logo).
- JSON-LD `TouristAttraction` + `LocalBusiness`: nombre, dirección, coordenadas, teléfono y `sameAs` con las redes.
- `@astrojs/sitemap` con alternos de idioma y `robots.txt`.
- La URL final del sitio (`site` en `astro.config.mjs`) se configura al elegir hosting; mientras tanto se usa un valor provisional.

## 11. Accesibilidad

- HTML semántico (`header`, `nav`, `main`, `section` con `aria-labelledby`, `footer`).
- Enlace "Saltar al contenido".
- Foco visible en todos los controles; el menú móvil se cierra con Esc y devuelve el foco.
- Filtros de galería como botones con `aria-pressed`.
- Animaciones (zoom de tarjetas, pulso del badge) desactivadas con `prefers-reduced-motion`.
- Ícono de Instagram sin URL: se muestra como `<span aria-hidden>` sin enlace (no hay enlace roto); con URL se vuelve `<a aria-label="Instagram">`.

## 12. Estrategia de pruebas

| Tipo | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | Vitest | `whatsapp.ts` (mensajes ES/EN, codificación URL), `price.ts` (formato COP, total, límites 1–8) |
| Tipos y plantillas | `astro check` | Componentes y traducciones completas |
| Contenido | Zod en `content.config.ts` | Experiencias y galería válidas en ambos idiomas |
| Build | `astro build` | El sitio estático se genera sin errores |
| Manual guiada | Navegador en 375 px y 1440 px + Lighthouse móvil | Fidelidad visual con Stitch y metas del Req. 12 |

## 13. Despliegue

- `npm run build` → `dist/` estático.
- Cloudflare Pages / Netlify / Vercel: comando `npm run build`, carpeta `dist`.
- GitHub Pages: misma salida (requiere configurar `site`/`base` si no es dominio propio).
- cPanel: subir el contenido de `dist/` a `public_html`.

## 14. Fuera de alcance (por ahora)

Pagos en línea, cuentas de usuario, suscripción, panel de administración (Decap CMS queda como opción futura para subir fotos desde el navegador), venta online de café, blog.

## 15. Página de galería (`/galeria`) — Req. 14

**Fuente única de fotos** (portada y página de galería):

```
src/assets/galeria/
├── rio/            ← copiar aquí las fotos del río
├── cafe/
├── senderos/
├── gastronomia/
└── familias/
```

- `src/lib/gallery.ts` usa `import.meta.glob` para detectar todas las imágenes (`jpg`, `jpeg`, `png`, `webp`, `avif`) por carpeta. La carpeta define la categoría; una carpeta desconocida hace fallar el build con un mensaje claro.
- `src/content/galeria.yaml` (opcional por foto), con clave = `categoria/nombre-archivo`:
  ```yaml
  - id: rio/canon-cascadas
    portada: true      # aparece en la galería de la página principal (máx. 6)
    destacada: true    # doble tamaño en el mosaico y candidata a foto de portada
    orden: 1
    title: { es: "...", en: "..." }
    description: { es: "...", en: "..." }
    alt: { es: "...", en: "..." }
  ```
  Si una foto no tiene entrada, se muestra igual, con texto alternativo genérico según su categoría.
- Orden: `orden` (si existe) y luego nombre de archivo.

**Página**

| Bloque | Detalle |
|---|---|
| Portada | Primera foto `destacada`, 100 svh, degradado verde, título, texto y contador de fotos; indicador "desliza". |
| Filtros | Chips fijos bajo el encabezado al hacer scroll; misma lógica `aria-pressed` que la portada. |
| Mosaico | CSS Grid `grid-auto-flow: dense`, 2 columnas en móvil, 3 en tablet, 4 en escritorio. Horizontal = 1×1, vertical = 1×2, destacada = 2×2. `object-cover`. |
| Aparición | `IntersectionObserver` agrega una clase; sin JavaScript todo es visible. |
| Visor | `<dialog>` nativo a pantalla completa. Imagen `srcset` 800/1200/1600 (WebP) generada con `getImage`. Gestos táctiles (deslizar horizontal = navegar, hacia abajo = cerrar), flechas del teclado, Esc, botones con `aria-label`, contador, foco devuelto a la miniatura. Precarga la foto siguiente y la anterior. |
| Cierre | Franja "¿Desea vivir estos paisajes en persona?" → `/#reservas`. |

**Navegación compartida:** los enlaces de sección pasan a ser `/{idioma}/#seccion` para funcionar desde cualquier página; el selector de idioma recibe la ruta actual (`/galeria` ↔ `/en/galeria`).

**Script `npm run fotos`** (`scripts/optimize-photos.mjs`): recorre `src/assets/galeria/**`; si una foto supera 2.000 px o 1 MB, la rota según su EXIF, la reduce a 2.000 px de lado mayor y la guarda en JPEG de calidad 82 (sin metadatos de ubicación). Formato HEIC del iPhone: se debe exportar antes a JPG.
