import { pgTable, serial, text, timestamp, integer, boolean, varchar, uuid, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 190 }).notNull(),
  passwordHash: varchar('password_hash', { length: 100 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().default('admin'), // admin | operator
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_uq').on(table.email),
}));

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull(),
  dataCapMb: integer('data_cap_mb'), // nullable means unlimited
  downKbps: integer('down_kbps'),
  upKbps: integer('up_kbps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archived: boolean('archived').notNull().default(false),
}, (table) => ({
  nameIdx: uniqueIndex('plans_name_uq').on(table.name),
}));

export const vouchers = pgTable('vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 16 }).notNull(),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: varchar('status', { length: 20 }).notNull().default('unused'), // unused|active|expired|revoked
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  codeIdx: uniqueIndex('vouchers_code_uq').on(table.code),
  statusIdx: index('vouchers_status_idx').on(table.status),
}));

export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  apiKeyHash: varchar('api_key_hash', { length: 120 }).notNull(),
  location: varchar('location', { length: 200 }),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  active: boolean('active').notNull().default(true),
}, (table) => ({
  nameIdx: uniqueIndex('devices_name_uq').on(table.name),
}));

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 80 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: varchar('target_id', { length: 50 }),
  meta: text('meta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  actionIdx: index('audit_action_idx').on(table.action),
}));

// Helper raw SQL (example): speed attributes mapping for future RADIUS integration could be stored in another table.
export const sessionTableNote = sql`-- You may later add a 'sessions' table referencing voucher and capturing MAC/IP.`;
