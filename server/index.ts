/**
 * Entry point para Cloudflare Workers con Static Assets.
 *
 * - Peticiones a /api/admin/* → son atendidas por el backend administrativo (server/admin/handler).
 * - Cualquier otra ruta → es servida como archivo estático por el binding de assets (dist/).
 */
import { handleAdmin } from './admin/handler';
import type { AdminEnv } from './admin/env';

interface WorkerEnv extends AdminEnv {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // Si la petición va dirigida a la API del panel /api/admin/*
    if (url.pathname.startsWith('/api/admin')) {
      const sub = url.pathname.replace(/^\/api\/admin\/?/, '');
      const pathSegments = sub ? sub.split('/').filter(Boolean) : [];
      return handleAdmin({
        request,
        env,
        params: { path: pathSegments },
      });
    }

    // Servir archivos estáticos del sitio (dist/)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Assets binding no configurado.', { status: 500 });
  },
};
