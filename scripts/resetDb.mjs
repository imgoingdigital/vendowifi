#!/usr/bin/env node
// Dev-only destructive reset: drops DB, recreates, applies baseline schema, runs grants.
import { execSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
loadEnv();

function synthesizeOwner() {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME || 'vendowifi';
  const user = process.env.DB_OWNER_USER;
  const pw = process.env.DB_OWNER_PASSWORD;
  if (!user || !pw) return null;
  return `postgres://${user}:${pw}@${host}:${port}/${db}`;
}

const ownerUrl = process.env.MIGRATION_DATABASE_URL || synthesizeOwner() || process.env.DATABASE_URL;
if (!ownerUrl) {
  console.error('Missing MIGRATION_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

// Parse connection string (naive)
const m = ownerUrl.match(/^postgres:\/\/(.*?):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)$/);
if (!m) {
  console.error('Unsupported connection string format.');
  process.exit(1);
}
const [, ownerUser, ownerPass, host, portRaw, dbName] = m;
const port = portRaw || '5432';

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: ownerPass } });
}

console.log('WARNING: This will DROP database', dbName);
if (!process.env.NON_INTERACTIVE) {
  const prompt = process.stdin;
  process.stdout.write('Type YES to continue: ');
  prompt.setEncoding('utf8');
  prompt.once('data', d => {
    if (d.trim() === 'YES') proceed(); else { console.log('Aborted.'); process.exit(0); }
  });
} else {
  proceed();
}

function proceed() {
  try {
    run(`psql -h ${host} -U ${ownerUser} -p ${port} -c "DROP DATABASE IF EXISTS ${dbName};"`);
    run(`psql -h ${host} -U ${ownerUser} -p ${port} -c "CREATE DATABASE ${dbName} OWNER ${ownerUser};"`);
    run(`psql -h ${host} -U ${ownerUser} -p ${port} -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`);
    const baselinePath = path.join(process.cwd(), 'drizzle', '0000_init.sql');
    if (!fs.existsSync(baselinePath)) throw new Error('Missing baseline drizzle/0000_init.sql');
    run(`psql -h ${host} -U ${ownerUser} -p ${port} -d ${dbName} -f ${baselinePath}`);
    console.log('Baseline applied. Running grants...');
    run('npm run db:grant');
    console.log('Reset complete. Start dev server with: npm run dev');
  } catch (e) {
    console.error('Reset failed:', e.message);
    process.exit(1);
  }
}
