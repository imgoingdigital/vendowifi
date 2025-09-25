# Auth Migration & Admin Recovery

This document explains the Stack Auth migration work and recovery endpoints.

## Removal of Legacy JWT Auth
- Removed files: `src/server/services/auth.ts`, `app/api/auth/login`, `app/api/auth/logout`.
- All authentication now relies on Stack Auth cookie token store via `stackServerApp`.

## Local User Mapping
- Added `stackUserId` column to `users` table (migration `0001_add_stack_user_id.sql`).
- `ensureLocalUserForStack()` creates or links a local user row for a Stack user.

## Authorization Middleware
- `requireStackUser()` ensures a Stack session exists and materializes a local row.
- `requireAdmin()` enforces local `users.role === 'admin'`.

## Secured Endpoints
- Plan creation, voucher generation, device list/create, and admin layout now require admin.

## Admin & Config Recovery Endpoints
All guarded by secrets in headers; remove or disable in production builds.

1. `POST /api/admin/promote-first`
   - Promotes earliest user to admin if none exist.
   - Idempotent.

2. `POST /api/admin/backdoor`
   - Header: `X-ADMIN-RESET: <BACKDOOR_RESET_SECRET>`
   - Resets system to have exactly one admin (creates or updates specified email).
   - Only runs if there are currently <= 1 admins.

3. `POST /api/admin/reset-config`
   - Header: `X-CONFIG-RESET: <CONFIG_RESET_SECRET>`
   - Inserts default plans if missing.

## Environment Variables
Add to `.env` (choose strong random values):
```
BACKDOOR_RESET_SECRET=replace_me_strong
CONFIG_RESET_SECRET=replace_me_strong
```

## Hardening Recommendations
- Wrap backdoor routes in build flag: only include in non-production deployments.
- Add rate limiting & audit logging for recovery routes.
- After initial production bootstrap, remove `backdoor` route or rotate secret.

## Next Steps
- Implement UI for admin role management.
- Add explicit `isAnonymous` check if anonymous signup permitted.
- Add audit logging to recovery endpoints.

## Rate Limiting Overview
The in-memory `rateLimit(key, { windowMs, max })` helper tracks a counter per key:
- `windowMs`: duration of the rolling window in milliseconds.
- `max`: maximum allowed calls within that window. On the first call it sets `count=1`.
Return value fields:
- `allowed`: boolean indicating if request is under limit.
- `remaining`: how many calls left before blocking (not including current one).
- `reset`: epoch ms when the bucket resets.

This is process-local only; use Redis or another shared store for multi-instance deployments.
