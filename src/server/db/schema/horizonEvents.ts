import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const horizonEvents = pgTable('horizon_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  txHash: text('tx_hash').notNull(),
  eventType: text('event_type').notNull(),
  amount: text('amount').notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type HorizonEvent = typeof horizonEvents.$inferSelect;
export type NewHorizonEvent = typeof horizonEvents.$inferInsert;
