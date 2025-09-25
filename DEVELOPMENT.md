## VendoWiFi Development & Roadmap

---
### IMMEDIATE MICRO TARGETS (Active Sprint Focus)
Ordered list of the next concrete implementation steps. Keep this block updated first.

1. Voucher Lifecycle Refinement
	- Add status 'depleted' (data exhausted) without conflating with 'expired'.
	- Central lifecycle evaluator: time expiry vs data depletion vs revoke.
	- Adjust `/api/usage/increment` to set `depleted` instead of misusing `expired` when data cap reached.
2. Coin Session MVP (Handshake) (session/claim/deposit/cancel endpoints drafted; needs doc + audit + stale sweep reuse)
	- Implement endpoints: POST /api/coin/session, /claim, /deposit, /cancel, GET /api/coin/session/:id
	- Auto-issue voucher when inserted amount >= matching plan `price_cents` (prefer exact match first).
	- Auto-expire stale sessions (>120s) on any session endpoint touch (lazy sweep).
3. Device Heartbeat & Key Rotation (endpoints implemented; add auth & audit hardening next)
	- POST /api/devices/:id/heartbeat updates `last_seen_at`.
	- POST /api/devices/:id/rotate-key returns new plaintext once; store bcrypt hash.
4. Health Endpoint (implemented basic DB check; add Redis ping later)
	- /api/health -> { db: 'ok'|'fail', redis: 'ok'|'disabled', time: iso } (503 on db fail).
5. Test Harness Bootstrap (pending) – add Vitest + two tests
	- Add Jest/Vitest config, unit test for voucher code uniqueness, integration test redeem flow.
6. Documentation Sync (add validation + new statuses + TEST_DATABASE_URL pattern)
	- Update README & this file after lifecycle + coin MVP merged (remove outdated status notes).

Definition of Done (micro block): All above merged + tests green + README reflects depleted vs expired distinction.
---

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
| P3 Portal MVP | Public redeem UI & API | NEAR COMPLETE | Styling pass pending |
| P4 Voucher Lifecycle | Status transitions / expiry | IN PROGRESS | Redeem + revoke + expiry calc added |
| P5 Device Integration | Key mgmt, heartbeat | PARTIAL | API endpoints pending |
| P6 RADIUS Bridge | Voucher → NAS control | PLANNED | Design stage |
| P7 Observability | Health, metrics, log filters | PLANNED | |
| P8 Optional Payments | Stripe / local wallet | BACKLOG | |

---
## Barebone Core Definition (Version 1.0 Target)

Scope: Minimal functional system to issue and redeem vouchers with basic admin control.

Included:
- Plans: create/list (existing listing; simple create UI or API acceptable)
- Vouchers: bulk create, redeem (unused→active with `expiresAt`), revoke
- Lazy + manual expiry sweep (no background scheduler requirement)
- Auth: Stack sign-in, first-user admin promotion
- Admin pages: plans, vouchers (list), audit log (basic)
- Audit logging for voucher/admin actions
- Rate limiting (in-memory fallback) on redeem
- Single `DATABASE_URL` support (component env vars optional)

Excluded (Deferred as Enhancements):
- Device heartbeat & key rotation
- RADIUS / captive portal integration
- Background cron expiry job (beyond lazy/manual)
- Multi-role DB privilege hardening (owner/app separation can remain but is optional)
- Advanced provisioning (ephemeral superuser bootstrap, auto role creation UI)
- Config masking UI polish beyond basic show/hide
- Payments, metrics, health endpoint, QoS, multi-tenant
- Extensive test harness & CI pipeline

Done Criteria:
1. Fresh clone + set `DATABASE_URL` + migrate + dev → can create plan, generate voucher, redeem to active with expiry visible.
2. Admin bootstrap path succeeds (first user becomes admin).
3. Redeem endpoint applies rate limit and updates audit.
4. Manual expiry sweep endpoint can transition expired vouchers.
5. README documents barebone path clearly (no advanced steps required).

Post-1.0 Enhancement Track will move items above into labeled sections.

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

Additional (Coin & Flexible Plans Track):
CX1 | Coin Issuance Handshake | User request ↔ machine claim ↔ coin insert events
CX2 | Data Usage Accounting | Track remaining MB for data-limited non-expiring plans
CX3 | Account-Tied Unlimited Plans | Assign unlimited plan to user/device (revocable)
CX4 | Adaptive Plan Selection | Auto-plan generation based on inserted amount tiers
CX5 | Enhanced QoS Mapping | Plan → dynamic bandwidth shaping (RADIUS / OS firewall integration)

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
## Coin Machine Issuance (Design Draft)

Goal: Allow a physical coin machine to vend access by issuing vouchers (or direct sessions) without requiring the user to type codes manually.

High-Level Flow (Handshake):
1. User opens `/buy` (or `/coin`) page → page requests a new pending session.
2. Server creates `coin_sessions` row: `{ id, userId? (optional/authenticated), status:'requested', machineId:null, requestedAt }` and returns a short `requestCode` (e.g., 5–6 chars).
3. User presses machine button. Machine reads displayed request code (or user types machine ID on page) and calls `POST /api/coin/claim` with `{ machineId, requestCode }`.
4. Server transitions session to `claimed` (stores machineId, startedAt). Page polls or receives SSE/websocket update.
5. Machine counts coins; on each coin insertion it sends `POST /api/coin/deposit` with `{ sessionId, amountCentsIncrement }`.
6. Server accumulates `amountInsertedCents`. Once it matches any defined plan price tier, it either:
	a. Immediately issues a voucher (bulk create code path) tied to the session and returns it; OR
	b. For account-tied unlimited or data-limited plan, directly assigns plan to user/device (no voucher) and logs audit.
