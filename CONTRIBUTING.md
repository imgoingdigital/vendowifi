# Contributing to VendoWiFi

Thanks for your interest in improving the project! This document gives you the essentials for submitting changes. For deep architecture / roadmap details see `DEVELOPMENT.md`.

## Quick Start (Dev Environment)
1. Clone & install dependencies:
   ```bash
   git clone <repo-url>
   cd vendowifi
   npm install
   ```
2. Copy `.env.example` → `.env` and configure DB roles (owner + app) OR rely on the setup wizard to provision.
3. Generate & apply migrations (after schema changes):
   ```bash
   npm run db:generate && npm run db:migrate
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```
5. Visit `/setup` to complete bootstrap.

## Branch / Commit Conventions
- Use short, purpose-driven branches: `feat/voucher-lifecycle`, `fix/grant-script`, `chore/docs`.
- Follow Conventional Commit prefixes when possible: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
- Keep commits logically scoped; squash noisy WIP commits before PR if practical.

## Pull Request Checklist
- [ ] Code compiles, no TypeScript errors (`tsc --noEmit` clean)
- [ ] Migration added (if schema changed) – never edit an applied migration
- [ ] Tests added/updated (if logic changed)
- [ ] `README.md` / `DEVELOPMENT.md` updated when user workflow or roadmap changes
- [ ] No secrets committed (check diff for `.env` or API keys)
- [ ] Lint/style consistent with existing code

## Database & Migrations
- Two-role pattern: `owner` (migrations/grants) vs `app` (runtime limited privileges).
- If you need a corrective change (e.g. add a missing column), create a NEW migration (idempotent where safe) instead of editing previous ones.

## Tests (Roadmap)
Until the full test harness is in place, prioritize:
- Deterministic unit tests (voucher code generation uniqueness, role assignment rules)
- Integration tests for critical flows (admin bootstrap, voucher redeem)

## Adding a New Feature (Example Workflow)
1. Open/confirm an issue describing scope & acceptance criteria.
2. Draft schema changes (if any) → generate migration.
3. Implement service logic (pure functions where possible), then the API route, then UI layer.
4. Add audit log entries for meaningful admin actions.
5. Update docs (README for operators, DEVELOPMENT for roadmap/architecture).
6. Open PR referencing issue (e.g. "Closes #42").

## Security / Hardening Guidelines
- Never log secrets (passwords, API keys, tokens).
- Limit new DB privileges to least required.
- Add audit logging for destructive or privilege-changing actions.
- Avoid leaking stack user IDs or internal identifiers in error messages.

## Documentation Structure
- `README.md`: Operator usage & setup.
- `DEVELOPMENT.md`: Architecture, roadmap, contributor guide (extended).
- `CONTRIBUTING.md`: (this file) Quick contribution essentials.

## Questions / Help
Open a GitHub issue with the label `question` or start a discussion (if enabled). For architectural proposals, include rationale & alternatives.

Happy hacking! 🚀
