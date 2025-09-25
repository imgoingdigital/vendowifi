## VendoWiFi Platform

Self‑hosted voucher WiFi management (plans, vouchers, devices, admin UI) built with Next.js + PostgreSQL.

**Audience of this README:** Operators / users who want to run the platform. For architecture & roadmap see `DEVELOPMENT.md`.

---
## Features (Current)

- Plans & voucher code management
- Admin UI (plans, vouchers, audit logs, users)
- Secure auth via Stack + local role mapping (admin/operator)
- First‑run setup wizard (environment config, DB provision, migrations, admin bootstrap)
- Voucher redemption endpoint + basic page
- Audit logging
- Rate limiting scaffold (optional Redis)

Upcoming: voucher lifecycle (expiry/redeem transitions), device heartbeat, captive portal, RADIUS bridge.

---
## Quick Start (Local)

Prerequisites: Node 18+, PostgreSQL 15/16 (Docker or local), (optional) Redis.

1. Clone & install:
```
git clone <repo-url>
cd vendowifi
npm install
```
2. Create `.env` from example:
```
copy .env.example .env  # (Windows)
# or
cp .env.example .env    # (Linux/macOS)
```
3. Choose DB env style (A or B) and edit `.env`:
Style A (direct URLs):
```
MIGRATION_DATABASE_URL=postgres://vendowifi_owner:Owner123!@localhost:5432/vendowifi
DATABASE_URL=postgres://vendowifi_app:App123!@localhost:5432/vendowifi
```
Style B (component parts – URLs synthesized):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendowifi
DB_OWNER_USER=vendowifi_owner
DB_OWNER_PASSWORD=Owner123!
DB_APP_USER=vendowifi_app
DB_APP_PASSWORD=App123!
```
4. (Optional) Create roles & DB manually or use setup UI bootstrap later.
5. Run migrations:
```
npm run db:generate && npm run db:migrate
```
6. Start dev server:
```
npm run dev
```
7. Visit `http://localhost:3000/setup` to complete bootstrap (sign in via Stack, run provision/migrations if not done, confirm admin).

---
## Setup Wizard Overview

The `/setup` page provides tabs:

Tab | Purpose
--- | -------
Prereq | Basic environment & dependency checks
Config | Edit & mask/unmask env vars (writes to `.env`)
Database | Provision (roles+DB), run migrations, grants, bootstrap
Admin | Promote first user / confirm admin presence

Once an admin exists and DB is migrated, normal operation can move to `/admin`.

---
## Authentication & Users

Auth delegates to Stack. On sign‑in:
1. System links Stack user → local `users` row (first ever becomes admin, later users become operator).
2. Admins can promote/demote in `/admin/users` (last-admin guard coming soon).

If a DB reset occurs, the next sign‑in recreates/link the admin automatically.

---
## Voucher Redemption

Basic redemption page at `/redeem` calls the voucher redeem API. Upcoming improvements: rate limiting, lifecycle enforcement (expiry, revoke), better success path (redirect / portal release).

---
## Configuration

Use `/setup` → Config tab or edit `.env` directly. The system synthesizes `DATABASE_URL` & `MIGRATION_DATABASE_URL` from component parts if they are absent.

Important keys:
| Key | Purpose |
|-----|---------|
| DB_HOST / PORT / NAME | Core database location |
| DB_OWNER_* | Migration/owner credentials |
| DB_APP_* | Runtime app credentials |
| NEXT_PUBLIC_STACK_PROJECT_ID | Stack project id (public) |
| STACK_SECRET_SERVER_KEY | Stack server secret |
| REDIS_URL | Optional rate limiting backend |

After saving env changes restart the dev server.

---
## Database Operations

Action | How
------ | ----
Provision roles & DB | Setup → Database tab (Bootstrap) or manual SQL
Run migrations | `npm run db:migrate` or Setup tab (type MIGRATE)
Apply grants | `npm run db:grant` or Setup tab (Run Grants)
Drop DB (dev only) | Setup tab (type DROP) then re-provision/migrate

If you see missing columns (e.g. `stack_user_id`), run migrations again; a safeguard migration ensures column presence.

---
## Recovery Scenarios

