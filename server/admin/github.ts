/** Lectura y escritura del repositorio vía API de GitHub (un commit por guardado). */
import { HttpError, type AdminEnv } from './env';

export interface FileChange {
  path: string;
  /** Contenido nuevo (texto UTF-8) o `null` para borrar el archivo. */
  content: string | null;
}

function cfg(env: AdminEnv) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) throw new HttpError(500, 'Falta GITHUB_TOKEN o GITHUB_REPO.');
  return { repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH || 'main', token: env.GITHUB_TOKEN };
}

async function gh<T>(env: AdminEnv, path: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
  const { token } = cfg(env);
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'rio-tellez-admin',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409 || res.status === 422) throw new HttpError(409, `Conflicto al guardar en GitHub: ${text.slice(0, 200)}`);
    throw new HttpError(502, `GitHub respondió ${res.status}: ${text.slice(0, 200)}`);
  }
  return (init.raw ? await res.text() : await res.json()) as T;
}

/** SHA del último commit de la rama. */
export async function headSha(env: AdminEnv): Promise<string> {
  const { repo, branch } = cfg(env);
  const ref = await gh<{ object: { sha: string } }>(env, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  return ref.object.sha;
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export async function readFile(env: AdminEnv, path: string, ref: string): Promise<string> {
  const { repo } = cfg(env);
  return gh<string>(env, `/repos/${repo}/contents/${encodePath(path)}?ref=${ref}`, { raw: true });
}

export async function listDir(env: AdminEnv, path: string, ref: string): Promise<{ name: string; path: string; type: string }[]> {
  const { repo } = cfg(env);
  return gh(env, `/repos/${repo}/contents/${encodePath(path)}?ref=${ref}`);
}

/**
 * Crea UN commit con todos los cambios. Si `expectedHead` no coincide con la rama
 * (otra persona guardó antes), responde 409 para no pisar cambios ajenos.
 */
export async function commit(env: AdminEnv, changes: FileChange[], message: string, author: string, expectedHead?: string) {
  const { repo, branch } = cfg(env);
  const head = await headSha(env);
  if (expectedHead && expectedHead !== head) {
    throw new HttpError(409, 'Otra persona guardó cambios mientras usted editaba. Recargue el panel para ver la última versión.');
  }
  const base = await gh<{ tree: { sha: string } }>(env, `/repos/${repo}/git/commits/${head}`);
  const tree = await gh<{ sha: string }>(env, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: base.tree.sha,
      tree: changes.map((c) =>
        c.content === null
          ? { path: c.path, mode: '100644', type: 'blob', sha: null }
          : { path: c.path, mode: '100644', type: 'blob', content: c.content },
      ),
    }),
  });
  if (tree.sha === base.tree.sha) return { sha: head, changed: false };

  const created = await gh<{ sha: string; html_url: string }>(env, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `${message}\n\nEditado desde /admin por ${author}`,
      tree: tree.sha,
      parents: [head],
    }),
  });
  await gh(env, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: created.sha, force: false }),
  });
  return { sha: created.sha, changed: true, url: `https://github.com/${repo}/commit/${created.sha}` };
}
