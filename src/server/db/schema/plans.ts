import { pgTable, uuid, varchar, integer, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  durationMinutes: integer('duration_minutes'), // nullable for data/unlimited modes
  dataCapMb: integer('data_cap_mb'),
  downKbps: integer('down_kbps'),
  upKbps: integer('up_kbps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archived: boolean('archived').notNull().default(false),
  planMode: varchar('plan_mode', { length: 16 }).notNull().default('TIME_LIMITED'),
}, (table) => ({
  nameIdx: uniqueIndex('plans_name_uq').on(table.name),
}));
