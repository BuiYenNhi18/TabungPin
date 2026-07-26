import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const vaultPositions = pgTable('vault_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  depositedUsdc: text('deposited_usdc').notNull().default('0'),
  apyBps: integer('apy_bps').notNull().default(850),
  currentValue: text('current_value').notNull().default('0'),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

export type VaultPosition = typeof vaultPositions.$inferSelect;
export type NewVaultPosition = typeof vaultPositions.$inferInsert;
