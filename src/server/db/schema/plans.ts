import { pgTable, uuid, varchar, integer, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull(),
  dataCapMb: integer('data_cap_mb'),
  downKbps: integer('down_kbps'),
  upKbps: integer('up_kbps'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  archived: boolean('archived').notNull().default(false),
}, (table) => ({
  nameIdx: uniqueIndex('plans_name_uq').on(table.name),
}));
