/**
 * Panel administrativo (se ejecuta en el navegador, página /admin).
 * Edita la galería, las experiencias y los datos del sitio; cada "Guardar y publicar"
 * crea un commit en GitHub y Cloudflare Pages vuelve a publicar el sitio solo.
 */
import { api, ApiError } from './api';
import { uploadToCloudinary } from './upload';
import { cloudUrl } from '../../lib/cloudinary';
import type {
  CloudImage,
  ContentPayload,
  ExperienceData,
  ExperienceFile,
  GalleryEntry,
  Localized,
  SaveResult,
  SiteData,
} from '../../../server/admin/types';

// ---------- Datos embebidos al compilar (fotos locales del repositorio) ----------

interface LocalPhoto {
  thumb: string;
  repoPath: string;
  width: number;
  height: number;
}
interface BuildData {
  categories: Record<string, string>;
  localGallery: Record<string, LocalPhoto>;
  localExperienceThumbs: Record<string, string>;
}

type Section = 'gallery' | 'experiences' | 'site';
type GalleryItem = GalleryEntry & { local?: LocalPhoto };

const build = JSON.parse(document.getElementById('admin-build-data')!.textContent!) as BuildData;
const categories = Object.keys(build.categories);

const state = {
  head: '',
  cloudName: '',
  email: '',
  gallery: [] as GalleryItem[],
  deletedLocal: [] as string[],
  experiences: [] as ExperienceFile[],
  deletedExperiences: [] as string[],
  site: {} as SiteData,
  dirty: { gallery: false, experiences: false, site: false } as Record<Section, boolean>,
  tab: 'gallery' as Section,
  galleryFilter: 'all',
  uploadCategory: categories[0]!,
  openExperience: new Set<string>(),
  busy: false,
};

// ---------- Utilidades DOM ----------

type Child = Node | string | null | undefined | false;
type Props = Record<string, unknown>;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (['value', 'checked', 'disabled', 'multiple', 'open', 'selected'].includes(k)) (el as unknown as Props)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  el.append(...(children.filter((c) => c !== null && c !== undefined && c !== false) as (Node | string)[]));
  return el;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function toast(message: string, kind: 'ok' | 'error' | 'info' = 'ok', link?: { href: string; text: string }) {
  const box = $('#adm-toasts');
  const el = h('div', { class: `adm-toast adm-toast--${kind}`, role: kind === 'error' ? 'alert' : 'status' }, message, link && h('a', { href: link.href, target: '_blank', rel: 'noopener' }, link.text));
  el.addEventListener('click', () => el.remove());
  box.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 12000 : 7000);
}

function slugify(text: string, max = 40): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max)
      .replace(/-+$/, '') || 'foto'
  );
}

const thumbOf = (c: CloudImage, w = 480) => cloudUrl(c, w, 'auto:good', state.cloudName);
const formatCop = (n: number) => new Intl.NumberFormat('es-CO').format(n);

function markDirty(section: Section, value = true) {
  state.dirty[section] = value;
  document.querySelectorAll<HTMLElement>(`[data-dirty-dot="${section}"]`).forEach((d) => (d.hidden = !value));
  document.querySelectorAll<HTMLButtonElement>(`[data-save="${section}"]`).forEach((b) => (b.disabled = !value || state.busy));
}

// ---------- Campos de formulario ----------

function locField(label: string, get: () => Localized | undefined, set: (v: Localized) => void, section: Section, opts: { textarea?: boolean; hint?: string; required?: boolean } = {}) {
  const current = get() ?? { es: '', en: '' };
  const make = (lang: 'es' | 'en') => {
    const props = {
      value: current[lang],
      placeholder: lang === 'es' ? 'Español' : 'English (opcional: si se deja vacío se usa el español)',
      'aria-label': `${label} (${lang.toUpperCase()})`,
      onInput: (e: Event) => {
        const v = { ...(get() ?? { es: '', en: '' }), [lang]: (e.target as HTMLInputElement).value };
        set(v);
        markDirty(section);
      },
    };
    return h('label', { class: 'adm-loc' }, h('span', { class: 'adm-lang' }, lang.toUpperCase()), opts.textarea ? h('textarea', { ...props, rows: 3 }) : h('input', { ...props, type: 'text' }));
  };
  return h(
    'div',
    { class: 'adm-field' },
    h('span', { class: 'adm-label' }, label, opts.required ? h('b', { class: 'adm-req' }, ' *') : null),
    make('es'),
    make('en'),
    opts.hint ? h('small', { class: 'adm-hint' }, opts.hint) : null,
  );
}

