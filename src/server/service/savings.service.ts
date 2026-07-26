import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { horizonEvents, payments, savingsTally, users, vaultPositions } from '@/server/db/schema';
import { env } from '@/server/config/env';
import {
  createDemoPayment,
  demoSavingsStore,
  resetDemoSavingsStore,
} from '@/server/demo/savings-store';
import { AppError } from '@/server/lib/http';
import {
  annualYieldIdr,
  calculateRoundUp,
  calculateVaultYield,
  displayIdr,
  displayUsdc,
  formatUsdc,
  usdcToIdr,
} from '@/server/lib/usdc';

const useDemo = env.DEMO_MODE === 'true' && env.STELLAR_NETWORK !== 'public';

export async function getOrCreateUser(stellarAddress: string) {
  if (useDemo) {
    const user = demoSavingsStore.users.find((item) => item.stellarAddress === stellarAddress);
    if (user) return user;
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }
  const existing = await db.query.users.findFirst({
    where: eq(users.stellarAddress, stellarAddress),
  });
  if (existing) return existing;
  throw new AppError('NOT_FOUND', 'User not found', 404);
}

export async function getUserById(userId: string) {
  if (useDemo) {
    const user = demoSavingsStore.users.find((item) => item.id === userId);
    if (user) return user;
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  return user;
}

export async function listUsers() {
  if (useDemo) return [...demoSavingsStore.users].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.query.users.findMany({ orderBy: [desc(users.createdAt)] });
}

export async function getWeekLabel(date = new Date()): Promise<string> {
  const year = date.getFullYear();
  // ISO week number
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

export async function getCurrentTally(userId: string) {
  const weekLabel = await getWeekLabel();
  if (useDemo) {
    return demoSavingsStore.tallies.find(
      (item) => item.userId === userId && item.weekLabel === weekLabel,
    );
  }
  const tally = await db.query.savingsTally.findFirst({
    where: and(eq(savingsTally.userId, userId), eq(savingsTally.weekLabel, weekLabel)),
  });
  return tally;
}

export async function getOrCreateCurrentTally(userId: string) {
  const weekLabel = await getWeekLabel();
  if (useDemo) {
    const existing = demoSavingsStore.tallies.find(
      (item) => item.userId === userId && item.weekLabel === weekLabel,
    );
    if (existing) return existing;
    const created = {
      id: randomUUID(),
      userId,
      weekLabel,
      totalRoundUp: '0',
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoSavingsStore.tallies.push(created);
    return created;
  }
  const existing = await db.query.savingsTally.findFirst({
    where: and(eq(savingsTally.userId, userId), eq(savingsTally.weekLabel, weekLabel)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(savingsTally)
    .values({ userId, weekLabel, totalRoundUp: '0', status: 'pending' })
    .returning();
  return created;
}

export async function getUserPayments(userId: string, limit = 20) {
  if (useDemo) {
    return [...demoSavingsStore.payments]
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .slice(0, limit);
  }
  return db.query.payments.findMany({
    where: eq(payments.userId, userId),
    orderBy: [desc(payments.paidAt)],
    limit,
  });
}

export async function getVaultPosition(userId: string) {
  if (useDemo) return demoSavingsStore.vaults.find((item) => item.userId === userId);
  return db.query.vaultPositions.findFirst({
    where: eq(vaultPositions.userId, userId),
  });
}

export async function addPayment(params: {
  userId: string;
  amountUsdc: bigint;
  merchant: string;
  paidAt?: Date;
}) {
  const { userId, amountUsdc, merchant, paidAt = new Date() } = params;
  const roundUp = calculateRoundUp(amountUsdc);

  if (useDemo) {
    const payment = createDemoPayment({
      userId,
      amountUsdc: amountUsdc.toString(),
      merchant,
      paidAt,
      roundUpAmount: roundUp.toString(),
    });
    if (roundUp > 0n) {
      const tally = await getOrCreateCurrentTally(userId);
      tally.totalRoundUp = (BigInt(tally.totalRoundUp) + roundUp).toString();
      tally.updatedAt = new Date();
    }
    return payment;
  }

  const [payment] = await db
    .insert(payments)
    .values({
      userId,
      amountUsdc: amountUsdc.toString(),
      merchant,
      paidAt,
      roundUpAmount: roundUp.toString(),
    })
    .returning();

  // Add round-up to tally
  if (roundUp > 0n) {
    const tally = await getOrCreateCurrentTally(userId);
    const newTotal = BigInt(tally.totalRoundUp) + roundUp;
    await db
      .update(savingsTally)
      .set({ totalRoundUp: newTotal.toString(), updatedAt: new Date() })
      .where(eq(savingsTally.id, tally.id));
  }

  return payment;
}

export async function confirmDeposit(tallyId: string) {
  if (!useDemo) {
    throw new AppError('CONFLICT', 'Savings deposit requires a real signed transaction and verified vault event', 409);
  }
  if (useDemo) {
    const tally = demoSavingsStore.tallies.find((item) => item.id === tallyId);
    if (!tally) throw new AppError('NOT_FOUND', 'Tally not found', 404);
    if (tally.status !== 'pending') throw new AppError('CONFLICT', 'Tally is not in pending state', 409);
    tally.status = 'deposited';
    tally.updatedAt = new Date();
    const vault = demoSavingsStore.vaults.find((item) => item.userId === tally.userId);
    const amount = BigInt(tally.totalRoundUp);
    if (vault) {
      const deposited = BigInt(vault.depositedUsdc) + amount;
      vault.depositedUsdc = deposited.toString();
      vault.currentValue = (deposited + calculateVaultYield(deposited, vault.apyBps, 14)).toString();
      vault.lastUpdated = new Date();
    }
    return tally;
  }
  const tally = await db.query.savingsTally.findFirst({
    where: eq(savingsTally.id, tallyId),
  });
  if (!tally) throw new AppError('NOT_FOUND', 'Tally not found', 404);
  if (tally.status !== 'pending') {
    throw new AppError('CONFLICT', 'Tally is not in pending state', 409);
  }

  // Update tally to confirmed
  const [updated] = await db
    .update(savingsTally)
    .set({ status: 'confirmed', updatedAt: new Date() })
    .where(eq(savingsTally.id, tallyId))
    .returning();

  // Update vault position
  const vault = await db.query.vaultPositions.findFirst({
    where: eq(vaultPositions.userId, tally.userId),
  });

  const roundUpAmount = BigInt(tally.totalRoundUp);

  if (vault) {
    const newDeposited = BigInt(vault.depositedUsdc) + roundUpAmount;
    const yield14Days = calculateVaultYield(newDeposited, vault.apyBps, 14);
    const newCurrentValue = newDeposited + yield14Days;
    await db
      .update(vaultPositions)
      .set({
        depositedUsdc: newDeposited.toString(),
        currentValue: newCurrentValue.toString(),
        lastUpdated: new Date(),
      })
      .where(eq(vaultPositions.id, vault.id));
  } else {
    const yield14Days = calculateVaultYield(roundUpAmount, 850, 14);
    await db.insert(vaultPositions).values({
      userId: tally.userId,
      depositedUsdc: roundUpAmount.toString(),
      apyBps: 850,
      currentValue: (roundUpAmount + yield14Days).toString(),
    });
  }

  // Mark tally as deposited
  await db
    .update(savingsTally)
    .set({ status: 'deposited', updatedAt: new Date() })
    .where(eq(savingsTally.id, tallyId));

  return updated;
}

export async function getDashboardData(userId: string) {
  if (useDemo) {
    const user = await getUserById(userId);
    const weekLabel = await getWeekLabel();
    const tally = await getCurrentTally(userId);
    const vault = await getVaultPosition(userId);
    const recentPayments = await getUserPayments(userId, 12);
    const horizonEvts = demoSavingsStore.horizonEvents
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
    const totalRoundUp = BigInt(tally?.totalRoundUp ?? '0');
    const depositedUsdc = BigInt(vault?.depositedUsdc ?? '0');
    const currentValue = BigInt(vault?.currentValue ?? '0');
    return {
      user,
      weekLabel,
      tally: tally
        ? {
            ...tally,
            totalRoundUpDisplay: displayUsdc(totalRoundUp),
            totalRoundUpIdr: displayIdr(usdcToIdr(totalRoundUp)),
            totalRoundUpRaw: totalRoundUp.toString(),
          }
        : null,
      vault: vault
        ? {
            ...vault,
            depositedDisplay: displayUsdc(depositedUsdc),
            currentValueDisplay: displayUsdc(currentValue),
            annualYieldIdr: displayIdr(annualYieldIdr(depositedUsdc, vault.apyBps)),
            apyPercent: (vault.apyBps / 100).toFixed(1),
          }
        : null,
      payments: recentPayments.map((payment) => ({
        ...payment,
        amountDisplay: displayUsdc(BigInt(payment.amountUsdc)),
        roundUpDisplay: displayUsdc(BigInt(payment.roundUpAmount)),
        amountIdr: displayIdr(usdcToIdr(BigInt(payment.amountUsdc))),
        roundUpIdr: displayIdr(usdcToIdr(BigInt(payment.roundUpAmount))),
      })),
      horizonEvents: horizonEvts,
    };
  }
  const user = await getUserById(userId);
  const weekLabel = await getWeekLabel();
  const tally = await getCurrentTally(userId);
  const vault = await getVaultPosition(userId);
  const recentPayments = await getUserPayments(userId, 12);
  const horizonEvts = await db.query.horizonEvents.findMany({
    where: eq(horizonEvents.userId, userId),
    orderBy: [desc(horizonEvents.createdAt)],
    limit: 5,
  });

  const totalRoundUp = BigInt(tally?.totalRoundUp ?? '0');
  const totalRoundUpIdr = usdcToIdr(totalRoundUp);
  const depositedUsdc = BigInt(vault?.depositedUsdc ?? '0');
  const currentValue = BigInt(vault?.currentValue ?? '0');
  const annualYield = vault ? annualYieldIdr(depositedUsdc, vault.apyBps) : 0n;

  return {
    user,
    weekLabel,
    tally: tally
      ? {
          ...tally,
          totalRoundUpDisplay: displayUsdc(totalRoundUp),
          totalRoundUpIdr: displayIdr(totalRoundUpIdr),
          totalRoundUpRaw: totalRoundUp.toString(),
        }
      : null,
    vault: vault
      ? {
          ...vault,
          depositedDisplay: displayUsdc(depositedUsdc),
          currentValueDisplay: displayUsdc(currentValue),
          annualYieldIdr: displayIdr(annualYield),
          apyPercent: (vault.apyBps / 100).toFixed(1),
        }
      : null,
    payments: recentPayments.map((p) => ({
      ...p,
      amountDisplay: displayUsdc(BigInt(p.amountUsdc)),
      roundUpDisplay: displayUsdc(BigInt(p.roundUpAmount)),
      amountIdr: displayIdr(usdcToIdr(BigInt(p.amountUsdc))),
      roundUpIdr: displayIdr(usdcToIdr(BigInt(p.roundUpAmount))),
    })),
    horizonEvents: horizonEvts,
  };
}

export async function addHorizonEvent(params: {
  userId: string;
  txHash: string;
  eventType: string;
  amount: string;
}) {
  if (useDemo) {
    const event = { ...params, id: randomUUID(), createdAt: new Date() };
    demoSavingsStore.horizonEvents.push(event);
    return event;
  }
  const [event] = await db.insert(horizonEvents).values(params).returning();
  return event;
}

export async function seedDemoData() {
  if (useDemo) {
    resetDemoSavingsStore();
    const user = demoSavingsStore.users[0];
    const tally = demoSavingsStore.tallies[0];
    return {
      userId: user.id,
      stellarAddress: user.stellarAddress,
      paymentsCreated: demoSavingsStore.payments.length,
      totalRoundUpUsdc: formatUsdc(BigInt(tally.totalRoundUp)),
      totalRoundUpIdr: displayIdr(usdcToIdr(BigInt(tally.totalRoundUp))),
      weekLabel: tally.weekLabel,
    };
  }
  // Andi Pratama — Gojek driver, Bandung, Indonesia
  const STELLAR_ADDRESS = 'GCANDI7PRATAMA1GOJEK2BANDUNG3STELLAR4TESTNET5APAC6HACKATHON';

  // Clear existing data
  await db.delete(horizonEvents);
  await db.delete(savingsTally);
  await db.delete(vaultPositions);
  await db.delete(payments);
  await db.delete(users);

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

  const weekLabel = await getWeekLabel();

  // 12 Gojek rides this week (Rp 15,000 – 45,000 each converted to USDC)
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

  let totalRoundUp = 0n;
  const merchants = [
    'GoFood - Nasi Padang Sederhana',
    'GoRide - Antar ke Mall Paris Van Java',
    'GoFood - Bakso Pak Ahmad',
    'GoSend - Kirim Barang',
    'GoRide - Antar ke Stasiun Hall',
    'GoFood - Kopi Kenangan',
    'GoRide - Antar ke BTC Fashion Mall',
    'GoFood - Indomie Goreng Spesial',
    'GoCar - Perjalanan Bisnis',
    'GoFood - Es Teh Indonesia',
    'GoRide - Antar ke Universitas Padjadjaran',
    'GoFood - Ayam Geprek Bensu',
  ];

  const now = new Date();
  for (let i = 0; i < rideAmountsRp.length; i++) {
    const rpAmount = rideAmountsRp[i];
    // 1 USDC = 16,000 IDR, USDC has 6 decimals
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
  }

  // Create tally for this week
  await db.insert(savingsTally).values({
    userId: user.id,
    weekLabel,
    totalRoundUp: totalRoundUp.toString(),
    status: 'pending',
  });

  // Vault position: 12.50 USDC deposited, 8.5% APY
  const depositedUsdc = 12_500_000n; // 12.50 USDC
  const yield14Days = calculateVaultYield(depositedUsdc, 850, 14);
  await db.insert(vaultPositions).values({
    userId: user.id,
    depositedUsdc: depositedUsdc.toString(),
    apyBps: 850,
    currentValue: (depositedUsdc + yield14Days).toString(),
  });

  // Horizon events (simulated)
  const txHashes = [
    'abc123def456ghi789jkl012',
    'mno345pqr678stu901vwx234',
    'yz567abc890def123ghi456j',
    'kl789mno012pqr345stu678v',
    'wx901yza234bcd567efg890h',
  ];
  for (let i = 0; i < 5; i++) {
    await db.insert(horizonEvents).values({
      userId: user.id,
      txHash: txHashes[i],
      eventType: 'payment',
      amount: ((i + 1) * 500_000).toString(),
    });
  }

  return {
    userId: user.id,
    stellarAddress: STELLAR_ADDRESS,
    paymentsCreated: rideAmountsRp.length,
    totalRoundUpUsdc: formatUsdc(totalRoundUp),
    totalRoundUpIdr: displayIdr(usdcToIdr(totalRoundUp)),
    weekLabel,
  };
}

export async function buildBatchXdr(userId: string) {
  const user = await getUserById(userId);
  const tally = await getCurrentTally(userId);
  if (!tally || BigInt(tally.totalRoundUp) === 0n) {
    throw new AppError('CONFLICT', 'No pending round-up to deposit', 409);
  }

  const amountUsdc = formatUsdc(BigInt(tally.totalRoundUp));

  // DeFindex vault address (simulated)
  const VAULT_ADDRESS = 'GBDEFINDEX7VAULT1SIMULATED2STELLAR3TESTNET4APAC5HACKATHON';

  let xdr: string;
  try {
    const { buildBatchDepositXdr } = await import('@/server/lib/stellar');
    xdr = buildBatchDepositXdr({
      sourceAccount: user.stellarAddress,
      vaultAddress: VAULT_ADDRESS,
      amountUsdc,
    });
  } catch {
    const { generateMockXdr } = await import('@/server/lib/stellar');
    xdr = generateMockXdr(user.stellarAddress, amountUsdc);
  }

  return {
    xdr,
    sourceAccount: user.stellarAddress,
    vaultAddress: VAULT_ADDRESS,
    amountUsdc,
    amountIdr: displayIdr(usdcToIdr(BigInt(tally.totalRoundUp))),
    tallyId: tally.id,
    weekLabel: tally.weekLabel,
  };
}
