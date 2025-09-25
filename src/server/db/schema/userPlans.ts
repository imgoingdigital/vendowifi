import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { plans } from './plans';

export const userPlans = pgTable('user_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(()=>users.id),
  planId: uuid('plan_id').notNull().references(()=>plans.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('user_plans_user_idx').on(t.userId),
  planIdx: index('user_plans_plan_idx').on(t.planId),
}));
