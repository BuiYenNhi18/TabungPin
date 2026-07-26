import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const tallyStatusEnum = pgEnum('tally_status', ['pending', 'confirmed', 'deposited']);

export const savingsTally = pgTable('savings_tally', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  weekLabel: text('week_label').notNull(),
  totalRoundUp: text('total_round_up').notNull().default('0'),
  status: tallyStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type SavingsTally = typeof savingsTally.$inferSelect;
export type NewSavingsTally = typeof savingsTally.$inferInsert;
