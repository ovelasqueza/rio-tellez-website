/** Variables de entorno del panel (Cloudflare Pages → Settings → Variables and Secrets). */
export interface AdminEnv {
  /** Token "fine-grained" de GitHub con permiso Contents: Read and write SOLO sobre este repo. */
  GITHUB_TOKEN: string;
  /** "usuario/repositorio" */
  GITHUB_REPO: string;
  /** Rama que publica Cloudflare Pages (por defecto "main"). */
  GITHUB_BRANCH?: string;

  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  /** p. ej. "https://riotellez.cloudflareaccess.com" */
  CF_ACCESS_TEAM_DOMAIN: string;
  /** "Application Audience (AUD) Tag" de la aplicación de Cloudflare Access. */
  CF_ACCESS_AUD: string;
  /** Opcional: lista de correos permitidos separados por coma (filtro extra además de Access). */
  ADMIN_EMAILS?: string;

  /** SOLO desarrollo local (.dev.vars): correo simulado cuando se abre en localhost. */
  DEV_ADMIN_EMAIL?: string;
}

/** Contexto mínimo de Pages Functions (evita depender de @cloudflare/workers-types). */
export interface PagesContext {
  request: Request;
  env: AdminEnv;
  params: { path?: string | string[] };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
