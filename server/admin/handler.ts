/** Rutas de la API del panel: /api/admin/* */
import { parse, parseDocument, stringify, isSeq } from 'yaml';
import { requireAdmin } from './access';
import { destroyImages, signUpload } from './cloudinary';
import { HttpError, type AdminEnv, type PagesContext } from './env';
import { commit, headSha, listDir, readFile, type FileChange } from './github';
import type { ContentPayload, ExperienceData, ExperienceFile, GalleryEntry, SaveResult, SiteData } from './types';
import { validateExperience, validateGallery, validateSite, validateSlug } from './validate';
import { galleryCategories } from '../../src/config/gallery';

const GALLERY_PATH = 'src/content/galeria.yaml';
const EXPERIENCES_DIR = 'src/content/experiencias';
const SITE_PATH = 'src/content/site.json';
const LOCAL_PHOTO_RE = new RegExp(`^src/assets/galeria/(${galleryCategories.join('|')})/[^/]+\\.(jpe?g|png|webp|avif)$`, 'i');
const YAML_OPTS = { lineWidth: 0 } as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, 'Cuerpo JSON inválido.');
  }
}

async function loadGallery(env: AdminEnv, ref: string): Promise<{ text: string; entries: GalleryEntry[] }> {
  const text = await readFile(env, GALLERY_PATH, ref);
  return { text, entries: (parse(text) as GalleryEntry[] | null) ?? [] };
}

async function loadExperiences(env: AdminEnv, ref: string): Promise<ExperienceFile[]> {
  const files = (await listDir(env, EXPERIENCES_DIR, ref)).filter((f) => f.type === 'file' && f.name.endsWith('.yaml'));
  return Promise.all(
    files.map(async (f) => ({
      slug: f.name.replace(/\.yaml$/, ''),
      data: parse(await readFile(env, f.path, ref)) as ExperienceData,
    })),
  );
}

async function loadSite(env: AdminEnv, ref: string): Promise<SiteData> {
  return JSON.parse(await readFile(env, SITE_PATH, ref)) as SiteData;
}

/** Conserva los comentarios de cabecera de galeria.yaml y separa cada foto con una línea en blanco. */
function galleryYaml(previous: string, entries: GalleryEntry[]): string {
  const doc = parseDocument(previous);
  const node = doc.createNode(entries);
  if (isSeq(node)) node.items.forEach((item, i) => i > 0 && ((item as { spaceBefore?: boolean }).spaceBefore = true));
  doc.contents = node as any;
  return doc.toString(YAML_OPTS);
}

async function saveGallery(env: AdminEnv, email: string, req: Request): Promise<SaveResult> {
  const input = await body<{ head?: string; entries: unknown; deleteLocal?: unknown }>(req);
  const entries = validateGallery(input.entries);
  const deleteLocal = Array.isArray(input.deleteLocal) ? input.deleteLocal.map(String) : [];
  for (const p of deleteLocal) if (!LOCAL_PHOTO_RE.test(p)) throw new HttpError(400, `Ruta de foto local inválida: ${p}`);

  const head = await headSha(env);
  const prev = await loadGallery(env, head);
  // Ignorar fotos locales que ya no existen (p. ej. borradas en un guardado anterior aún sin publicar).
  const dirs = [...new Set(deleteLocal.map((p) => p.slice(0, p.lastIndexOf('/'))))];
  const existing = new Set((await Promise.all(dirs.map((d) => listDir(env, d, head).catch(() => [])))).flat().map((f) => f.path));
  const changes: FileChange[] = [
    { path: GALLERY_PATH, content: galleryYaml(prev.text, entries) },
    ...deleteLocal.filter((p) => existing.has(p)).map((path) => ({ path, content: null })),
  ];
  const result = await commit(env, changes, 'admin: actualizar galería', email, input.head);

  const keep = new Set(entries.map((e) => e.cloudinary?.id).filter(Boolean));
  const removed = prev.entries.map((e) => e.cloudinary?.id).filter((id): id is string => !!id && !keep.has(id));
  const failed = result.changed ? await destroyImages(env, removed) : [];
  return {
    head: result.sha,
    changed: result.changed,
    url: result.url,
    warnings: failed.length ? [`No se pudieron borrar de Cloudinary: ${failed.join(', ')}`] : undefined,
  };
}