function field(label: string, value: string | number | undefined, onChange: (v: string) => void, section: Section, opts: { type?: string; hint?: string; placeholder?: string; step?: string } = {}) {
  return h(
    'label',
    { class: 'adm-field' },
    h('span', { class: 'adm-label' }, label),
    h('input', {
      type: opts.type ?? 'text',
      value: value ?? '',
      placeholder: opts.placeholder,
      step: opts.step,
      inputmode: opts.type === 'number' ? 'numeric' : undefined,
      onInput: (e: Event) => {
        onChange((e.target as HTMLInputElement).value);
        markDirty(section);
      },
    }),
    opts.hint ? h('small', { class: 'adm-hint' }, opts.hint) : null,
  );
}

function saveBar(section: Section, title: string, info: Child) {
  return h(
    'div',
    { class: 'adm-savebar' },
    h('div', {}, h('h2', {}, title), h('p', { class: 'adm-muted' }, info)),
    h(
      'button',
      { class: 'adm-btn adm-btn--primary', 'data-save': section, disabled: !state.dirty[section] || state.busy, onClick: () => save(section) },
      'Guardar y publicar',
    ),
  );
}

// ---------- Guardar ----------

function galleryPayload(): GalleryEntry[] {
  return state.gallery
    .map(({ local: _local, ...entry }) => entry)
    .filter((e) => Object.keys(e).some((k) => k !== 'id' && e[k as keyof GalleryEntry] !== undefined));
}

async function save(section: Section) {
  if (state.busy) return;
  state.busy = true;
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach((b) => (b.disabled = true));
  const btn = document.querySelector<HTMLButtonElement>(`[data-save="${section}"]`);
  if (btn) btn.textContent = 'Guardando…';
  try {
    let res: SaveResult;
    if (section === 'gallery') {
      res = await api<SaveResult>('gallery', { method: 'PUT', body: { head: state.head, entries: galleryPayload(), deleteLocal: state.deletedLocal } });
      state.deletedLocal = [];
    } else if (section === 'experiences') {
      res = await api<SaveResult>('experiences', {
        method: 'PUT',
        body: { head: state.head, items: state.experiences, deleted: state.deletedExperiences },
      });
      state.deletedExperiences = [];
    } else {
      res = await api<SaveResult>('site', { method: 'PUT', body: { head: state.head, site: state.site } });
    }
    state.head = res.head;
    state.busy = false;
    markDirty(section, false);
    if (res.changed) {
      toast('Guardado. El sitio público se actualizará en 1–2 minutos.', 'ok', res.url ? { href: res.url, text: ' Ver cambio' } : undefined);
    } else {
      toast('No había cambios que guardar.', 'info');
    }
    res.warnings?.forEach((w) => toast(w, 'info'));
  } catch (err) {
    state.busy = false;
    markDirty(section, true);
    const msg = err instanceof Error ? err.message : String(err);
    toast(msg, 'error');
    if (err instanceof ApiError && err.status === 409) {
      toast('Para no perder trabajo, copie sus textos antes de recargar.', 'info');
    }
  } finally {
    if (btn) btn.textContent = 'Guardar y publicar';
    (['gallery', 'experiences', 'site'] as Section[]).forEach((s) => markDirty(s, state.dirty[s]));
  }
}

// ---------- Galería ----------

