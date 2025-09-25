// Central list of editable environment variable keys (server-safe, no 'use client').
export const EDITABLE_ENV_KEYS = [
  // DB (component)
  'DB_HOST','DB_PORT','DB_NAME','DB_OWNER_USER','DB_OWNER_PASSWORD','DB_APP_USER','DB_APP_PASSWORD',
  // DB (direct URLs)
  'MIGRATION_DATABASE_URL','DATABASE_URL',
  // Auth
  'NEXT_PUBLIC_STACK_PROJECT_ID','NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY','STACK_SECRET_SERVER_KEY',
  // Secrets / recovery
  'BACKDOOR_RESET_SECRET','CONFIG_RESET_SECRET',
  // Optional infra
  'REDIS_URL'
] as const;

export type EditableEnvKey = typeof EDITABLE_ENV_KEYS[number];
