# Tareas — Sitio web Río Téllez

Referencias: `requirements.md` (Req. N) y `design.md` (§N).

- [x] 1. Inicializar proyecto: Astro 7.4.2, Tailwind 4.3.3, dependencias fijadas, `.gitignore`, Git, `npm run dev` funcionando. (Req. 13, §1–2)
- [x] 2. Tokens de diseño en `global.css` y fuentes autoalojadas. (Req. 1, §3)
- [x] 3. `site.ts`, i18n (`es.ts`/`en.ts`), `lib/price.ts` y `lib/whatsapp.ts` con pruebas Vitest. (Req. 2, 7, §4, §6, §7)
- [x] 4. Descargar imágenes temporales de Stitch y logo a `src/assets`; generar favicon y og-image (`npm run assets`). (Req. 8.5, 10, §9)
- [x] 5. Colecciones de contenido (experiencias, galería) con esquemas Zod. (Req. 6.5, 8, §5)
- [x] 6. `BaseLayout` con SEO, hreflang, OG y JSON-LD; páginas `/` y `/en/`. (Req. 2, 12, §10)
- [x] 7. Header, LanguageSwitch, MobileMenu, BottomNav, WhatsAppFloat. (Req. 1.6, 3, 7.8, §8)
- [x] 8. Secciones Hero y Nuestra Esencia. (Req. 4, 5)
- [x] 9. Experiencias + formulario de reserva por WhatsApp. (Req. 6, 7)
- [x] 10. Galería con filtros. (Req. 8)
- [x] 11. Cómo llegar y Café de altura. (Req. 9, 10)
- [x] 12. Footer con redes. (Req. 11)
- [x] 13. Verificación: `astro check`, Vitest, build, revisión en 375 px y 1440 px, contraste, Lighthouse móvil. (Req. 12, §12)

## Resultado de la verificación (23/10/2026)

- `astro check`: 0 errores, 0 advertencias.
- Vitest: 13/13 pruebas.
- Build estático: `/` y `/en/` + `sitemap-index.xml`.
- Lighthouse móvil (`/` y `/en/`): Rendimiento 99 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100. CLS ≈ 0.
- Sin scroll horizontal a 375 px.
- Flujo de reserva probado en navegador: errores de validación, límite 1–8 personas, preselección con "Elegir", total y mensaje de WhatsApp en ES/EN.

## Pendientes

- [x] 14. Página de galería ampliada (Req. 14, §15)
  - [x] 14.1 Fuente única `src/assets/galeria/<categoria>/` + `lib/gallery.ts` + metadatos opcionales; categoría Familias.
  - [x] 14.2 Navegación compartida entre páginas (enlaces `/#seccion`, selector de idioma por ruta, metadatos por página).
  - [x] 14.3 Página `/galeria` y `/en/galeria`: portada, filtros, mosaico, aparición al hacer scroll, cierre con reserva.
  - [x] 14.4 Visor a pantalla completa con gestos, teclado y contador.
  - [x] 14.5 Galería de la portada desde la misma fuente + botón "Ver toda la galería".
  - [x] 14.6 `npm run fotos` para optimizar fotos.
  - [x] 14.7 Verificación: check 0 errores, 13/13 pruebas, build 4 páginas, 375/1440 px sin desborde, visor probado (botones, teclado, deslizar, cerrar deslizando, foco, filtro). Lighthouse móvil `/galeria`: 98 · 100 · 100 · 100.
- [ ] Fotos reales (reemplazar archivos en `src/assets/images/` con el mismo nombre).
- [ ] Precios reales (`src/config/site.ts` o `price:` en cada experiencia).
- [ ] URL de Instagram (`site.social.instagram`).
- [ ] Logo SVG o PNG sin fondo (luego `npm run assets`).
- [ ] Dominio/hosting definitivo: actualizar `SITE_URL` en `astro.config.mjs` y `public/robots.txt`.
