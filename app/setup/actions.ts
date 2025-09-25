"use server";
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '@/server/db/schema';
import { sql } from 'drizzle-orm';

const ENV_FILE = path.join(process.cwd(), '.env');
const ALLOWED_KEYS = new Set([
  'DATABASE_URL','MIGRATION_DATABASE_URL',
  'DB_HOST','DB_PORT','DB_NAME',
  'DB_OWNER_USER','DB_OWNER_PASSWORD',
  'DB_APP_USER','DB_APP_PASSWORD',
  'NEXT_PUBLIC_STACK_PROJECT_ID','NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_SECRET_SERVER_KEY','BACKDOOR_RESET_SECRET','CONFIG_RESET_SECRET','REDIS_URL'
]);

function synthesizeUrl(kind: 'owner' | 'app') {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const user = kind === 'owner' ? process.env.DB_OWNER_USER : process.env.DB_APP_USER;
  const pass = kind === 'owner' ? process.env.DB_OWNER_PASSWORD : process.env.DB_APP_PASSWORD;
  if (!user || !pass) return null;
  return `postgres://${user}:${pass}@${host}:${port}/${dbName}`;
}

export async function updateEnvAction(pairs: Record<string,string>) {
  // Read existing
  let existing = '';
  try { existing = fs.readFileSync(ENV_FILE, 'utf8'); } catch { existing = ''; }
  const lines = existing.split(/\r?\n/);
  const map: Record<string,string> = {};
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx+1);
    map[k] = v;
  }
  for (const [k,v] of Object.entries(pairs)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (v === '') continue; // skip empty to avoid accidental wipe
    map[k] = v;
  }
  const out = Object.entries(map).map(([k,v]) => `${k}=${v}`).join('\n') + '\n';
  fs.writeFileSync(ENV_FILE, out, 'utf8');
  return { ok: true, message: 'Updated .env (restart dev server to apply).' };
}

export async function runGrantAction() {
  const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
  if (!ownerUrl) return { ok: false, message: 'Missing MIGRATION_DATABASE_URL or DATABASE_URL' };
  const client = new pg.Client({ connectionString: ownerUrl });
  try {
    await client.connect();
  const appUrl = process.env.DATABASE_URL || synthesizeUrl('app');
    let appRole: string | null = null;
    if (appUrl) { const m = appUrl.match(/postgres:\/\/(.*?):/); if (m) appRole = m[1]; }
    if (!appRole) return { ok: false, message: 'Could not infer app role from DATABASE_URL' };
    const tables = ['users','plans','vouchers','devices','audit_logs'];
    for (const t of tables) {
      await client.query(`GRANT SELECT, INSERT, UPDATE ON TABLE ${t} TO ${appRole};`).catch(e=> {});
    }
    await client.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ' + appRole + ';').catch(()=>{});
    return { ok: true, message: 'Grants attempted for role ' + appRole };
  } catch (e: any) {
    return { ok: false, message: 'Grant error: ' + e.message };
  } finally {
    try { await client.end(); } catch {}
  }
}

export async function testDbAction() {
  const url = process.env.DATABASE_URL || synthesizeUrl('app');
  if (!url) return { ok: false, message: 'DATABASE_URL not set' };
  const c = new pg.Client({ connectionString: url });
  const start = Date.now();
  try {
    await c.connect();
    await c.query('SELECT 1');
    return { ok: true, message: `DB OK (latency ${Date.now()-start}ms)` };
  } catch (e: any) {
    return { ok: false, message: 'DB error: ' + e.message };
  } finally {
    try { await c.end(); } catch {}
  }
}

