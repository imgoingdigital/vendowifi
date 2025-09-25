#!/usr/bin/env node
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// This helper applies 0001_flexible_plans.sql manually if drizzle journal didn't record it.

async function main(){
  // Support being run from repository root or from the app directory.
  const candidatePaths = [
    path.resolve('drizzle','0001_flexible_plans.sql'),
    path.resolve('vendowifi','drizzle','0001_flexible_plans.sql'),
  ];
  const chosen = candidatePaths.find(p => fs.existsSync(p));
  if (!chosen) {
    console.error('Migration file not found in candidates:', candidatePaths.join(', '));
    process.exit(1);
  }
  const sql = fs.readFileSync(chosen, 'utf8');
  function buildUrl(user, pass, host, port, db){
    if(!user || !pass) return null;
    host = host || 'localhost';
    port = port || '5432';
    db = db || 'vendowifi';
    return `postgres://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}`;
  }
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'vendowifi';
  const synthesizedOwner = buildUrl(process.env.DB_OWNER_USER, process.env.DB_OWNER_PASSWORD, host, port, dbName);
  const synthesizedApp = buildUrl(process.env.DB_APP_USER, process.env.DB_APP_PASSWORD, host, port, dbName);
  const connectionString = process.env.MIGRATION_DATABASE_URL || synthesizedOwner || process.env.DATABASE_URL || synthesizedApp || 'postgres://postgres:postgres@localhost:5432/vendowifi';
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log('Applying 0001_flexible_plans.sql (idempotent)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Done. You may now regenerate snapshot if desired.');
  } catch(e){
    await client.query('ROLLBACK');
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
