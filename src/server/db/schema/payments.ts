import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  amountUsdc: text('amount_usdc').notNull(),
  merchant: text('merchant').notNull(),
  paidAt: timestamp('paid_at').notNull().defaultNow(),
  roundUpAmount: text('round_up_amount').notNull().default('0'),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