// Advanced: create database + roles using a superuser connection (dangerous in production if misused).
// Requires SUPERUSER env vars to be set: DB_SUPERUSER_USER, DB_SUPERUSER_PASSWORD (and optional DB_SUPERUSER_HOST/PORT)
export async function provisionDbAction() {
  const suUser = process.env.DB_SUPERUSER_USER;
  const suPass = process.env.DB_SUPERUSER_PASSWORD;
  const host = process.env.DB_SUPERUSER_HOST || process.env.DB_HOST || 'localhost';
  const port = process.env.DB_SUPERUSER_PORT || process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const ownerUser = process.env.DB_OWNER_USER;
  const ownerPass = process.env.DB_OWNER_PASSWORD;
  const appUser = process.env.DB_APP_USER;
  const appPass = process.env.DB_APP_PASSWORD;
  if (!suUser || !suPass) return { ok: false, message: 'Missing DB_SUPERUSER_USER / DB_SUPERUSER_PASSWORD in env.' };
  if (!ownerUser || !ownerPass || !appUser || !appPass) return { ok: false, message: 'Missing owner/app user credentials (DB_OWNER_* / DB_APP_*)' };

  const root = new pg.Client({ host, port: parseInt(port,10), user: suUser, password: suPass, database: 'postgres' });
  try {
    await root.connect();
    const escIdent = (v: string) => '"' + v.replace(/"/g,'""') + '"';
    // Create roles if absent
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${ownerUser}') THEN CREATE ROLE ${escIdent(ownerUser)} LOGIN PASSWORD '${ownerPass.replace(/'/g,"''")}'; END IF; END $$;`);
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${appUser}') THEN CREATE ROLE ${escIdent(appUser)} LOGIN PASSWORD '${appPass.replace(/'/g,"''")}'; END IF; END $$;`);
    // Create database if missing
    const dbExists = await root.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (dbExists.rowCount === 0) {
      await root.query(`CREATE DATABASE ${escIdent(dbName)} OWNER ${escIdent(ownerUser)};`);
    }
    // Extension & grants (connect as owner)
    const ownerClient = new pg.Client({ host, port: parseInt(port,10), user: ownerUser, password: ownerPass, database: dbName });
    await ownerClient.connect();
    try {
      await ownerClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      // Basic grants for schema usage (tables will be granted later / after baseline)
      await ownerClient.query(`GRANT USAGE ON SCHEMA public TO ${escIdent(appUser)};`).catch(()=>{});
    } finally { await ownerClient.end(); }
    return { ok: true, message: 'Provision complete (roles/db/extension). Apply baseline & run grants next.' };
  } catch (e: any) {
    return { ok: false, message: 'Provision error: ' + e.message };
  } finally { try { await root.end(); } catch {} }
}

// Ephemeral provisioning: accepts superuser creds directly (NOT stored).
// Use this instead of environment-based provisioning if you don't want to persist superuser credentials.
export async function provisionDbEphemeralAction(params: { suUser: string; suPass: string; host?: string; port?: string; }) {
  const { suUser, suPass } = params;
  const host = params.host || process.env.DB_HOST || 'localhost';
  const port = params.port || process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const ownerUser = process.env.DB_OWNER_USER;
  const ownerPass = process.env.DB_OWNER_PASSWORD;
  const appUser = process.env.DB_APP_USER;
  const appPass = process.env.DB_APP_PASSWORD;
  if (!suUser || !suPass) return { ok: false, message: 'Superuser credentials required.' };
  if (!ownerUser || !ownerPass || !appUser || !appPass) return { ok: false, message: 'Missing owner/app credentials (set DB_OWNER_* & DB_APP_* first).' };

  const root = new pg.Client({ host, port: parseInt(port,10), user: suUser, password: suPass, database: 'postgres' });
  try {
    await root.connect();
    const escIdent = (v: string) => '"' + v.replace(/"/g,'""') + '"';
    const escLiteral = (v: string) => v.replace(/'/g, "''");
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${ownerUser}') THEN CREATE ROLE ${escIdent(ownerUser)} LOGIN PASSWORD '${escLiteral(ownerPass)}'; END IF; END $$;`);
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${appUser}') THEN CREATE ROLE ${escIdent(appUser)} LOGIN PASSWORD '${escLiteral(appPass)}'; END IF; END $$;`);
    const dbExists = await root.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (dbExists.rowCount === 0) {
      await root.query(`CREATE DATABASE ${escIdent(dbName)} OWNER ${escIdent(ownerUser)};`);
    }
    const ownerClient = new pg.Client({ host, port: parseInt(port,10), user: ownerUser, password: ownerPass, database: dbName });
    await ownerClient.connect();
    try {
      await ownerClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      await ownerClient.query(`GRANT USAGE ON SCHEMA public TO ${escIdent(appUser)};`).catch(()=>{});
    } finally { await ownerClient.end(); }
    return { ok: true, message: 'Ephemeral provision complete. Run baseline & grants next.' };
  } catch (e: any) {
    return { ok: false, message: 'Provision error: ' + e.message };
  } finally { try { await root.end(); } catch {} }
}

// Apply drizzle migrations using the owner (migration) role.
export async function runMigrationsAction() {
  const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
  if (!ownerUrl) return { ok: false, message: 'No owner (migration) connection available.' };
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: ownerUrl });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: 'drizzle' });
    await pool.end();
    return { ok: true, message: 'Migrations executed (see server logs for details).' };
  } catch (e: any) {
    return { ok: false, message: 'Migration error: ' + e.message };
  }
}

