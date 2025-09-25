import { pgTable, uuid, varchar, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { plans } from './plans';
import { users } from './users';

export const vouchers = pgTable('vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 16 }).notNull(),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: varchar('status', { length: 20 }).notNull().default('unused'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  codeIdx: uniqueIndex('vouchers_code_uq').on(table.code),
  statusIdx: index('vouchers_status_idx').on(table.status),
}));