function sortGallery() {
  state.gallery.sort((a, b) => {
    const oa = a.orden ?? Number.POSITIVE_INFINITY;
    const ob = b.orden ?? Number.POSITIVE_INFINITY;
    return oa !== ob ? oa - ob : a.id.localeCompare(b.id);
  });
}

function renumber() {
  state.gallery.forEach((p, i) => (p.orden = i + 1));
}

const visible = (p: GalleryItem) => state.galleryFilter === 'all' || p.id.startsWith(`${state.galleryFilter}/`);
const categoryOf = (p: GalleryItem) => p.id.split('/')[0]!;

function move(item: GalleryItem, dir: -1 | 1 | 'top') {
  const list = state.gallery;
  const from = list.indexOf(item);
  let to: number;
  if (dir === 'top') to = 0;
  else {
    to = from + dir;
    while (to >= 0 && to < list.length && !visible(list[to]!)) to += dir;
    if (to < 0 || to >= list.length) return;
  }
  list.splice(from, 1);
  list.splice(to, 0, item);
  renumber();
  markDirty('gallery');
  renderGalleryGrid();
}

async function handleUpload(files: FileList | File[]) {
  const list = [...files];
  if (!list.length) return;
  const cat = state.uploadCategory;
  const progress = $('#adm-upload-progress');
  let added = 0;
  for (const file of list) {
    const bar = h('progress', { max: 100, value: 0 });
    const row = h('div', { class: 'adm-upload-row' }, h('span', {}, file.name), bar);
    progress.append(row);
    try {
      const res = await uploadToCloudinary(file, `galeria/${cat}`, (pct) => (bar.value = pct));
      const suffix = res.id.split('/').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-6);
      let id = `${cat}/${slugify(res.originalName)}-${suffix}`;
      while (state.gallery.some((p) => p.id === id)) id += 'x';
      state.gallery.push({ id, cloudinary: { id: res.id, width: res.width, height: res.height } });
      added++;
      row.remove();
      if (res.note) toast(res.note, 'info');
    } catch (err) {
      row.classList.add('adm-upload-row--error');
      row.append(h('small', {}, err instanceof Error ? err.message : String(err)));
      setTimeout(() => row.remove(), 15000);
    }
  }
  if (added) {
    renumber();
    markDirty('gallery');
    renderGalleryGrid();
    toast(`${added} foto(s) subida(s) a la nube. Agrégueles título si quiere y presione “Guardar y publicar”.`, 'ok');
  }
}

function openPhotoEditor(item: GalleryItem) {
  const dialog = $<HTMLDialogElement>('#adm-dialog');
  const preview = item.cloudinary ? thumbOf(item.cloudinary, 900) : item.local?.thumb;
  const catSelect = h(
    'select',
    {
      disabled: !item.cloudinary,
      onChange: (e: Event) => {
        const cat = (e.target as HTMLSelectElement).value;
        let id = `${cat}/${item.id.split('/')[1]}`;
        while (state.gallery.some((p) => p !== item && p.id === id)) id += 'x';
        item.id = id;
        markDirty('gallery');
      },
    },
    ...categories.map((c) => h('option', { value: c, selected: c === categoryOf(item) }, build.categories[c]!)),
  );
  dialog.replaceChildren(
    h(
      'form',
      { method: 'dialog', class: 'adm-dialog-body' },
      h('div', { class: 'adm-dialog-head' }, h('h3', {}, 'Detalles de la foto'), h('button', { class: 'adm-btn', value: 'close' }, 'Listo')),
      preview ? h('img', { src: preview, alt: '', class: 'adm-dialog-img' }) : null,
      h(
        'label',
        { class: 'adm-field' },
        h('span', { class: 'adm-label' }, 'Categoría'),
        catSelect,
        !item.cloudinary ? h('small', { class: 'adm-hint' }, 'Las fotos guardadas en el repositorio no pueden cambiar de categoría.') : null,
      ),
      locField('Título', () => item.title, (v) => (item.title = v), 'gallery', { hint: 'Se muestra sobre la foto. Opcional.' }),
      locField('Descripción', () => item.description, (v) => (item.description = v), 'gallery', { textarea: true, hint: 'Texto corto bajo la foto en la página principal. Opcional.' }),
      locField('Texto alternativo', () => item.alt, (v) => (item.alt = v), 'gallery', { hint: 'Describe la foto para buscadores y personas con discapacidad visual.' }),
    ),
  );
  dialog.onclose = () => renderGalleryGrid();
  dialog.showModal();
}

