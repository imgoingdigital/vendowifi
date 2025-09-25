## VendoWiFi Development & Roadmap

This document contains architecture details, roadmap phases, design principles, and contributor guidance. The main `README.md` is now a concise usage + setup guide.

---
## High-Level Architecture

Component | Responsibility
--------- | -------------
Next.js App | Admin dashboard, API endpoints, voucher creation, device events
PostgreSQL | Persistent data (plans, vouchers, devices, users, audit trail)
Redis (optional) | Rate limiting / caching (future)
FreeRADIUS / Gateway (future) | Network access enforcement
hostapd + dnsmasq + firewall | Underlay OS services (out-of-scope for this repo)

Guiding Principles:
1. Business logic separated from network enforcement
2. Idempotent bootstrap & safe recovery
3. Least-privilege DB runtime role
4. Incremental feature layering (small PRs, additive migrations)
5. Clear auditability of administrative actions

---
## Current Phase Summary

| Phase | Focus | Status | Notes |
|-------|-------|--------|-------|
| P1 Core Data & Vouchers | Schema (users, plans, vouchers, devices, audit_logs) | COMPLETE | Drizzle migrations baseline |
| P2 Auth & Admin Shell | Stack Auth integration + setup flow | COMPLETE | Local role mapping added |
| P3 Portal MVP | Public redeem UI & API | PARTIAL | Needs lifecycle + styling pass |
| P4 Voucher Lifecycle | Status transitions / expiry | PENDING | Next immediate dev target |
| P5 Device Integration | Key mgmt, heartbeat | PARTIAL | API endpoints pending |
| P6 RADIUS Bridge | Voucher → NAS control | PLANNED | Design stage |
| P7 Observability | Health, metrics, log filters | PLANNED | |
| P8 Optional Payments | Stripe / local wallet | BACKLOG | |

---
## Expanded Forward Roadmap (Condensed)

Phase | Theme | Key Items
----- | ----- | ---------
P10 | Voucher & Session Maturity | redeemedAt, revoke/expire transitions, expiry job
P11 | Device Hardening | Heartbeat endpoint, rotate/revoke key, device events
P12 | Captive Portal Bridge | Splash, voucher form, session table, firewall integration doc
P13 | RADIUS Integration | Plan→attributes mapping, radacct reconciliation
P14 | Observability | /health, metrics (Prometheus), audit filters, dashboard cards
P15 | Security Hardening | Last-admin guard, CSRF strategy, granular operator permissions
P16 | Testing Maturity | Unit + integration + E2E harness, CI pipeline
P17 | Deployment & Packaging | Docker, compose, versioning, backups
P18+ | Monetization, Analytics, Multi-tenant, QoS, Plugin system

Stretch / Future (outline only): Offline resilience, multi-tenancy, compliance, plugin hooks, advanced QoS.

---
## Database & Migrations

Commands:
```
npm run db:generate   # generate SQL from schema
npm run db:migrate    # apply migrations
npm run db:grant      # re-apply minimal grants (owner role required)
```

Two-role pattern:
| Role | Purpose |
|------|---------|
| owner | Migrations & grants |
| app | Runtime SELECT/INSERT/UPDATE |

Never edit applied migration files; create a new one. If drift is detected (e.g. missing `stack_user_id`), add an idempotent corrective migration.

---
## Auth & Local User Mapping

Stack user → local `users` row linking happens on visiting setup/admin or via `/api/auth/link`. First local user becomes admin; subsequent new users become operator by default.

Key files:
* `src/server/auth/linkUser.ts`
* `src/server/services/authMapping.ts`

---
## Services Overview

Service | File | Purpose
------- | ---- | -------
Audit | `src/server/services/audit.ts` | Append audit entries
Auth Mapping | `src/server/services/authMapping.ts` | Link stack user → local user
Bootstrap | `src/server/services/bootstrap.ts` | Detect if admin exists
Database Client | `src/server/db/client.ts` | Drizzle + connection synth logic
Setup Actions | `app/setup/actions.ts` | Provision, migrate, grant, bootstrap flows

---
## Testing Strategy (Planned)

Tier | Examples
---- | --------
Unit | Voucher code generation, rate limit math
Integration | Redeem flow, promote-first idempotence, device heartbeat
E2E | Setup → plan → voucher → redeem (Playwright)

Add a `tests/` directory with isolated test DB (schema per worker or transaction rollbacks) once P10 starts.

---
## Security Baseline

Area | Current | Planned Hardening
-----|---------|------------------
DB Privileges | Separate owner/app roles | Add read-only/reporting role
Secrets | Manual env management | Rotation UI later
Audit | Basic table & writer | Filter/search, IP & UA capture
Rate Limiting | Middleware stub | Integrate Redis path + stricter budgets
CSRF | Same-site cookie reliance | Token for form POSTs (portal) later

---
## Contributing Workflow

1. Create feature branch (e.g. `feat/voucher-lifecycle`).
2. Add/modify schema → run `npm run db:generate` → review diff.
3. Add new migration file (committed). Do NOT rewrite existing applied SQL.
4. Implement service / API route + minimal tests.
5. Update roadmap table in this file **and** adjust user-facing README if user workflow changes.
6. Squash or conventional commits (`feat:`, `fix:`, `chore:`) for a clean history.

PR Checklist:
- [ ] Migration added (if schema change)
- [ ] Tests (unit/integration) updated/added
- [ ] README & DEVELOPMENT updated (if needed)
- [ ] No type errors (`tsc --noEmit` clean)

---
## ADR Snapshot

Decision | Status | Rationale
-------- | ------ | ---------
Stack Auth | Accepted | Outsource auth complexity
Drizzle | Accepted | Lightweight SQL-first
Two DB Roles | Accepted | Least privilege runtime
Env Component Vars | Accepted | Flexible DB URL synthesis

Add new ADRs in future under `docs/adr/` (not yet created) for major shifts (e.g. RADIUS schema, plugin system).

---
## Deployment (Planned Template)

Will include Dockerfile & docker-compose with Postgres + optional Redis. See main README for current manual steps.

---
## Troubleshooting (Dev Focus)

Symptom | Cause | Fix
------- | ----- | ----
Missing `stack_user_id` | Drifted baseline | Apply safeguard migration & re-run migrate
Permission denied table | Grants not applied | `npm run db:grant`
PostCSS plugin error | Duplicate config / wrong format | Keep single `postcss.config.*` with `['@tailwindcss/postcss']`

---
## Future Enhancements (Backlog Extract)

* Metrics endpoint (Prometheus)
* RADIUS integration layer
* Voucher batch CRUD
* Plugin/event hooks
* Payment integration
* Offline queue & reconciliation

---
_This DEVELOPMENT.md is the authoritative engineering & planning reference. Update it with every substantive architectural or roadmap change._
