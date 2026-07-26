import { randomUUID } from 'node:crypto';
import { calculateRoundUp, calculateVaultYield } from '@/server/lib/usdc';

export interface DemoUser {
  id: string;
  name: string;
  stellarAddress: string;
  gojekId: string;
  rpBalance: string;
  createdAt: Date;
}

export interface DemoPayment {
  id: string;
  userId: string;
  amountUsdc: string;
  merchant: string;
  paidAt: Date;
  roundUpAmount: string;
}

export interface DemoTally {
  id: string;
  userId: string;
  weekLabel: string;
  totalRoundUp: string;
  status: 'pending' | 'confirmed' | 'deposited';
  createdAt: Date;
  updatedAt: Date;
}

export interface DemoVault {
  id: string;
  userId: string;
  depositedUsdc: string;
  apyBps: number;
  currentValue: string;
  lastUpdated: Date;
}

export interface DemoHorizonEvent {
  id: string;
  userId: string;
  txHash: string;
  eventType: string;
  amount: string;
  createdAt: Date;
}

function getWeekLabel(date = new Date()) {
  const year = date.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const weekNum = Math.ceil(((date.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  return `${year}-W${weekNum.toString().padStart(2, '0')}`;
}

function buildSeed() {
  const now = new Date();
  const user: DemoUser = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Andi Pratama',
    stellarAddress: 'GCANDI7PRATAMA1GOJEK2BANDUNG3STELLAR4TESTNET5APAC6HACKATHON',
    gojekId: 'GJK-BDG-2847',
    rpBalance: '1250000',
    createdAt: new Date(now.getTime() - 7 * 86_400_000),
  };
  const rideAmountsRp = [15000n, 22000n, 18500n, 31000n, 27500n, 14000n, 45000n, 19000n, 33000n, 25000n, 16500n, 38000n];
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
  let totalRoundUp = 0n;
  const payments: DemoPayment[] = rideAmountsRp.map((rpAmount, index) => {
    const amountUsdc = (rpAmount * 1_000_000n) / 16_000n;
    const roundUpAmount = calculateRoundUp(amountUsdc);
    totalRoundUp += roundUpAmount;
    return {
      id: `payment-${String(index + 1).padStart(2, '0')}`,
      userId: user.id,
      amountUsdc: amountUsdc.toString(),
      merchant: merchants[index],
      paidAt: new Date(now.getTime() - (11 - index) * 12 * 3_600_000),
      roundUpAmount: roundUpAmount.toString(),
    };
  });
  const weekLabel = getWeekLabel(now);
  const tally: DemoTally = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: user.id,
    weekLabel,
    totalRoundUp: totalRoundUp.toString(),
    status: 'pending',
    createdAt: new Date(now.getTime() - 3 * 86_400_000),
    updatedAt: now,
  };
  const depositedUsdc = 12_500_000n;
  const vault: DemoVault = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    userId: user.id,
    depositedUsdc: depositedUsdc.toString(),
    apyBps: 850,
    currentValue: (depositedUsdc + calculateVaultYield(depositedUsdc, 850, 14)).toString(),
    lastUpdated: now,
  };
  const horizonEvents: DemoHorizonEvent[] = Array.from({ length: 5 }, (_, index) => ({
    id: `horizon-${index + 1}`,
    userId: user.id,
    txHash: `demo-tabungpin-tx-${index + 1}`,
    eventType: 'payment',
    amount: ((index + 1) * 500_000).toString(),
    createdAt: new Date(now.getTime() - index * 3_600_000),
  }));
  return { users: [user], payments, tallies: [tally], vaults: [vault], horizonEvents };
}

const globalStore = globalThis as typeof globalThis & { __tabungPinDemoStore?: ReturnType<typeof buildSeed> };
export const demoSavingsStore = globalStore.__tabungPinDemoStore ?? buildSeed();
if (!globalStore.__tabungPinDemoStore) globalStore.__tabungPinDemoStore = demoSavingsStore;

export function resetDemoSavingsStore() {
  const fresh = buildSeed();
  demoSavingsStore.users.splice(0, demoSavingsStore.users.length, ...fresh.users);
  demoSavingsStore.payments.splice(0, demoSavingsStore.payments.length, ...fresh.payments);
  demoSavingsStore.tallies.splice(0, demoSavingsStore.tallies.length, ...fresh.tallies);
  demoSavingsStore.vaults.splice(0, demoSavingsStore.vaults.length, ...fresh.vaults);
  demoSavingsStore.horizonEvents.splice(0, demoSavingsStore.horizonEvents.length, ...fresh.horizonEvents);
}

export function createDemoPayment(input: Omit<DemoPayment, 'id'>) {
  const payment = { ...input, id: randomUUID() };
  demoSavingsStore.payments.push(payment);
  return payment;
}