function removePhoto(item: GalleryItem) {
  const where = item.cloudinary ? 'Se borrará también de Cloudinary' : 'Se borrará el archivo del repositorio';
  if (!confirm(`¿Eliminar esta foto? ${where} al guardar.`)) return;
  if (!item.cloudinary && item.local) state.deletedLocal.push(item.local.repoPath);
  state.gallery.splice(state.gallery.indexOf(item), 1);
  markDirty('gallery');
  renderGalleryGrid();
}

function galleryCard(item: GalleryItem) {
  const src = item.cloudinary ? thumbOf(item.cloudinary) : item.local?.thumb;
  const check = (label: string, key: 'portada' | 'destacada', hint: string) =>
    h(
      'label',
      { class: 'adm-check', title: hint },
      h('input', {
        type: 'checkbox',
        checked: !!item[key],
        onChange: (e: Event) => {
          item[key] = (e.target as HTMLInputElement).checked || undefined;
          markDirty('gallery');
          if (key === 'portada') renderPortadaCount();
        },
      }),
      label,
    );
  return h(
    'li',
    { class: 'adm-card' },
    h(
      'button',
      { type: 'button', class: 'adm-card-img', onClick: () => openPhotoEditor(item), 'aria-label': 'Editar detalles' },
      src ? h('img', { src, alt: '', loading: 'lazy' }) : h('span', { class: 'adm-noimg' }, 'Sin foto'),
      h('span', { class: 'adm-badge' }, build.categories[categoryOf(item)] ?? categoryOf(item)),
      h('span', { class: `adm-badge adm-badge--src ${item.cloudinary ? 'is-cloud' : ''}` }, item.cloudinary ? 'Nube' : 'Repositorio'),
    ),
    h(
      'div',
      { class: 'adm-card-body' },
      h('p', { class: 'adm-card-title' }, item.title?.es || h('span', { class: 'adm-muted' }, 'Sin título')),
      h('div', { class: 'adm-row' }, check('Portada', 'portada', 'Aparece en la galería de la página principal (máx. 6)'), check('Destacada', 'destacada', 'Se ve el doble de grande en la página de galería')),
      h(
        'div',
        { class: 'adm-row adm-row--actions' },
        h('button', { type: 'button', class: 'adm-icon', title: 'Mover al inicio', onClick: () => move(item, 'top') }, '⤒'),
        h('button', { type: 'button', class: 'adm-icon', title: 'Mover antes', onClick: () => move(item, -1) }, '←'),
        h('button', { type: 'button', class: 'adm-icon', title: 'Mover después', onClick: () => move(item, 1) }, '→'),
        h('button', { type: 'button', class: 'adm-btn adm-btn--small', onClick: () => openPhotoEditor(item) }, 'Editar'),
        h('button', { type: 'button', class: 'adm-btn adm-btn--small adm-btn--danger', onClick: () => removePhoto(item) }, 'Eliminar'),
      ),
    ),
  );
}

function renderPortadaCount() {
  const n = state.gallery.filter((p) => p.portada).length;
  const el = document.getElementById('adm-portada-count');
  if (el) {
    el.textContent = `Portada: ${n}/6`;
    el.classList.toggle('is-warn', n > 6);
    el.title = n > 6 ? 'Solo se muestran las primeras 6 en la página principal.' : '';
  }
}