Scenario | Fix
-------- | ---
Lost admin (no admin row) | Sign in with original account → first user rule re-applies; or promote earliest user via `/api/admin/promote-first`.
Permission denied | Re-run grants (ensure owner URL valid)
Schema drift | Run migrations; if still missing, inspect `drizzle/` for corrective migration

---
## Production Notes (Preview)

Minimum Hardening Checklist:
* Enforce HTTPS & secure cookies
* Rotate secrets periodically
* Limit operator role capabilities (demote destructive actions)
* Backup DB (daily `pg_dump` + offsite copy)
* Monitor `/health` + future metrics endpoint

Docker & deployment automation are tracked in the roadmap.

---
## Troubleshooting (Operator Focus)

Symptom | Cause | Resolution
------- | ----- | ----------
`permission denied for table ...` | Missing grants | Run grants via setup or `npm run db:grant`
`column "stack_user_id" does not exist` | Drift / stale DB | Run migrations; ensure DB not pre-created without baseline
Auth user not appearing in users table | Linking point not hit yet | Visit `/admin` or `/setup`, or POST `/api/auth/link`

More dev-focused debugging: see `DEVELOPMENT.md`.

---
## Roadmap Snapshot

Near-term: voucher lifecycle → device heartbeat → portal bridge → health/metrics → RADIUS integration.

Full roadmap & ADRs: `DEVELOPMENT.md`.

---
## License

TBD. (Consider AGPL for network-use copyleft or MIT for permissive adoption.)

---
## Contributing

Open issues / PRs welcome. For coding standards, migrations, and roadmap details see `DEVELOPMENT.md`.

---
_For architecture, testing strategy, and extended roadmap consult `DEVELOPMENT.md`._

---
## High-Level Architecture

Component | Responsibility
--------- | -------------
Next.js App | Admin dashboard, API endpoints, voucher creation, device credit ingestion
PostgreSQL | Persistent data (plans, vouchers, devices, users, audit trail)
FreeRADIUS (recommended) | Authentication + accounting (radcheck/radacct) – to be integrated
hostapd | Runs the wireless access point (AP)
dnsmasq | DHCP + DNS redirect to captive portal
Firewall (nftables) | Enforces network isolation until authorization
Device (ESP32 etc.) | Reports coin insertions / displays vouchers

---
## Project Plan (Living Document)

Updated: (see git history for timestamp) – This section is the canonical planning reference for other contributors/agents.

### Phase Overview & Status

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| P1 Core Data & Vouchers | DB schema (users, plans, vouchers, devices, audit_logs) + basic voucher generation | COMPLETE | Drizzle schema & migrations in place |
| P2 Admin Auth & UI (re-ordered earlier) | Auth (Stack Auth), admin pages, audit log, bootstrap | COMPLETE (MVP) | Setup flow just added (`/setup`) |
| P3 Captive Portal MVP | Voucher redeem public page & API | IN PROGRESS | Basic redeem UI & enriched API done; styling/rate limit pending |
| P4 Voucher Lifecycle & UX | Proper statuses, expiry, redemption UX improvements | NOT STARTED | Next immediate priority |
| P5 Device Integration Enhancements | Device API key mgmt, heartbeat, credit flows | PARTIAL | Device table exists; more endpoints needed |
| P6 RADIUS / Network Bridge | Sync vouchers to RADIUS or gateway | NOT STARTED | Design pending |
| P7 Observability & Monitoring | Metrics, log viewer, health checks | NOT STARTED | |
| P8 Payments (Optional) | Stripe/local wallet integration | BACKLOG | |
| P9 Bandwidth / QoS (Optional) | Enforce plan speeds | BACKLOG | Likely via RADIUS attributes |

### Current State Snapshot
Implemented:
- Stack Auth integration with server & client providers
- Local user mapping & role (admin/operator)
- First-run bootstrap & setup flow (`/` redirects to `/setup` until an admin exists, promote via `/api/admin/promote-first`)
- Admin protected layout (`/admin`) + pages: plans, vouchers, audit log
- Voucher bulk creation API + validation
- Plan schema & listing
- Device schema (API key hash storage) – limited API coverage
- Audit logging service & DB table
- Rate limiting middleware (Redis capable)
- Logger service (file/console placeholder)
- Database privilege grant script (`npm run db:grant`)
- Tailwind CSS v4 & simplified PostCSS config
 - Global Navbar with account menu (login/signup/logout, links to admin & redeem)
 - Voucher redemption page (`/redeem`) with success/error UI and plan details