7. Page shows voucher code or active access status. Session finalizes (`issued`). Idle timeout (e.g., 2–3 minutes) reaps stale sessions (status `expired`).

Table Proposal: `coin_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| request_code | varchar(8) | Short code for pairing |
| user_id | uuid nullable | Optional (if authenticated) |
| machine_id | varchar(32) | Set upon claim |
| status | enum | requested / claimed / issuing / issued / expired / canceled |
| amount_inserted_cents | integer | Running total |
| plan_id | uuid nullable | Chosen/issued plan |
| voucher_id | uuid nullable | If a voucher is minted |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |
| expires_at | timestamptz | Session timeout |

Endpoints (Draft):
- `POST /api/coin/session` → create pending; returns `{ sessionId, requestCode }`
- `POST /api/coin/claim` → claim by machine
- `POST /api/coin/deposit` → increment amount; may trigger issuance logic
- `POST /api/coin/cancel` → user cancel
- `GET /api/coin/session/:id` → progress polling (or SSE channel)

Security / Integrity:
- Short `requestCode` + server random UUID session ID prevents guessing.
- Machine authenticates with an API key (reuse devices table or extend it) when calling claim/deposit.
- Rate limiting on claim & deposit endpoints to mitigate abuse.

Issuance Modes:
1. Voucher Mode (existing path): generate voucher, present code, user redeems (simplest integration).
2. Direct Activation Mode (future): directly create a session table row / push radius attributes (post-P13).

---
## Flexible Plan Model & QoS

Current Plan Fields:
- `durationMinutes` (time-limited) – always not null today
- `dataCapMb` nullable (null = unlimited data)
- `downKbps`, `upKbps` (bandwidth shaping)

Required Additions:
| Requirement | Approach |
|-------------|----------|
| Unlimited time + limited data | Introduce plan mode OR allow `durationMinutes` nullable; voucher/session stays active until data usage reaches cap. |
| Unlimited time + unlimited data (account-tied) | Assign plan directly to user/device; maintain active mapping table. |
| Data accounting | Add `data_used_mb` (increment) or `remaining_data_mb` on voucher/session; requires usage feed from gateway/RADIUS accounting. |
| QoS enforcement | Map plan speeds to RADIUS attributes (e.g., `WISPr-Bandwidth-Max-Up/Down` or vendor-specific). |
| Differentiation of plan types | Add `plan_mode` enum: `TIME_LIMITED`, `DATA_LIMITED`, `UNLIMITED` (optional; can be derived but explicit improves clarity). |

Proposed Schema Changes (Future Migration):
- Add `plan_mode` varchar(16) default 'TIME_LIMITED'.
- Make `duration_minutes` nullable OR keep not-null but ignore for non-time modes (prefer nullable for semantic clarity).
- Add `account_tied` boolean default false (optional) or a separate user_plan mapping table.
- Add `voucher_data_used_mb integer default 0` to vouchers OR a separate `usage_events` table for later analytics.

Voucher Behavior by Plan Mode:
| Mode | Expiry Condition | Data Condition | Voucher Status Transitions |
|------|------------------|----------------|----------------------------|
| TIME_LIMITED | `now >= activatedAt + duration` | Ignore/track optional | unused→active→expired |
| DATA_LIMITED | Never time-expire | `data_used >= cap` | unused→active→consumed |
| UNLIMITED | Never | None | unused→active→revoked (manual) |

Minimal Initial Implementation Strategy:
1. Add `plan_mode` & nullable `durationMinutes` migration.
2. For DATA_LIMITED vouchers, skip setting `expiresAt`; add `dataUsedMb` column on voucher.
3. Add update endpoint for usage increments (placeholder until real accounting integration).
4. UNLIMITED: link plan to user via new `user_plans` table `{ user_id, plan_id, assigned_at, revoked_at }`; redemption for unlimited vouchers optionally disabled.

QoS Mapping (Preview):
- RADIUS attributes table: mapping plan_id → attribute key/value rows (future P13).
- For local gateway scripts: generate tc (traffic control) class and attach device MAC.

---
## Roadmap Adjustments (Summary)

Short-Term After Core 1.0:
1. CX1 Coin Issuance Handshake (foundational table + simple voucher issuance mode)
2. plan_mode migration + minimal support for DATA_LIMITED (no real accounting yet; manual decrement endpoint)
3. QoS attribute mapping stub (data structure only)
4. CX2 Data Usage Accounting (integrate with RADIUS accounting or gateway usage stats)
5. CX3 Account-Tied Unlimited (user_plans table & admin UI)

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
Voucher Lifecycle | `src/server/services/voucher.ts` | Redeem, revoke, lazy expiry, sweep helper
Expiry Sweep API | `app/api/admin/vouchers/expire-sweep/route.ts` | Manual trigger to expire outdated active vouchers

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

---
## Currency Configuration

Display currency is controlled by `NEXT_PUBLIC_CURRENCY` in `.env`.

Behavior:
* If set, UI labels (e.g. plan price input) show that currency code.
* If unset, default is `PHP`.
* All persisted monetary values remain in integer cents (`price_cents`) decoupled from display currency.

Future auto-detect options (not implemented):
1. GeoIP lookup (MaxMind, ipapi) on first admin visit to suggest default.
2. Store a chosen country in a `settings` table, derive currency via static ISO map.
3. Use browser `Accept-Language` to propose a currency (heuristic only).

When multi-tenant or multi-currency is required, add a `currencies` table and reference per plan or per tenant. For now a single env variable keeps complexity low.