// Destructive: drop database using owner credentials (NOT superuser). Owner must not be connected to target DB.
// We connect to postgres database (or template1) with the owner user and run DROP DATABASE.
export async function dropDatabaseAction() {
  const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
  if (!ownerUrl) return { ok: false, message: 'No owner connection. Set MIGRATION_DATABASE_URL or DB_OWNER_* first.' };
  try {
    const u = new URL(ownerUrl);
    const dbName = (u.pathname || '/vendowifi').slice(1) || 'vendowifi';
    const host = u.hostname;
    const port = u.port || '5432';
    const user = decodeURIComponent(u.username);
    const pass = decodeURIComponent(u.password);
    if (!dbName) return { ok: false, message: 'Could not parse database name.' };
    // Connect to postgres (not the target db) as owner.
    const root = new pg.Client({ host, port: parseInt(port,10), user, password: pass, database: 'postgres' });
    await root.connect();
    try {
      // Attempt drop. If other connections exist this may fail (only superuser can terminate others).
      await root.query(`DROP DATABASE IF EXISTS "${dbName.replace(/"/g,'""')}";`);
      return { ok: true, message: `Database ${dbName} dropped.` };
    } finally { await root.end(); }
  } catch (e: any) {
    return { ok: false, message: 'Drop error: ' + e.message };
  }
}

// Shared helper: run migrations (ownerUrl) + minimal grants.
async function runMigrationsAndGrants(ownerUrl: string) {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: ownerUrl });
  try {
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: 'drizzle' });
  } finally { await pool.end().catch(()=>{}); }

  // After migrations, connect as owner to grant privileges to app role.
  const u = new URL(ownerUrl);
  const appUrl = process.env.DATABASE_URL || synthesizeUrl('app');
  if (!appUrl) return; // No app role configured.
  let appRole: string | null = null;
  const m = appUrl.match(/postgres:\/\/([^:]+):/);
  if (m) appRole = m[1];
  if (!appRole) return;
  const host = u.hostname; const port = u.port || '5432';
  const ownerUser = decodeURIComponent(u.username); const ownerPass = decodeURIComponent(u.password);
  const dbName = (u.pathname || '/vendowifi').slice(1) || 'vendowifi';
  const ownerClient = new pg.Client({ host, port: parseInt(port,10), user: ownerUser, password: ownerPass, database: dbName });
  await ownerClient.connect();
  try {
    const tables = ['users','plans','vouchers','devices','audit_logs'];
    for (const t of tables) {
      await ownerClient.query(`GRANT SELECT, INSERT, UPDATE ON TABLE ${t} TO ${appRole};`).catch(()=>{});
    }
    await ownerClient.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole};`).catch(()=>{});
  } finally { await ownerClient.end().catch(()=>{}); }
}

// One-click bootstrap using env-based superuser credentials.
export async function bootstrapDbEnvAction() {
  const suUser = process.env.DB_SUPERUSER_USER;
  const suPass = process.env.DB_SUPERUSER_PASSWORD;
  const host = process.env.DB_SUPERUSER_HOST || process.env.DB_HOST || 'localhost';
  const port = process.env.DB_SUPERUSER_PORT || process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const ownerUser = process.env.DB_OWNER_USER; const ownerPass = process.env.DB_OWNER_PASSWORD;
  const appUser = process.env.DB_APP_USER; const appPass = process.env.DB_APP_PASSWORD;
  if (!suUser || !suPass) return { ok: false, message: 'Missing DB_SUPERUSER_USER / DB_SUPERUSER_PASSWORD.' };
  if (!ownerUser || !ownerPass || !appUser || !appPass) return { ok: false, message: 'Missing owner/app credentials.' };
  const root = new pg.Client({ host, port: parseInt(port,10), user: suUser, password: suPass, database: 'postgres' });
  try {
    await root.connect();
    const escIdent = (v: string) => '"' + v.replace(/"/g,'""') + '"';
    const escLiteral = (v: string) => v.replace(/'/g, "''");
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${ownerUser}') THEN CREATE ROLE ${escIdent(ownerUser)} LOGIN PASSWORD '${escLiteral(ownerPass)}'; END IF; END $$;`);
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${appUser}') THEN CREATE ROLE ${escIdent(appUser)} LOGIN PASSWORD '${escLiteral(appPass)}'; END IF; END $$;`);
    const exists = await root.query('SELECT 1 FROM pg_database WHERE datname=$1',[dbName]);
    if (!exists.rowCount) await root.query(`CREATE DATABASE ${escIdent(dbName)} OWNER ${escIdent(ownerUser)};`);
  } catch (e: any) {
    return { ok: false, message: 'Provision phase error: ' + e.message };
  } finally { try { await root.end(); } catch {} }
  // Ensure extension + migrations + grants
  try {
    const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
    if (!ownerUrl) return { ok: false, message: 'Owner connection missing after provision.' };
    // Enable pgcrypto as owner
    const u = new URL(ownerUrl); const host2 = u.hostname; const port2 = u.port || '5432';
    const ownerUser2 = decodeURIComponent(u.username); const ownerPass2 = decodeURIComponent(u.password);
    const dbName2 = (u.pathname || '/vendowifi').slice(1) || 'vendowifi';
    const extClient = new pg.Client({ host: host2, port: parseInt(port2,10), user: ownerUser2, password: ownerPass2, database: dbName2 });
    await extClient.connect();
    await extClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await extClient.end();
    await runMigrationsAndGrants(ownerUrl);
    return { ok: true, message: 'Bootstrap complete (roles, db, extension, migrations, grants).' };
  } catch (e: any) {
    return { ok: false, message: 'Bootstrap finalize error: ' + e.message };
  }
}