Not yet implemented (or only partially):
- Captive portal voucher redemption UI page
- Voucher lifecycle enrichment (redeemedAt, automatic expiry transitions)
- Device API endpoints (create, rotate key, list, heartbeat) UI forms
- RADIUS/gateway integration layer
- Observability: health endpoint, metrics, structured log viewer
- Automated tests beyond initial rate limit test
- Dockerfile + deployment automation
- Background jobs (voucher expiration, session sweeper)

### Guiding Principles
1. Business logic & persistence isolated from network enforcement.
2. Idempotent admin bootstrap & safe recovery endpoints.
3. Minimal privileges DB role for runtime; migrations use owner.
4. Small, composable services (auth mapping, audit, vouchers) with clear boundaries.
5. Progressive enhancement: start simple, layer in RADIUS + QoS later.

### Code Map (Key Files)
| Area | Path | Notes |
|------|------|-------|
| App Entry Layout | `app/layout.tsx` | Stack provider wrapping all pages |
| Home / Bootstrap Redirect | `app/page.tsx` | Redirects to `/setup` if no admin |
| Setup Flow | `app/setup/page.tsx`, `app/setup/PromoteButton.tsx` | Promote first authenticated user |
| Admin Layout | `app/admin/layout.tsx` | Auth guard & nav |
| Plans Page | `app/admin/plans/page.tsx` | Listing (editing pending) |
| Vouchers Page | `app/admin/vouchers/page.tsx` | Listing (gen UI pending) |
| Audit Page | `app/admin/audit/page.tsx` | Audit log viewer (basic) |
| Voucher APIs | `app/api/vouchers/route.ts`, `app/api/vouchers/redeem/route.ts` | Bulk create + redeem (redeem logic minimal) |
| Admin Bootstrap APIs | `app/api/admin/promote-first/route.ts`, others | Recovery & bootstrap endpoints |
| Auth Mapping | `src/server/services/authMapping.ts` | Stack user → local user + admin check |
| Voucher Service | `src/server/services/voucher.ts` | (Assumed present for generation) |
| Audit Service | `src/server/services/audit.ts` | Write audit log entries |
| Rate Limiter | `src/server/middleware/rateLimit.ts` | Redis/in-memory token bucket |
| AuthZ Middleware | `src/server/middleware/authz.ts` | requireStackUser / requireAdmin wrappers |
| DB Schema | `src/server/db/schema/*.ts` | Drizzle models |
| Bootstrap Check | `src/server/services/bootstrap.ts` | `hasAdminUser()` used by setup redirect |
| Stack Auth Config | `stack/server.ts`, `stack/client.tsx` | Token store cookie mode |
| Grant Script | `scripts/grantPrivileges.mjs` | DB privileges alignment |

### Initial Setup Flow
1. Visit `/` → if no admin exists, redirect to `/setup`.
2. User signs up/in via Stack Auth hosted routes (`/stack-auth/...`).
3. `/setup` shows Promote button → POST `/api/admin/promote-first` (idempotent) → user becomes admin.
4. Subsequent visits to `/` display dashboard landing; `/setup` now redirects to admin.

### Immediate Next Objectives (Actionable)
| ID | Task | Rationale | Acceptance Criteria |
|----|------|-----------|---------------------|
| V1 | Voucher Redemption Page | Enable end-user flow | (DONE) Public page with form; success/error states; displays plan info |
| V2 | Voucher Lifecycle Fields | Enforce business rules | Add `redeemedAt`; derive status transitions; migration added |
| V3 | Voucher Expiry Job | Prevent stale use | Background (route-triggered or cron) sets `expired` where past `expiresAt` |
| D1 | Device Create + Rotate | Manage hardware securely | API + UI to create device, show one-time API key, rotate key |
| D2 | Device Heartbeat | Operational visibility | Endpoint updates `lastSeenAt`; simple dashboard indicator |
| A1 | Admin Forms (Plans/Vouchers) | Usability | Plan create/edit form; voucher generation UI with quantity + plan select |
| R1 | RADIUS Integration Design Doc | Foundation for network control | Markdown doc with table mapping voucher → radcheck attributes |
| O1 | Health Endpoint | Ops readiness | `/api/health` returns status of DB + (optional) Redis |
| T1 | Tests: Voucher Generation | Prevent collisions | Unit test ensures uniqueness + length constraints |

