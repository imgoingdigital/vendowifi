#!/usr/bin/env node
import pg from 'pg';
import { config as loadEnv } from 'dotenv';
loadEnv();

function synthesize(kind) {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME || 'vendowifi';
  const user = kind === 'owner' ? process.env.DB_OWNER_USER : process.env.DB_APP_USER;
  const pw = kind === 'owner' ? process.env.DB_OWNER_PASSWORD : process.env.DB_APP_PASSWORD;
  if (!user || !pw) return null;
  return `postgres://${user}:${pw}@${host}:${port}/${db}`;
}

// This script grants SELECT/INSERT on audit_logs (and other tables) to the app role if missing.
// Use when you see: permission denied for table audit_logs

const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesize('owner') || process.env.DATABASE_URL || synthesize('app');
if (!ownerUrl) {
  console.error('Missing MIGRATION_DATABASE_URL or DATABASE_URL in env.');
  process.exit(1);
}

const appUrl = process.env.DATABASE_URL || synthesize('app');

(async () => {
  const owner = new pg.Client({ connectionString: ownerUrl });
  await owner.connect();

  try {
    // Extract app role name from connection string (between //user: and @)
    let appRole = null;
    if (appUrl) {
      const m = appUrl.match(/postgres:\/\/([^:]+):/);
      if (m) appRole = m[1];
    }
    if (!appRole) {
      console.warn('Could not infer app role from DATABASE_URL; skipping grants.');
      process.exit(0);
    }

    const tables = [
      'users','plans','vouchers','devices','audit_logs'
    ];
    for (const t of tables) {
      const sql = `GRANT SELECT, INSERT, UPDATE ON TABLE ${t} TO ${appRole};`;
      const seqSql = `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole};`;
      console.log(sql);
      await owner.query(sql).catch(e => console.error('Grant failed', t, e.message));
      await owner.query(seqSql).catch(() => {});
    }
    console.log('Grants attempted. If audit_logs still fails, ensure owner ran migrations and app user exists.');
  } finally {
    await owner.end();
  }
})();
