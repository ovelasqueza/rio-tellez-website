# Requerimientos — Sitio web Río Téllez (ATURTELLEZCOOP)

## Introducción

Sitio web de una sola página (landing) para la **Cooperativa Multiactiva Agroturística del Río Téllez – ATURTELLEZCOOP** (NIT 901.851.272-6), Vereda La Vega, sector Puente Río Téllez, Funes, Nariño, Colombia.

Objetivo: dar a conocer los planes turísticos de naturaleza y el café de altura de la cooperativa, y recibir reservas por WhatsApp.

Fuente de diseño: `_stitch/codigo/viewMovil.html`, `_stitch/codigo/viewPC.html` y `_stitch/codigo/diseño_de_paletacolores_fuente.md`.

## Glosario

- **Sitio**: la página web pública.
- **Visitante**: persona que navega el Sitio.
- **Experiencia**: plan turístico ofrecido (caminata, almuerzo, pesca, ruta del café).
- **WhatsApp de reservas**: +57 320 680 7016 (`https://wa.me/573206807016`).
- **Mensaje prellenado**: texto que el Sitio arma y envía a WhatsApp con los datos de la reserva o pedido.

## Datos de negocio vigentes (provisionales)

| Dato | Valor |
|---|---|
| Precio de cada Experiencia | $50.000 COP por persona (provisional) |
| Precio bolsa de café | $50.000 COP (provisional) |
| Altura del territorio y del café | 2.144 msnm |
| Cupo máximo por reserva | 8 personas |
| Idiomas del sitio | Español (por defecto) e Inglés |

Los precios deben poder cambiarse editando un único archivo de contenido.

---

## Requerimiento 1 — Diseño mobile-first fiel a Stitch

**Historia:** Como visitante que entra desde el celular, quiero que el sitio se vea y funcione perfecto en mi teléfono.

**Criterios de aceptación**

1. EL Sitio DEBERÁ construirse mobile-first, tomando `viewMovil.html` como referencia para pantallas < 768 px y `viewPC.html` para ≥ 1280 px, con una transición coherente en tablet.
2. EL Sitio DEBERÁ usar la paleta, tipografías (Playfair Display y Plus Jakarta Sans), espaciados y radios definidos en el diseño de Stitch.
3. EL Sitio NO DEBERÁ presentar scroll horizontal en anchos desde 320 px.
4. Los elementos táctiles DEBERÁN medir al menos 44 × 44 px.
5. EL Sitio DEBERÁ permitir zoom en móvil (no usar `user-scalable=no`).
6. EN móvil, EL Sitio DEBERÁ mostrar la barra de navegación inferior fija (Origen, Rutas, Galería, Reservas, Llegar, Café); EN escritorio, el menú superior.

## Requerimiento 2 — Bilingüe Español / Inglés

**Historia:** Como turista extranjero, quiero leer el sitio en inglés.

**Criterios de aceptación**

1. EL Sitio DEBERÁ ofrecer todo su contenido en español e inglés, cada idioma en su propia URL (`/` español, `/en/` inglés).
2. CUANDO el visitante pulse ES/EN, EL Sitio DEBERÁ llevarlo a la misma sección en el otro idioma.
3. EL Sitio DEBERÁ declarar el idioma (`lang`) y los enlaces alternos (`hreflang`) para buscadores.
4. Los mensajes prellenados de WhatsApp DEBERÁN enviarse en el idioma activo.

## Requerimiento 3 — Encabezado

**Criterios de aceptación**

1. EL encabezado DEBERÁ mostrar el logo PNG actual, "RÍO TÉLLEZ" y "ATURTELLEZCOOP · Nariño", el selector ES/EN y el botón "Reservar Experiencia".
2. EL logo DEBERÁ verse nítido y bien encuadrado sobre fondo claro (contenedor blanco), sin deformarse.
3. EL encabezado NO DEBERÁ incluir ícono de usuario ni inicio de sesión.
4. EN móvil, el botón de menú DEBERÁ abrir un panel con los enlaces a las secciones, accesible con teclado y lector de pantalla.

## Requerimiento 4 — Portada (Hero)

**Criterios de aceptación**

1. LA portada DEBERÁ mostrar la imagen de fondo del cañón, la etiqueta "ATURTELLEZCOOP · FUNES, NARIÑO · VEREDA LA VEGA", el título "Donde el río esculpe el alma del café" y el texto descriptivo de las familias campesinas.
2. LA portada DEBERÁ incluir los botones "Reservar Experiencia" (va a Reservas) y "Conocer Nuestro Café" (va a Café).

## Requerimiento 5 — Nuestra Esencia

**Criterios de aceptación**