### Backlog (Ordered by Likely Value)
1. Metrics endpoint (Prometheus format) – active vouchers, recent redemptions, device heartbeats
2. Structured audit viewer filters (by action, date range, user)
3. Session tracking table (if not relying solely on radacct)
4. WebSocket/SSE push for live voucher/device updates
5. Payment integration (Stripe webhooks → auto voucher issue)
6. Bandwidth shaping (map plan speeds to RADIUS `Rate-Limit` or tc classes)
7. Multi-tenant/team support (namespacing data) – optional
8. Dark/light mode toggle for admin UI

### Architectural Decisions (ADR Snapshot)
| Decision | Status | Reason |
|----------|--------|--------|
| Use Stack Auth vs custom auth | Accepted | Faster secure bootstrap, delegated complexity |
| Drizzle ORM over Prisma | Accepted | Lightweight, SQL clarity, migration control |
| Two DB roles (owner/app) | Accepted | Principle of least privilege |
| First-run setup redirect | Implemented | Reduce manual bootstrap friction |
| Redis optional for rate limit | Accepted | Allow stateless dev without mandatory Redis |

### Security Posture (Current)

### Testing Strategy (Planned)
Tier | Description | Examples
---- | ----------- | --------
Unit | Pure logic (voucher code gen, rate limit math) | Deterministic tests, fast
Integration | API handlers with test DB | Redeem voucher flow, admin promote idempotence
E2E (optional later) | Browser-based portal/admin flows | Playwright script across setup → admin

### Deployment (Future Section Placeholder)
Will add Dockerfile + docker-compose including:
 Environment variables in `.env` (pick one style):

 Style A (direct URLs):
 ```
 MIGRATION_DATABASE_URL=postgres://vendowifi_owner:Owner123!@localhost:5432/vendowifi
 DATABASE_URL=postgres://vendowifi_app:App123!@localhost:5432/vendowifi
 ```

 Style B (component variables – synthesized automatically if URLs absent):
 ```
 DB_HOST=localhost
 DB_PORT=5432
 DB_NAME=vendowifi
 DB_OWNER_USER=vendowifi_owner
 DB_OWNER_PASSWORD=Owner123!
 DB_APP_USER=vendowifi_app
 DB_APP_PASSWORD=App123!
 ```

 If `MIGRATION_DATABASE_URL` / `DATABASE_URL` are missing, the project builds them from the component variables. The app connects with the app URL; migrations prefer the owner URL.
1. Update this README plan after implementing or materially changing scope.
2. Prefer adding ADR note when making architectural shifts.
3. Keep migrations atomic & idempotent; never edit applied migrations—add a new one.
4. Provide a short summary in PR/commit referencing Task IDs (e.g. V1, D1).

### Changelog (Human-Curated)
| Date | Change |
|------|--------|
| (Today) | Added navbar + account menu, voucher redeem page (V1), enriched redeem API with plan data |
| (Earlier) | Added setup bootstrap flow (`/setup`) & updated plan sections |
| (Earlier) | Introduced Stack Auth integration, admin layout/pages, voucher bulk API, audit logging, rate limiting |

---
## (Legacy) Original High-Level Architecture
The below remains for context and will be pruned once network layer integration solidifies.

---
## Database & Drizzle

Generate migrations (after editing schema):

```bash
npm run db:generate
```

Apply migrations:

```bash
npm run db:migrate
```

If you already created tables manually (or the database predates migration files) and encounter missing columns (e.g. `column "stack_user_id" does not exist`), apply the baseline SQL in `drizzle/0000_init.sql` once using psql or your DB client, then regenerate (`npm run db:generate`) so future diffs build on a consistent base. Avoid editing an applied migration; add a new one if schema changes.

Open Drizzle Studio (GUI):

```bash
npm run db:studio
```

Environment variables: copy `.env.example` → `.env` and adjust values (especially `DATABASE_URL`).

