/** Firma de subidas y borrado de fotos en Cloudinary (el API secret nunca sale del servidor). */
import { HttpError, type AdminEnv } from './env';

/** Todas las fotos del sitio viven bajo esta carpeta de Cloudinary. */
export const CLOUD_ROOT = 'rio-tellez';
const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,avif,heic,heif';

async function sha1Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Firma de Cloudinary: parámetros ordenados "a=1&b=2" + api_secret, en SHA-1. */
export async function signParams(params: Record<string, string | number>, secret: string): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return sha1Hex(toSign + secret);
}

function cfg(env: AdminEnv) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new HttpError(500, 'Faltan las variables de Cloudinary (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET).');
  }
  return { cloud: env.CLOUDINARY_CLOUD_NAME, key: env.CLOUDINARY_API_KEY, secret: env.CLOUDINARY_API_SECRET };
}

/** Datos para que el navegador suba el archivo directo a Cloudinary (sin pasar por el servidor). */
export async function signUpload(env: AdminEnv, subfolder: string) {
  const { cloud, key, secret } = cfg(env);
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(subfolder)) throw new HttpError(400, 'Carpeta inválida.');
  const params = {
    allowed_formats: ALLOWED_FORMATS,
    folder: `${CLOUD_ROOT}/${subfolder}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    fields: { ...params, api_key: key, signature: await signParams(params, secret) },
  };
}

/** Borra fotos de Cloudinary (solo dentro de la carpeta del sitio). Errores se ignoran. */
export async function destroyImages(env: AdminEnv, ids: string[]): Promise<string[]> {
  const { cloud, key, secret } = cfg(env);
  const failed: string[] = [];
  for (const id of ids) {
    if (!id.startsWith(`${CLOUD_ROOT}/`)) continue;
    const params = { invalidate: 'true', public_id: id, timestamp: Math.floor(Date.now() / 1000) };
    const body = new URLSearchParams({ ...params, timestamp: String(params.timestamp), api_key: key });
    body.set('signature', await signParams(params, secret));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: 'POST', body });
    if (!res.ok) failed.push(id);
  }
  return failed;
}
