import { pgTable, serial, uuid, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { plans } from './plans';

export const planRadiusAttributes = pgTable('plan_radius_attributes', {
  id: serial('id').primaryKey(),
  planId: uuid('plan_id').notNull().references(()=>plans.id, { onDelete: 'cascade' }),
  attr: varchar('attr', { length: 64 }).notNull(),
  value: varchar('value', { length: 128 }).notNull(),
}, (t) => ({
  planIdx: index('plan_radius_attr_plan_idx').on(t.planId),
  planAttrUq: uniqueIndex('plan_attr_uq').on(t.planId, t.attr),
}));
