## Database Setup & Reset Guide

This document standardizes how to bootstrap (or fully reset) the PostgreSQL database for the VendoWiFi project so that the first-run `/setup` flow works reliably with no permission issues.

### Goals
- Single, repeatable process for local dev or new environments.
- Separation of concerns: migration/owner role vs application runtime role.
- Idempotent baseline schema applied before development proceeds.
- Clear recovery procedure if schema drift occurs.

### Roles & URLs
Environment variables (in `.env`): choose ONE approach.

Option A (explicit URLs):
```
MIGRATION_DATABASE_URL=postgres://vendowifi_owner:OwnerPassword@localhost:5432/vendowifi
DATABASE_URL=postgres://vendowifi_app:AppPassword@localhost:5432/vendowifi
```

Option B (component variables – URLs synthesized automatically):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendowifi
DB_OWNER_USER=vendowifi_owner
DB_OWNER_PASSWORD=OwnerPassword
DB_APP_USER=vendowifi_app
DB_APP_PASSWORD=AppPassword
```
If `MIGRATION_DATABASE_URL` or `DATABASE_URL` are not set, the tooling assembles them from the component variables.
`vendowifi_owner`: Full privileges (creates schema & grants).
`vendowifi_app`: Least-privilege runtime (SELECT/INSERT/UPDATE on data tables only).

### One-Time Prerequisites
1. Create both roles (run in psql as superuser `postgres`):
```sql
CREATE ROLE vendowifi_owner LOGIN PASSWORD 'OwnerPassword';
CREATE ROLE vendowifi_app LOGIN PASSWORD 'AppPassword';
```
2. Create database owned by owner role:
```sql
CREATE DATABASE vendowifi OWNER vendowifi_owner;
```
3. Enable extension (UUID generation) inside the DB:
```sql
\c vendowifi
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Fresh Reset (Safe For Dev Only)
If you have no important data yet:
```bash
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS vendowifi;"
psql -h localhost -U postgres -c "CREATE DATABASE vendowifi OWNER vendowifi_owner;"
psql -h localhost -U postgres -d vendowifi -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

### Apply Baseline Schema
We maintain a manual baseline file: `drizzle/0000_init.sql`.

Apply it (only once per fresh DB):
```bash
psql -h localhost -U vendowifi_owner -d vendowifi -f drizzle/0000_init.sql
```

This file creates: users, plans, vouchers, devices, audit_logs (+ indices).

### Run Grants
Grant minimal privileges to the app role:
```bash
npm run db:grant
```
This script infers the app role name from `DATABASE_URL` (or synthesized app URL) and grants appropriate table + sequence usage.

### Verify Schema
```bash
psql -h localhost -U vendowifi_app -d vendowifi -c "\d users" | findstr stack_user_id
```
If `stack_user_id` is present, baseline is good.

### First Run Flow
1. Start dev server: `npm run dev`
2. Visit `/` → redirected to `/setup` (no admin yet)
3. Sign up / sign in (Stack Auth hosted page)
4. Press "Promote my account" → should succeed (200) and redirect to `/admin/plans`

### Common Issues & Fixes
| Symptom | Cause | Fix |
|---------|-------|-----|
| `column "stack_user_id" does not exist` | Baseline not applied / stale DB | Re-run Fresh Reset + baseline apply |
| `permission denied for table audit_logs` | Grants not executed | `npm run db:grant` with MIGRATION_DATABASE_URL set |
| `role "vendowifi_owner" does not exist` | Roles not created | Create roles with passwords as above |
| `gen_random_uuid()` error | pgcrypto missing | `CREATE EXTENSION pgcrypto;` as owner |

### Adding New Schema Changes
1. Edit or add Drizzle schema files under `src/server/db/schema`.
2. Generate migration: `npm run db:generate` (creates new numbered migration in `drizzle/`).
3. Apply migration: `npm run db:migrate` (uses MIGRATION_DATABASE_URL when present).
4. Run grants (only if new tables added): `npm run db:grant`.

### DO / DO NOT
| Do | Do NOT |
|----|--------|
| Keep baseline immutable after first production deploy | Edit or reorder applied migrations |
| Add new migrations for every schema change | Manually hack tables without a migration (except initial local reset) |
| Use owner role only for migrations & grants | Run the app with owner role creds |

### Automated Reset Script (Optional)
Provided helper: `scripts/resetDb.mjs` (creates DB, extension, applies baseline, grants). Run with caution (destroys existing DB!).

### Production Considerations
- Keep baseline + all migrations in version control.
- Use backups (pg_dump) before applying new migrations.
- Rotate passwords periodically; update .env + redeploy.

---
Happy building. Update this guide if any onboarding step changes.
