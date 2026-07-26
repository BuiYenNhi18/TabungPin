/**
 * USDC BigInt utilities — 6 decimal places, 1 USDC = 1_000_000 stroops
 */

export const USDC_DECIMALS = 6;
export const USDC_UNIT = 1_000_000n;

// IDR/USDC exchange rate (1 USDC ≈ 16,000 IDR)
export const IDR_PER_USDC = 16_000n;

/**
 * Parse USDC string to bigint (e.g. "1.5" => 1_500_000n)
 */
export function parseUsdc(value: string): bigint {
  const [whole, frac = ''] = value.split('.');
  const fracPadded = frac.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);
  return BigInt(whole) * USDC_UNIT + BigInt(fracPadded);
}

/**
 * Format bigint to USDC string (e.g. 1_500_000n => "1.500000")
 */
export function formatUsdc(amount: bigint): string {
  const whole = amount / USDC_UNIT;
  const frac = amount % USDC_UNIT;
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, '0')}`;
}

/**
 * Format USDC bigint to display string (e.g. 1_500_000n => "1.50")
 */
export function displayUsdc(amount: bigint | string): string {
  const n = typeof amount === 'string' ? BigInt(amount) : amount;
  const whole = n / USDC_UNIT;
  const frac = n % USDC_UNIT;
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').slice(0, 2);
  return `${whole}.${fracStr}`;
}

/**
 * Convert IDR (bigint) to USDC bigint (6-decimal)
 * IDR amounts are in whole rupiah (e.g., 15000 => Rp 15,000)
 */
export function idrToUsdc(idrAmount: bigint): bigint {
  // idrAmount in rupiah, return USDC in 6-decimal units
  return (idrAmount * USDC_UNIT) / IDR_PER_USDC;
}

/**
 * Convert USDC bigint to IDR bigint (whole rupiah)
 */
export function usdcToIdr(usdcAmount: bigint): bigint {
  return (usdcAmount * IDR_PER_USDC) / USDC_UNIT;
}

/**
 * Format IDR amount for display (e.g., 15000n => "Rp 15.000")
 */
export function displayIdr(amount: bigint | string): string {
  const n = typeof amount === 'string' ? BigInt(amount) : amount;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

/**
 * Calculate round-up amount for a USDC payment.
 * Rounds up to the nearest whole USDC unit.
 * e.g., 1_350_000n => round_up = 1_000_000n - (1_350_000n % 1_000_000n) = 650_000n
 * If already a whole USDC, round-up = 0.
 */
export function calculateRoundUp(amountUsdc: bigint): bigint {
  const remainder = amountUsdc % USDC_UNIT;
  if (remainder === 0n) return 0n;
  return USDC_UNIT - remainder;
}

/**
 * Sum array of bigint strings
 */
export function sumBigintStrings(values: string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v), 0n);
}

/**
 * Calculate vault yield: principal * apy_bps / 10000 * days / 365
 * Returns USDC 6-decimal bigint
 */
export function calculateVaultYield(depositedUsdc: bigint, apyBps: number, days: number): bigint {
  // (deposited * apyBps * days) / (10000 * 365)
  return (depositedUsdc * BigInt(apyBps) * BigInt(days)) / (10000n * 365n);
}

/**
 * Calculate annualized yield in IDR
 */
export function annualYieldIdr(depositedUsdc: bigint, apyBps: number): bigint {
  const annualUsdc = (depositedUsdc * BigInt(apyBps)) / 10000n;
  return usdcToIdr(annualUsdc);
}

/**
 * Parse SSE data line from Horizon stream
 * Returns parsed object or null
 */
export function parseHorizonSseData(line: string): Record<string, unknown> | null {
  if (!line.startsWith('data: ')) return null;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr || jsonStr === 'hello') return null;
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Simulate path payment: strict_send from round-up USDC
 * Returns simulated destination amount (with 0.1% fee deducted)
 */
export function simulatePathPayment(sendAmount: bigint): bigint {
  // Deduct 0.1% fee
  return (sendAmount * 999n) / 1000n;
}
