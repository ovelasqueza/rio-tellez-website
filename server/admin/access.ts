/**
 * Autenticación del panel administrativo.
 *
 * Soporta dos métodos:
 * 1) Contraseña directa (ADMIN_PASSWORD): 100% gratuita, sin tarjetas ni servicios externos.
 *    Genera una cookie segura firmada con HMAC-SHA256 válida por 30 días.
 * 2) Cloudflare Access (Zero Trust): si están definidas CF_ACCESS_TEAM_DOMAIN y CF_ACCESS_AUD.
 */
import { HttpError, type AdminEnv } from './env';

export const SESSION_COOKIE_NAME = 'admin_session';

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

function authSecret(env: AdminEnv): string {
  return env.CLOUDINARY_API_SECRET || env.GITHUB_TOKEN || env.ADMIN_PASSWORD || 'secret-salt';
}

/** Genera la firma HMAC de la sesión */
async function signSession(secret: string, timestamp: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`rio-tellez-session:${timestamp}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Crea el token de sesión para la cookie */
export async function createSessionToken(env: AdminEnv): Promise<string> {
  const now = Date.now();
  const sig = await signSession(authSecret(env), now);
  return `${now}.${sig}`;
}

/** Verifica si una cookie de sesión es válida */
export async function verifySessionToken(token: string, env: AdminEnv): Promise<boolean> {
  const [timeStr, sig] = token.split('.');
  if (!timeStr || !sig) return false;
  const time = parseInt(timeStr, 10);
  // Válido por 30 días
  if (isNaN(time) || Date.now() - time > 30 * 24 * 3600 * 1000 || time > Date.now() + 60_000) {
    return false;
  }
  const expected = await signSession(authSecret(env), time);
  return expected === sig;
}

// ---------- Soporte Cloudflare Access (Zero Trust) ----------

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

async function verifyCfAccess(request: Request, env: AdminEnv): Promise<string> {
  const team = env.CF_ACCESS_TEAM_DOMAIN!.replace(/\/+$/, '');
  const token = request.headers.get('Cf-Access-Jwt-Assertion') ?? readCookie(request.headers.get('Cookie'), 'CF_Authorization');
  if (!token) throw new HttpError(401, 'Sesión no iniciada.');

  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Token inválido.');
  const [h, p, s] = parts as [string, string, string];
  const header = b64urlJson<{ kid?: string; alg?: string }>(h);
  if (header.alg !== 'RS256') throw new HttpError(401, 'Algoritmo no soportado.');

  let jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(team, true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, 'Llave desconocida.');

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!valid) throw new HttpError(401, 'Firma inválida.');

  const payload = b64urlJson<{ aud?: string | string[]; exp?: number; iss?: string; email?: string }>(p);
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new HttpError(403, 'Token de otra aplicación.');
  if (payload.iss !== team) throw new HttpError(403, 'Emisor del token inválido.');
  if (!payload.exp || payload.exp < now) throw new HttpError(401, 'La sesión venció.');
  if (!payload.email) throw new HttpError(403, 'Sin email.');
  return payload.email;
}

/**
 * Valida que la petición tenga una sesión administrativa activa.
 * Devuelve el identificador del usuario (o 'admin').
 */
export async function requireAdmin(request: Request, env: AdminEnv): Promise<string> {
  const url = new URL(request.url);

  // 1. Desarrollo local
  if (env.DEV_ADMIN_EMAIL && isLocal(url)) return env.DEV_ADMIN_EMAIL;

  // 2. Método contraseña (ADMIN_PASSWORD)
  if (env.ADMIN_PASSWORD) {
    const sessionCookie = readCookie(request.headers.get('Cookie'), SESSION_COOKIE_NAME);
    if (sessionCookie && (await verifySessionToken(sessionCookie, env))) {
      return 'admin';
    }
    throw new HttpError(401, 'No has iniciado sesión o la sesión venció.');
  }

  // 3. Método Cloudflare Access
  if (env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    return verifyCfAccess(request, env);
  }

  throw new HttpError(500, 'No se ha configurado ADMIN_PASSWORD en las variables de Cloudflare.');
}
