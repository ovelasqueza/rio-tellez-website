/** Variables de entorno del panel administrativo */
export interface AdminEnv {
  /** Token "fine-grained" de GitHub con permiso Contents: Read and write SOLO sobre este repo. */
  GITHUB_TOKEN: string;
  /** "usuario/repositorio" */
  GITHUB_REPO: string;
  /** Rama que publica (por defecto "main"). */
  GITHUB_BRANCH?: string;

  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  /**
   * Contraseña de acceso al panel /admin (100% gratuita, no requiere tarjeta ni servicios externos).
   * La define usted en Cloudflare: Settings → Variables and secrets → ADMIN_PASSWORD.
   */
  ADMIN_PASSWORD?: string;

  /** Opcional: si prefiere Cloudflare Access (Zero Trust), sigue soportado */
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_EMAILS?: string;

  /** SOLO desarrollo local (.dev.vars): correo o usuario simulado en localhost. */
  DEV_ADMIN_EMAIL?: string;
}

/** Contexto mínimo de ejecución */
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