async function saveExperiences(env: AdminEnv, email: string, req: Request): Promise<SaveResult> {
  const input = await body<{ head?: string; items: unknown; deleted?: unknown }>(req);
  if (!Array.isArray(input.items)) throw new HttpError(400, 'Lista de experiencias inválida.');
  const items = input.items.map((raw) => {
    const item = raw as { slug?: unknown; data?: unknown };
    const slug = validateSlug(item.slug);
    return { slug, data: validateExperience(item.data, slug) };
  });
  if (!items.length) throw new HttpError(400, 'Debe quedar al menos una experiencia.');
  if (new Set(items.map((i) => i.slug)).size !== items.length) throw new HttpError(400, 'Hay dos experiencias con el mismo nombre de archivo.');
  const deleted = (Array.isArray(input.deleted) ? input.deleted : []).map(validateSlug).filter((s) => !items.some((i) => i.slug === s));

  const head = await headSha(env);
  const prev = await loadExperiences(env, head);
  const changes: FileChange[] = [
    ...items.map((i) => ({ path: `${EXPERIENCES_DIR}/${i.slug}.yaml`, content: stringify(i.data, YAML_OPTS) })),
    ...deleted.map((s) => ({ path: `${EXPERIENCES_DIR}/${s}.yaml`, content: null })),
  ];
  const result = await commit(env, changes, 'admin: actualizar experiencias', email, input.head);

  const keep = new Set(items.map((i) => i.data.cloudinary?.id).filter(Boolean));
  const removed = prev.map((p) => p.data.cloudinary?.id).filter((id): id is string => !!id && !keep.has(id));
  const failed = result.changed ? await destroyImages(env, removed) : [];
  return {
    head: result.sha,
    changed: result.changed,
    url: result.url,
    warnings: failed.length ? [`No se pudieron borrar de Cloudinary: ${failed.join(', ')}`] : undefined,
  };
}

async function saveSite(env: AdminEnv, email: string, req: Request): Promise<SaveResult> {
  const input = await body<{ head?: string; site: unknown }>(req);
  const head = await headSha(env);
  const site = validateSite(input.site, await loadSite(env, head));
  const result = await commit(
    env,
    [{ path: SITE_PATH, content: `${JSON.stringify(site, null, 2)}\n` }],
    'admin: actualizar datos del sitio',
    email,
    input.head,
  );
  return { head: result.sha, changed: result.changed, url: result.url };
}

export async function handleAdmin(ctx: PagesContext): Promise<Response> {
  const { request, env } = ctx;
  try {
    const email = await requireAdmin(request, env);
    const route = [ctx.params.path ?? []].flat().join('/');
    const method = request.method.toUpperCase();

    // Las escrituras solo se aceptan desde el mismo origen (protección CSRF).
    if (method !== 'GET') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Origen no permitido.');
    }

    if (method === 'GET' && route === 'me') return json({ email });

    if (method === 'GET' && route === 'content') {
      const head = await headSha(env);
      const [gallery, experiences, site] = await Promise.all([loadGallery(env, head), loadExperiences(env, head), loadSite(env, head)]);
      const payload: ContentPayload = {
        head,
        email,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        gallery: gallery.entries,
        experiences: experiences.sort((a, b) => a.data.order - b.data.order),
        site,
      };
      return json(payload);
    }

    if (method === 'POST' && route === 'sign-upload') {
      const { folder } = await body<{ folder?: string }>(request);
      const ok = folder === 'experiencias' || galleryCategories.some((c) => folder === `galeria/${c}`);
      if (!ok) throw new HttpError(400, 'Carpeta de subida inválida.');
      return json(await signUpload(env, folder!));
    }

    if (method === 'PUT' && route === 'gallery') return json(await saveGallery(env, email, request));
    if (method === 'PUT' && route === 'experiences') return json(await saveExperiences(env, email, request));
    if (method === 'PUT' && route === 'site') return json(await saveSite(env, email, request));

    throw new HttpError(404, 'Ruta no encontrada.');
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
}