function renderGalleryGrid() {
  const grid = document.getElementById('adm-gallery-grid');
  if (!grid) return;
  const items = state.gallery.filter(visible);
  grid.replaceChildren(...(items.length ? items.map(galleryCard) : [h('li', { class: 'adm-empty' }, 'No hay fotos en esta categoría.')]));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => {
    const f = b.dataset.filter!;
    const count = f === 'all' ? state.gallery.length : state.gallery.filter((p) => p.id.startsWith(`${f}/`)).length;
    b.setAttribute('aria-pressed', String(f === state.galleryFilter));
    b.querySelector('span')!.textContent = `(${count})`;
  });
  renderPortadaCount();
}

function renderGallery() {
  const input = h('input', {
    type: 'file',
    accept: 'image/*,.heic,.heif',
    multiple: true,
    hidden: true,
    onChange: (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (el.files) void handleUpload(el.files);
      el.value = '';
    },
  });
  const drop = h(
    'div',
    {
      class: 'adm-drop',
      onDragover: (e: DragEvent) => {
        e.preventDefault();
        drop.classList.add('is-over');
      },
      onDragleave: () => drop.classList.remove('is-over'),
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        drop.classList.remove('is-over');
        if (e.dataTransfer?.files) void handleUpload(e.dataTransfer.files);
      },
    },
    h(
      'label',
      { class: 'adm-field adm-field--inline' },
      h('span', { class: 'adm-label' }, 'Categoría de las fotos nuevas'),
      h(
        'select',
        { onChange: (e: Event) => (state.uploadCategory = (e.target as HTMLSelectElement).value) },
        ...categories.map((c) => h('option', { value: c, selected: c === state.uploadCategory }, build.categories[c]!)),
      ),
    ),
    h('button', { type: 'button', class: 'adm-btn adm-btn--primary', onClick: () => input.click() }, '📷 Subir fotos'),
    h('p', { class: 'adm-muted' }, 'O arrástrelas aquí. Se guarda el original sin pérdida en Cloudinary y el sitio lo muestra en WebP/AVIF optimizado.'),
    input,
    h('div', { id: 'adm-upload-progress' }),
  );

  const filters = h(
    'div',
    { class: 'adm-filters', role: 'group', 'aria-label': 'Filtrar por categoría' },
    ...['all', ...categories].map((c) =>
      h(
        'button',
        {
          type: 'button',
          class: 'adm-chip',
          'data-filter': c,
          onClick: () => {
            state.galleryFilter = c;
            renderGalleryGrid();
          },
        },
        c === 'all' ? 'Todas ' : `${build.categories[c]} `,
        h('span'),
      ),
    ),
    h('span', { id: 'adm-portada-count', class: 'adm-pill' }),
  );

  $('#adm-panel').replaceChildren(
    saveBar('gallery', 'Galería', 'Suba, ordene y describa las fotos. El orden aquí es el mismo del sitio.'),
    drop,
    filters,
    h('ul', { id: 'adm-gallery-grid', class: 'adm-grid' }),
  );
  renderGalleryGrid();
}

// ---------- Experiencias ----------

function emptyLoc(): Localized {
  return { es: '', en: '' };
}

function experienceThumb(d: ExperienceData): string | undefined {
  if (d.cloudinary) return thumbOf(d.cloudinary, 640);
  return d.image ? build.localExperienceThumbs[d.image] : undefined;
}

