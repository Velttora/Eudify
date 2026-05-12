import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Solo desarrollo: en Fly `NODE_ENV=production` y el contenedor no incluye `.env`;
 * ahí todo viene de `fly secrets` / `[env]` en fly.toml.
 *
 * Orden (cada archivo pisa claves anteriores): `.env.development` → `.env` → `.env.local`
 * - `.env.development`: valores seguros versionados (Postgres local, CORS localhost).
 * - `.env` / `.env.local`: secretos y overrides (gitignored).
 *
 * `__dirname` es `src/` al compilar en caliente o `dist/` al ejecutar el build; en ambos
 * casos `..` apunta al raíz del paquete `apps/api`.
 */
/** Raíz de `apps/api` (Nest puede ejecutar el JS desde `dist/` o setups raros con otro cwd). */
function resolveApiPackageRoot(): string {
  const fromCompiled = join(__dirname, '..');
  if (
    existsSync(join(fromCompiled, '.env.development')) ||
    existsSync(join(fromCompiled, '.env')) ||
    existsSync(join(fromCompiled, '.env.local'))
  ) {
    return fromCompiled;
  }
  const fromMonorepoCwd = join(process.cwd(), 'apps', 'api');
  if (
    existsSync(join(fromMonorepoCwd, '.env.development')) ||
    existsSync(join(fromMonorepoCwd, '.env')) ||
    existsSync(join(fromMonorepoCwd, '.env.local'))
  ) {
    return fromMonorepoCwd;
  }
  return fromCompiled;
}

const apiPackageRoot = resolveApiPackageRoot();

function applyEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

if (process.env.NODE_ENV !== 'production') {
  const layered = ['.env.development', '.env', '.env.local'];
  for (const name of layered) {
    applyEnvFile(join(apiPackageRoot, name));
  }
}
