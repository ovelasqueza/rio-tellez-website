/** Subida directa del navegador a Cloudinary con firma del servidor. */
import { api } from './api';
import type { CloudImage } from '../../../server/admin/types';

/** Límite por archivo del plan gratuito de Cloudinary. */
const MAX_BYTES = 10 * 1024 * 1024;
const SAFE_BYTES = 9.5 * 1024 * 1024;
/** Límite de megapíxeles del plan gratuito. */
const MAX_PIXELS = 24_000_000;

interface Signed {
  url: string;
  fields: Record<string, string | number>;
}

export interface UploadResult extends CloudImage {
  originalName: string;
  note?: string;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/**
 * Solo si la foto supera el límite gratuito (10 MB) se reduce en el navegador, a JPEG de
 * alta calidad. En cualquier otro caso se sube el ORIGINAL intacto.
 */
async function fitToLimit(file: File): Promise<{ file: Blob; note?: string }> {
  if (file.size <= SAFE_BYTES) return { file };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`"${file.name}" pesa ${mb(file.size)} (máximo 10 MB) y este navegador no puede reducirla. Redúzcala antes de subirla.`);
  }
  let scale = Math.min(1, 6000 / Math.max(bitmap.width, bitmap.height), Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)));
  for (const quality of [0.92, 0.88, 0.82]) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= SAFE_BYTES) {
      return { file: blob, note: `"${file.name}" pesaba ${mb(file.size)}; se ajustó a ${mb(blob.size)} (límite gratuito 10 MB).` };
    }
    scale *= 0.85;
  }
  throw new Error(`No se pudo reducir "${file.name}" por debajo de 10 MB.`);
}

export async function uploadToCloudinary(file: File, folder: string, onProgress: (pct: number) => void): Promise<UploadResult> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) throw new Error(`"${file.name}" no es una imagen.`);
  const { file: blob, note } = await fitToLimit(file);
  if (blob.size > MAX_BYTES) throw new Error(`"${file.name}" supera 10 MB.`);

  const signed = await api<Signed>('sign-upload', { method: 'POST', body: { folder } });
  const form = new FormData();
  for (const [k, v] of Object.entries(signed.fields)) form.append(k, String(v));
  form.append('file', blob, file.name);

  const res = await new Promise<{ public_id: string; width: number; height: number }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(`Cloudinary: ${data?.error?.message ?? xhr.status}`));
      } catch {
        reject(new Error(`Cloudinary respondió ${xhr.status}.`));
      }
    };
    xhr.onerror = () => reject(new Error('Error de red al subir la foto.'));
    xhr.send(form);
  });
  return { id: res.public_id, width: res.width, height: res.height, originalName: file.name, note };
}
