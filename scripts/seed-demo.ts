/**
 * Seed demo data for TabungPin (project 029)
 * Run: pnpm run seed
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/server/db/schema';
import {
  calculateRoundUp,
  calculateVaultYield,
  displayIdr,
  formatUsdc,
  usdcToIdr,
} from '../src/server/lib/usdc';

if (process.env.DEMO_MODE !== 'true' || process.env.STELLAR_NETWORK === 'public') {
  throw new Error('seed-demo requires DEMO_MODE=true and a non-mainnet STELLAR_NETWORK');
}

const { users, payments, savingsTally, vaultPositions, horizonEvents } = schema;

const DATABASE_URL = process.env.DRIZZLE_DATABASE_URL ?? '';
if (!DATABASE_URL) {
  console.error('DRIZZLE_DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

function getWeekLabel(date = new Date()): string {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

async function main() {
  console.log('Seeding TabungPin demo data...');

  // Andi Pratama — Gojek driver, Bandung, Indonesia
  const STELLAR_ADDRESS = 'GCANDI7PRATAMA1GOJEK2BANDUNG3STELLAR4TESTNET5APAC6HACKATHON';

  // Clear existing
  await db.delete(horizonEvents);
  await db.delete(savingsTally);
  await db.delete(vaultPositions);
  await db.delete(payments);
  await db.delete(users);

  console.log('Cleared existing data');

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      name: 'Andi Pratama',
      stellarAddress: STELLAR_ADDRESS,
      gojekId: 'GJK-BDG-2847',
      rpBalance: '1250000',
    })
    .returning();

  console.log(`Created user: ${user.name} (${user.id})`);

  const weekLabel = getWeekLabel();

  // 12 Gojek rides (Rp 15,000–45,000)
  const rideAmountsRp = [
    15000n,
    22000n,
    18500n,
    31000n,
    27500n,
    14000n,
    45000n,
    19000n,
    33000n,
    25000n,
    16500n,
    38000n,
  ];

  const merchants = [
    'GoFood - Nasi Padang Sederhana',
    'GoRide - Antar ke Mall Paris Van Java',
    'GoFood - Bakso Pak Ahmad',
    'GoSend - Kirim Barang Elektronik',
    'GoRide - Antar ke Stasiun Hall',
    'GoFood - Kopi Kenangan Bandung',
    'GoRide - Antar ke BTC Fashion Mall',
    'GoFood - Indomie Goreng Spesial',
    'GoCar - Perjalanan ke Meeting Bisnis',
    'GoFood - Es Teh Indonesia',
    'GoRide - Antar ke Unpad Jatinangor',
    'GoFood - Ayam Geprek Bensu',
  ];

  let totalRoundUp = 0n;
  const now = new Date();

  for (let i = 0; i < rideAmountsRp.length; i++) {
    const rpAmount = rideAmountsRp[i];
    // Convert Rp to USDC (1 USDC = Rp 16,000), in 6-decimal units
    const usdcAmount = (rpAmount * 1_000_000n) / 16_000n;
    const roundUp = calculateRoundUp(usdcAmount);
    totalRoundUp += roundUp;

    const paidAt = new Date(now.getTime() - (11 - i) * 12 * 60 * 60 * 1000);
    await db.insert(payments).values({
      userId: user.id,
      amountUsdc: usdcAmount.toString(),
      merchant: merchants[i],
      paidAt,
      roundUpAmount: roundUp.toString(),
    });

    const amountDisplay = formatUsdc(usdcAmount);
    const roundUpIdr = usdcToIdr(roundUp);
    console.log(
      `  Payment ${i + 1}: ${merchants[i].split(' - ')[0]} · ${amountDisplay} USDC · +${displayIdr(roundUpIdr)} round-up`,
    );
  }

  console.log(
    `\nTotal round-up: ${formatUsdc(totalRoundUp)} USDC = ${displayIdr(usdcToIdr(totalRoundUp))}`,
  );

  // Create tally
  await db.insert(savingsTally).values({
    userId: user.id,
    weekLabel,
    totalRoundUp: totalRoundUp.toString(),
    status: 'pending',
  });

  console.log(`Created tally for ${weekLabel}: ${formatUsdc(totalRoundUp)} USDC pending`);

  // Vault position: 12.50 USDC deposited, 8.5% APY
  const depositedUsdc = 12_500_000n;
  const yield14Days = calculateVaultYield(depositedUsdc, 850, 14);
  await db.insert(vaultPositions).values({
    userId: user.id,
    depositedUsdc: depositedUsdc.toString(),
    apyBps: 850,
    currentValue: (depositedUsdc + yield14Days).toString(),
  });

  const annualYield = (depositedUsdc * 850n) / 10000n;
  console.log(
    `Vault: ${formatUsdc(depositedUsdc)} USDC · 8.5% APY · ~${displayIdr(usdcToIdr(annualYield))}/tahun`,
  );

  // Horizon events
  const txHashes = [
    'abc123def456ghi789jkl012mno345pqr',
    'stu678vwx901yza234bcd567efg890hij',
    'klm123nop456qrs789tuv012wxy345zab',
    'cde678fgh901ijk234lmn567opq890rst',
    'uvw123xyz456abc789def012ghi345jkl',
  ];

  for (let i = 0; i < txHashes.length; i++) {
    await db.insert(horizonEvents).values({
      userId: user.id,
      txHash: txHashes[i],
      eventType: 'payment',
      amount: ((i + 1) * 500_000).toString(),
    });
  }

  console.log('\n✅ Seed complete!');
  console.log(`   User: ${user.name}`);
  console.log(`   Stellar: ${STELLAR_ADDRESS}`);
  console.log(`   12 Gojek payments seeded`);
  console.log(
    `   Weekly tally: ${formatUsdc(totalRoundUp)} USDC (${displayIdr(usdcToIdr(totalRoundUp))})`,
  );
  console.log(`   Vault: 12.50 USDC @ 8.5% APY`);

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