---
## Initial Entities

Entity | Purpose
------ | -------
User | Admin/operator accounts
Plan | Defines duration, (optional) data cap, price, speed
Voucher | Redeemable codes tied to a Plan
Device | Physical coin/credit device with API key
AuditLog | Trace admin + system actions

Upcoming: Session table (if augmenting radacct) & Payment records.

---
## Recommended Host Machine Setup (Linux Dual-NIC)

Assumptions:
- NIC1 (uplink): `eth0`
- NIC2 (AP bridge + WiFi): `br0` bridging `wlan0` (+ optional LAN port)
- Local subnet for hotspot: `10.20.0.0/24`

1. Install dependencies:
	- `apt install postgresql redis-server hostapd dnsmasq nftables git nodejs npm` (adjust Node.js via Nodesource if needed)
2. Disable auto-start hostapd & dnsmasq until configured (`systemctl disable --now hostapd dnsmasq`).
3. Configure bridge + static IP for `br0`.
4. hostapd config (`/etc/hostapd/hostapd.conf`) with SSID + WPA2 passphrase.
5. dnsmasq config to hand out DHCP in `10.20.0.0/24` and wildcard DNS to captive portal IP.
6. nftables rules: default drop outbound from hotspot unless authorized (later driven by RADIUS / chilli OR nft set membership).
7. Install FreeRADIUS (`apt install freeradius` + SQL module) – configure to use the same PostgreSQL (with least-privilege user) if using shared schema extension.
8. Deploy this app (systemd service or Docker) accessible at `http://10.20.0.1` for portal and at admin domain (optional reverse proxy with TLS for remote administration).
9. Add periodic backup: `pg_dump` + config files.

---
## Git Repository Initialization

From project root:

```bash
git init
git add .
git commit -m "chore: initial scaffold with drizzle schema"
git branch -M main
git remote add origin <YOUR_GIT_REMOTE_URL>
git push -u origin main
```

---
## Roadmap: RADIUS Integration (Preview)

1. Extend schema with a `radius_users` view or directly insert into `radcheck` on voucher creation.
2. Map Plan → RADIUS attributes (Session-Timeout, Max-Daily-Session, Rate-Limit, etc.).
3. Implement accounting poller reading `radacct` for live session list.
4. Expire vouchers: job checks for `expiresAt < now()` and sets status to `expired`.

---
## Development Quick Start

1. Copy env: `cp .env.example .env` (or on Windows `copy .env.example .env`).
2. Start PostgreSQL locally (Docker example):
	```bash
	docker run --name vendowifi-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vendowifi -p 5432:5432 -d postgres:16
	```
3. Run migrations: `npm run db:generate && npm run db:migrate`.
4. Start dev server: `npm run dev` → visit `http://localhost:3000`.

### Tailwind / PostCSS (v4) Setup

This project uses Tailwind CSS v4 with the official unified PostCSS plugin.

Current config (`postcss.config.js`):

```js
module.exports = { plugins: ['@tailwindcss/postcss'] };
```

Do NOT add older v3 style plugin chains (`tailwindcss/nesting`, `postcss-import`, etc.) unless you explicitly need them. The v4 plugin already performs the necessary transforms. If you encounter the error:

```
Error: A PostCSS Plugin was passed as a function using require(), but it must be provided as a string.
```

…you most likely reintroduced an outdated configuration shape or duplicate `postcss.config.*` files. Ensure there is only one `postcss.config.js` and it exports a simple object with a `plugins` array of strings.

### Windows Shell Notes

When running one‑liners that contain quotes (e.g. Node `-e` scripts), prefer `cmd /c` or create a small `.mjs` script instead—PowerShell quoting can break complex expressions.

---
## Security Baseline (MVP)

- Use long random API keys for devices; store only bcrypt hashes + pepper.
- Vouchers: 8–12 char upper+digit random, reject brute force with attempt rate limiting (to be added).
- Audit every destructive change (plan/voucher revoke, device disable).
- Principle of least privilege for DB roles (app vs radius). 

### Database Roles & Privileges

Two roles are recommended:

