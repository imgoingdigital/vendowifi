import { pgTable, uuid, varchar, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

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
