/**
 * Verificación del token de Cloudflare Access (Zero Trust).
 *
 * Cloudflare Access pide el login (código por email) ANTES de llegar aquí y añade el
 * encabezado `Cf-Access-Jwt-Assertion`. Igual lo verificamos (firma, audiencia, emisor y
 * vencimiento) para que la API nunca quede abierta si Access se configura mal.
 */
import { HttpError, type AdminEnv } from './env';

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

let certCache: { team: string; keys: Jwk[]; at: number } | undefined;

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson<T>(s: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))) as T;
}

async function getKeys(team: string, force = false): Promise<Jwk[]> {
  if (!force && certCache && certCache.team === team && Date.now() - certCache.at < 3_600_000) return certCache.keys;
  const res = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new HttpError(500, 'No se pudieron obtener las llaves de Cloudflare Access.');
  const { keys } = (await res.json()) as { keys: Jwk[] };
  certCache = { team, keys, at: Date.now() };
  return keys;
}

function readCookie(header: string | null, name: string): string | undefined {
  return header
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function isLocal(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

/** Devuelve el email del usuario autenticado o lanza 401/403. */
export async function requireAdmin(request: Request, env: AdminEnv): Promise<string> {
  const url = new URL(request.url);

  // Desarrollo local (wrangler pages dev): solo si DEV_ADMIN_EMAIL existe en .dev.vars.
  if (env.DEV_ADMIN_EMAIL && isLocal(url)) return env.DEV_ADMIN_EMAIL;

  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD) {
    throw new HttpError(500, 'Cloudflare Access no está configurado (CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD).');
  }
  const team = env.CF_ACCESS_TEAM_DOMAIN.replace(/\/+$/, '');
  const token = request.headers.get('Cf-Access-Jwt-Assertion') ?? readCookie(request.headers.get('Cookie'), 'CF_Authorization');
  if (!token) throw new HttpError(401, 'Sesión no iniciada. Recargue la página para entrar.');

  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Token inválido.');
  const [h, p, s] = parts as [string, string, string];
  const header = b64urlJson<{ kid?: string; alg?: string }>(h);
  if (header.alg !== 'RS256') throw new HttpError(401, 'Algoritmo de token no soportado.');

  let jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(team, true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, 'Llave del token desconocida.');

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!valid) throw new HttpError(401, 'Firma del token inválida.');

  const payload = b64urlJson<{ aud?: string | string[]; exp?: number; nbf?: number; iss?: string; email?: string }>(p);
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new HttpError(403, 'Token de otra aplicación.');
  if (payload.iss !== team) throw new HttpError(403, 'Emisor del token inválido.');
  if (!payload.exp || payload.exp < now) throw new HttpError(401, 'La sesión venció. Recargue la página.');
  if (payload.nbf && payload.nbf > now + 60) throw new HttpError(401, 'Token aún no válido.');
  if (!payload.email) throw new HttpError(403, 'El token no trae email.');

  const allow = env.ADMIN_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allow?.length && !allow.includes(payload.email.toLowerCase())) {
    throw new HttpError(403, `El correo ${payload.email} no tiene permiso para el panel.`);
  }
  return payload.email;
}