// One-click bootstrap using ephemeral superuser credentials (not persisted).
export async function bootstrapDbEphemeralAction(params: { suUser: string; suPass: string; host?: string; port?: string; }) {
  const { suUser, suPass } = params;
  const host = params.host || process.env.DB_HOST || 'localhost';
  const port = params.port || process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const ownerUser = process.env.DB_OWNER_USER; const ownerPass = process.env.DB_OWNER_PASSWORD;
  const appUser = process.env.DB_APP_USER; const appPass = process.env.DB_APP_PASSWORD;
  if (!suUser || !suPass) return { ok: false, message: 'Superuser creds required.' };
  if (!ownerUser || !ownerPass || !appUser || !appPass) return { ok: false, message: 'Missing owner/app credentials (set DB_OWNER_* & DB_APP_*).' };
  const root = new pg.Client({ host, port: parseInt(port,10), user: suUser, password: suPass, database: 'postgres' });
  try {
    await root.connect();
    const escIdent = (v: string) => '"' + v.replace(/"/g,'""') + '"';
    const escLiteral = (v: string) => v.replace(/'/g, "''");
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${ownerUser}') THEN CREATE ROLE ${escIdent(ownerUser)} LOGIN PASSWORD '${escLiteral(ownerPass)}'; END IF; END $$;`);
    await root.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${appUser}') THEN CREATE ROLE ${escIdent(appUser)} LOGIN PASSWORD '${escLiteral(appPass)}'; END IF; END $$;`);
    const exists = await root.query('SELECT 1 FROM pg_database WHERE datname=$1',[dbName]);
    if (!exists.rowCount) await root.query(`CREATE DATABASE ${escIdent(dbName)} OWNER ${escIdent(ownerUser)};`);
  } catch (e: any) {
    return { ok: false, message: 'Provision phase error: ' + e.message };
  } finally { try { await root.end(); } catch {} }
  try {
    const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
    if (!ownerUrl) return { ok: false, message: 'Owner connection missing after provision.' };
    const u = new URL(ownerUrl); const host2 = u.hostname; const port2 = u.port || '5432';
    const ownerUser2 = decodeURIComponent(u.username); const ownerPass2 = decodeURIComponent(u.password);
    const dbName2 = (u.pathname || '/vendowifi').slice(1) || 'vendowifi';
    const extClient = new pg.Client({ host: host2, port: parseInt(port2,10), user: ownerUser2, password: ownerPass2, database: dbName2 });
    await extClient.connect();
    await extClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
    await extClient.end();
    await runMigrationsAndGrants(ownerUrl);
    return { ok: true, message: 'Bootstrap complete (roles, db, extension, migrations, grants).' };
  } catch (e: any) {
    return { ok: false, message: 'Bootstrap finalize error: ' + e.message };
  }
}

// Diagnose schema drift for critical columns (currently only stack_user_id) and optionally repair.
export async function diagnoseSchemaDriftAction(params?: { repair?: boolean }) {
  const repair = !!params?.repair;
  const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeUrl('owner') || process.env.DATABASE_URL;
  if (!ownerUrl) return { ok: false, message: 'No owner connection available to diagnose.' };
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: ownerUrl });
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='stack_user_id'`);
      const missing = res.rowCount === 0;
      if (!missing) return { ok: true, message: 'No drift detected: stack_user_id present.' };
      if (!repair) {
        return { ok: false, message: 'Drift detected: stack_user_id missing. Run migrations or invoke with repair=true to patch.' };
      }
      // Repair path (idempotent): add column if absent and ensure index.
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stack_user_id varchar(64);`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_stack_user_id_uq ON users(stack_user_id);`);
      return { ok: true, message: 'Repair applied: stack_user_id column ensured.' };
    } finally { client.release(); }
  } catch (e: any) {
    return { ok: false, message: 'Drift diagnose error: ' + e.message };
  } finally { await pool.end().catch(()=>{}); }
}
