import { defineConfig } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';
loadEnv();

// Allow either full URLs or component variables to define connection strings.
// Component env vars (all optional, with sensible defaults):
//   DB_HOST (default localhost)
//   DB_PORT (default 5432)
//   DB_NAME (default vendowifi)
//   DB_OWNER_USER / DB_OWNER_PASSWORD
//   DB_APP_USER   / DB_APP_PASSWORD
// If MIGRATION_DATABASE_URL / DATABASE_URL are absent we synthesize them from components.

function buildUrl(user?: string, pass?: string, host?: string, port?: string, db?: string) {
  if (!user || !pass) return null;
  host = host || 'localhost';
  port = port || '5432';
  db = db || 'vendowifi';
  return `postgres://${user}:${pass}@${host}:${port}/${db}`;
}

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'vendowifi';

const synthesizedOwner = buildUrl(process.env.DB_OWNER_USER, process.env.DB_OWNER_PASSWORD, host, port, dbName);
const synthesizedApp   = buildUrl(process.env.DB_APP_USER, process.env.DB_APP_PASSWORD, host, port, dbName);

const url = process.env.MIGRATION_DATABASE_URL
  || synthesizedOwner
  || process.env.DATABASE_URL
  || synthesizedApp
  || 'postgres://postgres:postgres@localhost:5432/vendowifi';

export default defineConfig({
  schema: './src/server/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