| Role | Purpose | Typical Permissions |
|------|---------|---------------------|
| `vendowifi_owner` | Runs migrations / grants | ALL on schema objects |
| `vendowifi_app`   | Application runtime      | SELECT/INSERT/UPDATE on data tables only |

Environment variables in `.env`:

```
MIGRATION_DATABASE_URL=postgres://vendowifi_owner:Owner123!@localhost:5432/vendowifi
DATABASE_URL=postgres://vendowifi_app:App123!@localhost:5432/vendowifi
```

The app connects with `DATABASE_URL`, while `drizzle-kit` (migrations) prefers `MIGRATION_DATABASE_URL` when present.

### Grant Script

If you see `permission denied for table audit_logs`, run:

```bash
npm run db:grant
```

This executes `scripts/grantPrivileges.mjs`, which:

1. Infers the app role from `DATABASE_URL`.
2. Grants `SELECT, INSERT, UPDATE` on key tables (`users, plans, vouchers, devices, audit_logs`).
3. Grants sequence usage.

If you want audit logs to be append‑only, you can manually REVOKE UPDATE:

```sql
REVOKE UPDATE ON TABLE audit_logs FROM vendowifi_app;
```

Consider codifying grants in a migration for reproducibility in production.

### Hardening Ideas (Future)

- Move audit inserts into a stored procedure owned by `vendowifi_owner` and grant EXECUTE only.
- Create a read‑only reporting role (`vendowifi_ro`) with `SELECT` only.

---
## Contributing / Extending

Planned upcoming folders (will be added):
```
src/server/api/ (route handlers)
src/server/services/ (voucher generation, device auth)
src/lib/validators/ (zod schemas)
```

---
## License

TBD (consider AGPL if you want network-use copyleft; or MIT for permissive use).

---
## Immediate Focus (Pointer)
Proceed with tasks V1 → V3 (voucher UX & lifecycle) unless operational blockers arise.

---
_This README is the authoritative project plan—update it with every substantive change._

---
## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `permission denied for table audit_logs` | Grants missing for app role | `npm run db:grant` (ensure owner URL set) |
| `A PostCSS Plugin was passed as a function ...` | Wrong PostCSS shape / multiple config files | Keep only `postcss.config.js` with `['@tailwindcss/postcss']` |
| `Event handlers cannot be passed to Client Component props` during prerender | Function prop on a Server Component (e.g. form `onSubmit`) | Remove handler or convert to a Client Component (`"use client"`) |
| Tailwind classes not applying | Wrong plugin config / cached build | Delete duplicate PostCSS configs, re-run build |

---
## Recently Added Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:grant` | Apply minimal table & sequence grants for the application role |

---
## Immediate Next Steps (Suggested Roadmap)

Priority order to keep momentum:

1. Voucher Redemption UX
	- Add success / error state after POST (redeem page redirect with status messages).
	- Rate limit voucher redemption attempts.
2. Voucher Lifecycle & Validation
	- Add `redeemedAt`, `expiresAt`, and automatic status transitions (`active`, `redeemed`, `expired`, `revoked`).
	- Background cleanup (cron or scheduled route) to expire old vouchers.
3. Device Security
	- Rotate / revoke device API keys; add `lastSeenAt` updates in credit endpoint.
	- Enforce per-device rate limiting.
4. RADIUS Integration (Phase P5)
	- Mirror voucher → radcheck entries with `Cleartext-Password` or `User-Password` attributes.
	- On redemption, provision temporary credentials (or mark voucher consumed and enable MAC / user).
5. Observability
	- Extend audit logging with IP & user agent.
	- Add a lightweight `/health` endpoint (DB + Redis checks).
6. Tests
	- Add unit tests for voucher generation uniqueness and redemption logic.
	- Integration test for rate limiting (in‑memory fallback and Redis path).
7. Security Hardening
	- Enforce HTTPS in production; set `secure` cookies.
	- Add CSRF token for POST forms (portal & admin) or switch to `POST` + header token for fetch calls.
8. Deployment Automation
	- Provide Dockerfile + docker-compose for app + Postgres + Redis.
	- Create systemd service example.
9. Performance
	- Enable HTTP response caching for static portal assets.
	- Add DB indices for frequent queries (e.g. `vouchers.code`, `devices.api_key_hash`).

Feel free to ask and we can implement any of these next.
