// In Next.js runtime this hints server-only usage; during Vitest (Vite) it is unresolved.
try { require('server-only'); } catch { /* noop for test environment */ }
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

function synthesizeAppUrl() {
	const host = process.env.DB_HOST || 'localhost';
	const port = process.env.DB_PORT || '5432';
	const dbName = process.env.DB_NAME || 'vendowifi';
	const user = process.env.DB_APP_USER;
	const pass = process.env.DB_APP_PASSWORD;
	if (!user || !pass) return null;
	return `postgres://${user}:${pass}@${host}:${port}/${dbName}`;
}

const IS_TEST = !!(process.env.VITEST || process.env.NODE_ENV === 'test');
const connectionString = (IS_TEST && process.env.TEST_DATABASE_URL)
	|| process.env.DATABASE_URL
	|| synthesizeAppUrl()
	|| 'postgres://postgres:postgres@localhost:5432/vendowifi';

export async function getDb() {
	if (!_db) {
		const { Pool } = await import('pg');
		const pool = new Pool({ connectionString });
		_db = drizzle(pool, { schema });
	}
	return _db;
}

export type DbClient = Awaited<ReturnType<typeof getDb>>;
