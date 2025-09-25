import { pgTable, uuid, varchar, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { plans } from './plans';
import { vouchers } from './vouchers';

export const coinSessions = pgTable('coin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestCode: varchar('request_code', { length: 8 }).notNull(),
  userId: uuid('user_id').references(()=>users.id),
  machineId: varchar('machine_id', { length: 32 }),
  status: varchar('status', { length: 16 }).notNull().default('requested'),
  amountInsertedCents: integer('amount_inserted_cents').notNull().default(0),
  planId: uuid('plan_id').references(()=>plans.id),
  voucherId: uuid('voucher_id').references(()=>vouchers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (t) => ({
  codeUq: uniqueIndex('coin_sessions_request_code_uq').on(t.requestCode),
  statusIdx: index('coin_sessions_status_idx').on(t.status),
}));