1. LA sección DEBERÁ mostrar el nombre legal, NIT y ubicación de la cooperativa, y su texto de propósito.
2. LA sección DEBERÁ mostrar los 4 pilares: Cuidado del Agua, Flora y Fauna, Café Campesino y Comunidad Viva.
3. EL pilar Café Campesino DEBERÁ indicar "Café de altura · 2.144 msnm".
4. LA franja destacada DEBERÁ decir "Un solo origen, infinitos matices sensoriales" SIN el sello "Nariño Terroir Certified" ni la etiqueta "Cosecha 2024".
5. EL Sitio NO DEBERÁ mostrar fechas o años fijos que se desactualicen (salvo el año del copyright, que se calcula solo).

## Requerimiento 6 — Experiencias (Rutas Vivas por el Cañón)

**Criterios de aceptación**

1. LA sección DEBERÁ mostrar 4 Experiencias: Caminatas Ecológicas & Cascadas, Almuerzos Campesinos al Fogón, Pesca de Trucha & Cocina de Río y Ruta del Café Campesino, con foto, duración, descripción y lo que incluye.
2. CADA Experiencia DEBERÁ mostrar su precio por persona (provisional: $50.000 COP).
3. Las alturas mostradas DEBERÁN ser 2.144 msnm.
4. CUANDO el visitante pulse "Elegir", EL Sitio DEBERÁ desplazarse al formulario de reserva con esa Experiencia preseleccionada.
5. Las Experiencias DEBERÁN definirse en archivos de contenido editables (nombre, textos ES/EN, precio, duración, foto).

## Requerimiento 7 — Reserva por WhatsApp

**Historia:** Como visitante, quiero reservar un plan turístico enviando un WhatsApp con mis datos ya escritos.

**Criterios de aceptación**

1. EL formulario DEBERÁ pedir: Experiencia, fecha, horario (06:30 AM, 08:30 AM, 01:30 PM), número de personas (1 a 8) y nombre completo.
2. EL formulario DEBERÁ mostrar el total estimado (precio × personas) en COP, actualizado al instante.
3. SI falta el nombre o la fecha, o la fecha es anterior a hoy, ENTONCES EL Sitio DEBERÁ mostrar un mensaje de error junto al campo y no enviar.
4. CUANDO el visitante pulse "Reservar por WhatsApp" con datos válidos, EL Sitio DEBERÁ abrir `wa.me/573206807016` con un mensaje prellenado que incluya Experiencia, fecha, horario, personas, nombre y total estimado.
5. EL formulario NO DEBERÁ incluir selector de idioma del guía.
6. EL Sitio NO DEBERÁ mostrar textos sobre cancelación, reembolsos, guías bilingües, traslados ni condiciones de pago.
7. EL Sitio NO DEBERÁ guardar ni enviar los datos del formulario a ningún servidor propio.
8. EL Sitio DEBERÁ mostrar además un botón flotante de WhatsApp visible en todas las secciones.

## Requerimiento 8 — Galería

**Criterios de aceptación**

1. LA galería DEBERÁ mostrar las fotos con título, descripción y categoría (Río Téllez, Café, Senderos, Gastronomía).
2. CUANDO el visitante pulse un filtro de categoría, EL Sitio DEBERÁ mostrar solo las fotos de esa categoría ("Todos" muestra todas).
3. EN móvil, la galería DEBERÁ usar 2 columnas y los filtros deslizarse horizontalmente.
4. Las fotos DEBERÁN cargarse de forma diferida (lazy) y optimizadas (WebP/AVIF, tamaños por pantalla).
5. Mientras no existan fotos reales, EL Sitio DEBERÁ usar las imágenes del diseño de Stitch guardadas localmente en el proyecto; reemplazarlas DEBERÁ requerir solo cambiar archivos.

## Requerimiento 9 — Cómo llegar

**Criterios de aceptación**

1. LA sección DEBERÁ mostrar la dirección (Vereda La Vega, sector Puente Río Téllez, Funes, Nariño) y las coordenadas GPS 1.0083266692228996, -77.43155836414786.
2. LA sección DEBERÁ describir cómo llegar por cuenta propia desde Pasto y desde Ipiales, SIN ofrecer transporte de la cooperativa.
3. LA sección DEBERÁ incluir un mapa embebido y un botón "Abrir en Google Maps".
4. EL mapa DEBERÁ cargarse de forma diferida para no frenar la carga inicial en móvil.

## Requerimiento 10 — Café de Origen (café de altura)

**Criterios de aceptación**

1. LA sección DEBERÁ resaltar de forma visible que es **café de altura cultivado a 2.144 msnm** y que esa altura le da su sabor único.
2. LA sección DEBERÁ mostrar foto, descripción, notas (chocolate, panela, frutos secos), ficha (origen, altura 2.144 msnm, beneficio, variedad), presentación (340 g / 454 g) y precio provisional.
3. LA sección NO DEBERÁ mostrar la etiqueta "Bosque #0F3D2E".
4. CUANDO el visitante pulse "Pedir Café", EL Sitio DEBERÁ abrir WhatsApp con un mensaje prellenado de pedido.

## Requerimiento 11 — Pie de página

**Criterios de aceptación**