function experienceForm(exp: ExperienceFile) {
  const d = exp.data;
  const sec: Section = 'experiences';
  const fileInput = h('input', {
    type: 'file',
    accept: 'image/*,.heic,.heif',
    hidden: true,
    onChange: async (e: Event) => {
      const el = e.target as HTMLInputElement;
      const file = el.files?.[0];
      el.value = '';
      if (!file) return;
      status.textContent = 'Subiendo…';
      try {
        const res = await uploadToCloudinary(file, 'experiencias', (p) => (status.textContent = `Subiendo… ${p}%`));
        d.cloudinary = { id: res.id, width: res.width, height: res.height };
        delete d.image;
        markDirty(sec);
        if (res.note) toast(res.note, 'info');
        renderExperiences();
      } catch (err) {
        status.textContent = '';
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    },
  });
  const status = h('small', { class: 'adm-hint' });
  const thumb = experienceThumb(d);

  const includesBox = h('div', { class: 'adm-includes' });
  const renderIncludes = () => {
    includesBox.replaceChildren(
      ...d.includes.map((_inc, i) =>
        h(
          'div',
          { class: 'adm-include' },
          locField(`Elemento ${i + 1}`, () => d.includes[i], (v) => (d.includes[i] = v), sec),
          h(
            'button',
            {
              type: 'button',
              class: 'adm-icon',
              title: 'Quitar',
              onClick: () => {
                d.includes.splice(i, 1);
                markDirty(sec);
                renderIncludes();
              },
            },
            '✕',
          ),
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'adm-btn adm-btn--small',
          onClick: () => {
            d.includes.push(emptyLoc());
            markDirty(sec);
            renderIncludes();
          },
        },
        '+ Agregar',
      ),
    );
  };
  renderIncludes();

  return h(
    'div',
    { class: 'adm-exp-form' },
    h(
      'div',
      { class: 'adm-exp-photo' },
      thumb ? h('img', { src: thumb, alt: '' }) : h('span', { class: 'adm-noimg' }, 'Falta la foto'),
      h('button', { type: 'button', class: 'adm-btn adm-btn--small', onClick: () => fileInput.click() }, 'Cambiar foto'),
      status,
      fileInput,
    ),
    h(
      'div',
      { class: 'adm-exp-fields' },
      locField('Título', () => d.title, (v) => (d.title = v), sec, { required: true }),
      locField('Categoría', () => d.category, (v) => (d.category = v), sec, { required: true, hint: 'Texto pequeño sobre el título.' }),
      locField('Descripción', () => d.description, (v) => (d.description = v), sec, { textarea: true, required: true }),
      locField('Duración', () => d.duration, (v) => (d.duration = v), sec, { required: true, hint: 'Ej.: “Día completo”, “3 horas”.' }),
      locField('Etiqueta de la foto', () => d.chip, (v) => (d.chip = v), sec, { hint: 'Opcional. Si se deja vacío se muestra la altura del territorio.' }),
      locField('Descripción de la foto (alt)', () => d.imageAlt, (v) => (d.imageAlt = v), sec, { required: true }),
      h(
        'div',
        { class: 'adm-row adm-row--fields' },
        field('Precio por persona (COP)', d.price, (v) => (d.price = v ? Number(v.replace(/\D/g, '')) : undefined), sec, {
          type: 'number',
          placeholder: `${formatCop(state.site.defaultPriceCop)} (por defecto)`,
          hint: 'Vacío = precio por defecto de “Datos del sitio”.',
        }),
        field('Orden', d.order, (v) => (d.order = Number(v)), sec, { type: 'number', hint: '1 = primera.' }),
        h(
          'label',
          { class: 'adm-field' },
          h('span', { class: 'adm-label' }, 'Color de la etiqueta'),
          h(
            'select',
            {
              onChange: (e: Event) => {
                d.badgeColor = (e.target as HTMLSelectElement).value as ExperienceData['badgeColor'];
                markDirty(sec);
              },
            },
            h('option', { value: 'primary', selected: d.badgeColor === 'primary' }, 'Principal (verde)'),
            h('option', { value: 'secondary', selected: d.badgeColor === 'secondary' }, 'Secundario'),
          ),
        ),
      ),
      h('div', { class: 'adm-field' }, h('span', { class: 'adm-label' }, 'Incluye', h('b', { class: 'adm-req' }, ' *')), includesBox),
      h(
        'button',
        {
          type: 'button',
          class: 'adm-btn adm-btn--danger',
          onClick: () => {
            if (!confirm(`¿Eliminar la experiencia “${d.title.es || exp.slug}”? Se aplicará al guardar.`)) return;
            state.experiences.splice(state.experiences.indexOf(exp), 1);
            state.deletedExperiences.push(exp.slug);
            markDirty(sec);
            renderExperiences();
          },
        },
        'Eliminar experiencia',
      ),
    ),
  );
}

function addExperience() {
  const title = prompt('Nombre de la nueva experiencia (en español):')?.trim();
  if (!title) return;
  let slug = slugify(title, 50);
  if (slug.length < 2) slug = 'experiencia';
  while (state.experiences.some((e) => e.slug === slug)) slug += '-2';
  const order = Math.max(0, ...state.experiences.map((e) => e.data.order)) + 1;
  state.experiences.push({
    slug,
    data: {
      order,
      imageAlt: emptyLoc(),
      duration: emptyLoc(),
      badgeColor: 'primary',
      category: emptyLoc(),
      title: { es: title, en: '' },
      description: emptyLoc(),
      includes: [emptyLoc()],
    },
  });
  state.deletedExperiences = state.deletedExperiences.filter((s) => s !== slug);
  state.openExperience.add(slug);
  markDirty('experiences');
  renderExperiences();
}

function renderExperiences() {
  const list = [...state.experiences].sort((a, b) => a.data.order - b.data.order);
  $('#adm-panel').replaceChildren(
    saveBar('experiences', 'Experiencias', 'Precios, textos y fotos de los planes turísticos.'),
    h('button', { type: 'button', class: 'adm-btn', onClick: addExperience }, '+ Nueva experiencia'),
    h(
      'div',
      { class: 'adm-exp-list' },
      ...list.map((exp) => {
        const d = exp.data;
        const thumb = experienceThumb(d);
        const details = h(
          'details',
          { class: 'adm-exp', open: state.openExperience.has(exp.slug) },
          h(
            'summary',
            {},
            thumb ? h('img', { src: thumb, alt: '' }) : h('span', { class: 'adm-noimg' }, '—'),
            h('span', { class: 'adm-exp-title' }, h('b', {}, d.title.es || exp.slug), h('small', { class: 'adm-muted' }, `${formatCop(d.price ?? state.site.defaultPriceCop)} COP · ${d.duration.es || 'sin duración'}`)),
          ),
          experienceForm(exp),
        );
        details.addEventListener('toggle', () => (details.open ? state.openExperience.add(exp.slug) : state.openExperience.delete(exp.slug)));
        return details;
      }),
    ),
  );
}

// ---------- Datos del sitio ----------

function renderSite() {
  const s = state.site;
  const sec: Section = 'site';
  const n = (v: string) => Number(v.replace(/[^\d.-]/g, ''));
  const group = (title: string, ...fields: Child[]) => h('fieldset', { class: 'adm-group' }, h('legend', {}, title), ...fields);

  $('#adm-panel').replaceChildren(
    saveBar('site', 'Datos del sitio', 'Contacto, precios, horarios y redes sociales.'),
    group(
      'Reservas y contacto',
      field('WhatsApp (con indicativo, solo números)', s.whatsapp, (v) => (s.whatsapp = v.replace(/\D/g, '')), sec, { type: 'tel', placeholder: '573001234567' }),
      field('Precio por persona por defecto (COP)', s.defaultPriceCop, (v) => (s.defaultPriceCop = n(v)), sec, { type: 'number', hint: 'Se usa en las experiencias que no tienen precio propio.' }),
      field('Precio de la bolsa de café (COP)', s.coffeePriceCop, (v) => (s.coffeePriceCop = n(v)), sec, { type: 'number' }),
      h(
        'div',
        { class: 'adm-row adm-row--fields' },
        field('Mínimo de viajeros', s.minTravelers, (v) => (s.minTravelers = n(v)), sec, { type: 'number' }),
        field('Máximo de viajeros', s.maxTravelers, (v) => (s.maxTravelers = n(v)), sec, { type: 'number' }),
      ),
      field(
        'Horarios de salida',
        s.departureTimes.join(', '),
        (v) => (s.departureTimes = v.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)),
        sec,
        { placeholder: '06:30, 08:30, 13:30', hint: 'Formato 24 h separados por coma.' },
      ),
    ),
    group(
      'Redes sociales',
      field('Facebook', s.social.facebook, (v) => (s.social.facebook = v.trim()), sec, { type: 'url', placeholder: 'https://…', hint: 'Vacío = el ícono se muestra sin enlace.' }),
      field('TikTok', s.social.tiktok, (v) => (s.social.tiktok = v.trim()), sec, { type: 'url', placeholder: 'https://…' }),
      field('Instagram', s.social.instagram, (v) => (s.social.instagram = v.trim()), sec, { type: 'url', placeholder: 'https://…' }),
    ),
    group(
      'Organización',
      field('Nombre del sitio', s.name, (v) => (s.name = v), sec),
      field('Nombre corto', s.shortName, (v) => (s.shortName = v), sec),
      field('Razón social', s.legalName, (v) => (s.legalName = v), sec),
      field('NIT', s.nit, (v) => (s.nit = v), sec),
      field('Altura del territorio (msnm)', s.altitudeMsnm, (v) => (s.altitudeMsnm = n(v)), sec, { type: 'number' }),
    ),
    group(
      'Ubicación',
      field('Vereda / sector', s.address.locality, (v) => (s.address.locality = v), sec),
      h(
        'div',
        { class: 'adm-row adm-row--fields' },
        field('Municipio', s.address.municipality, (v) => (s.address.municipality = v), sec),
        field('Departamento', s.address.region, (v) => (s.address.region = v), sec),
      ),
      h(
        'div',
        { class: 'adm-row adm-row--fields' },
        field('País', s.address.country, (v) => (s.address.country = v), sec),
        field('Código de país', s.address.countryCode, (v) => (s.address.countryCode = v), sec, { placeholder: 'CO' }),
      ),
      h(
        'div',
        { class: 'adm-row adm-row--fields' },
        field('Latitud', s.geo.lat, (v) => (s.geo.lat = Number(v)), sec, { type: 'number', step: 'any' }),
        field('Longitud', s.geo.lng, (v) => (s.geo.lng = Number(v)), sec, { type: 'number', step: 'any', hint: 'Del mapa de Google: clic derecho sobre el punto → copiar coordenadas.' }),
      ),
    ),
  );
}

