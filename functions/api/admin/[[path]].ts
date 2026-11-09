/**
 * API del panel administrativo → /api/admin/*
 * Cloudflare Pages compila este archivo automáticamente (carpeta functions/).
 * La lógica está en server/admin/.
 */
import { handleAdmin } from '../../../server/admin/handler';
import type { PagesContext } from '../../../server/admin/env';

export const onRequest = (ctx: PagesContext) => handleAdmin(ctx);