1. EL pie DEBERÁ mostrar logo, nombre legal, NIT, ubicación, texto de propósito y enlaces a las secciones.
2. EL pie DEBERÁ mostrar los íconos de Facebook, TikTok e Instagram:
   - Facebook: `https://www.facebook.com/profile.php?id=61553108319451`
   - TikTok: `https://www.tiktok.com/@agroecoturism`
   - Instagram: sin URL por ahora; el ícono DEBERÁ verse, pero no ser un enlace roto. CUANDO se configure la URL, DEBERÁ activarse sin cambiar código.
   Los enlaces DEBERÁN abrir en pestaña nueva con `rel="noopener noreferrer"`.
3. EL pie NO DEBERÁ incluir formulario de suscripción.
4. EL texto de copyright DEBERÁ aparecer una sola vez, con el año actual.

## Requerimiento 12 — Rendimiento, accesibilidad y SEO

**Criterios de aceptación**

1. EL Sitio DEBERÁ obtener en Lighthouse móvil: Rendimiento ≥ 90, Accesibilidad ≥ 95, Buenas prácticas ≥ 95, SEO ≥ 95.
2. EL Sitio DEBERÁ compilar Tailwind en el build (sin el CDN de Tailwind) y cargar las fuentes de forma optimizada.
3. TODAS las imágenes DEBERÁN tener texto alternativo en el idioma activo.
4. EL contraste de texto DEBERÁ cumplir WCAG 2.1 AA.
5. EL Sitio DEBERÁ incluir título, descripción, Open Graph (vista previa al compartir en WhatsApp/redes), favicon a partir del logo, `sitemap.xml` y `robots.txt`.
6. EL Sitio DEBERÁ incluir datos estructurados (schema.org `TouristAttraction`/`LocalBusiness`) con nombre, ubicación y teléfono.

## Requerimiento 13 — Desarrollo local y despliegue

**Criterios de aceptación**

1. EL proyecto DEBERÁ correr en local con `npm install` y `npm run dev`.
2. `npm run build` DEBERÁ generar un sitio 100 % estático en `dist/`, publicable en Cloudflare Pages, Netlify, Vercel, GitHub Pages o cualquier hosting con cPanel.
3. EL repositorio DEBERÁ inicializarse con Git, con `.gitignore` adecuado, y la carpeta `_stitch/` DEBERÁ quedar fuera del sitio publicado.
4. Las dependencias DEBERÁN fijarse en versiones exactas.

---

## Requerimiento 14 — Página de galería ampliada (`/galeria`)

**Historia:** Como visitante, quiero ver muchas fotos del territorio en grande, de forma atractiva, para animarme a visitar. Como administrador, quiero agregar fotos fácilmente.

**Criterios de aceptación**

1. EL Sitio DEBERÁ tener una página de galería en `/galeria` (español) y `/en/galeria` (inglés), incluida en el sitemap y con su propio título, descripción y vista previa al compartir.
2. LA página DEBERÁ abrir con una portada a pantalla completa con una foto destacada, el título "Memoria viva del Cañón" y el número de fotos.
3. LAS fotos DEBERÁN mostrarse en un mosaico donde las fotos verticales ocupan más alto y las marcadas como destacadas ocupan doble tamaño.
4. LA página DEBERÁ tener filtros por categoría: Río Téllez, Café, Senderos, Gastronomía y **Familias**, además de "Todos".
5. CUANDO el visitante toque una foto, EL Sitio DEBERÁ abrirla en un visor a pantalla completa con título (si existe), categoría y contador ("3 / 24").
6. EN el visor, EL visitante DEBERÁ poder pasar a la foto siguiente o anterior deslizando con el dedo, con botones y con las flechas del teclado; cerrar con Esc, con botón o deslizando hacia abajo. El visor respetará el filtro activo.
7. Las fotos DEBERÁN aparecer con un efecto suave al hacer scroll (desactivado con `prefers-reduced-motion`) y descargarse solo cuando se acercan a la pantalla.
8. LA página DEBERÁ terminar con una invitación a reservar que lleve al formulario de reserva.
9. **Agregar una foto** DEBERÁ consistir en copiarla en la carpeta de su categoría (`src/assets/galeria/<categoria>/`). Título, descripción, foto destacada y aparición en la portada serán opcionales, en un único archivo (`src/content/galeria.yaml`).
10. EL proyecto DEBERÁ incluir un comando (`npm run fotos`) que reduzca las fotos grandes a un máximo de 2.000 px y corrija la orientación antes de guardarlas.
11. LA galería de la página principal DEBERÁ mostrar hasta 6 fotos de la misma fuente y un botón "Ver toda la galería".
12. Los enlaces del encabezado, menú móvil, barra inferior y pie DEBERÁN funcionar también desde la página de galería (llevan a la sección correspondiente de la página principal).

---

## Pendientes por confirmar (no bloquean el desarrollo)

- Precios reales de cada Experiencia y del café.
- URL de Instagram.
- Fotos reales del territorio.
- Logo en SVG o PNG sin fondo.