// ---------- Navegación y arranque ----------

function render() {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  if (state.tab === 'gallery') renderGallery();
  else if (state.tab === 'experiences') renderExperiences();
  else renderSite();
}

function initState(data: ContentPayload) {
  state.head = data.head;
  state.cloudName = data.cloudName;
  state.email = data.email;
  state.site = data.site;
  state.experiences = data.experiences;

  const byId = new Map<string, GalleryItem>();
  for (const e of data.gallery) byId.set(e.id, { ...e, local: e.cloudinary ? undefined : build.localGallery[e.id] });
  for (const [id, local] of Object.entries(build.localGallery)) if (!byId.has(id)) byId.set(id, { id, local });
  state.gallery = [...byId.values()];
  sortGallery();
}

async function start() {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab as Section;
      render();
    }),
  );
  window.addEventListener('beforeunload', (e) => {
    if (Object.values(state.dirty).some(Boolean)) e.preventDefault();
  });

  try {
    const data = await api<ContentPayload>('content');
    initState(data);
    $('#adm-user').textContent = data.email;
    render();
    (['gallery', 'experiences', 'site'] as Section[]).forEach((s) => markDirty(s, false));
  } catch (err) {
    $('#adm-panel').replaceChildren(
      h(
        'div',
        { class: 'adm-error' },
        h('h2', {}, 'No se pudo cargar el panel'),
        h('p', {}, err instanceof Error ? err.message : String(err)),
        h('button', { class: 'adm-btn', onClick: () => location.reload() }, 'Reintentar'),
      ),
    );
  }
}

void start();
