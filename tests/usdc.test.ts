import { describe, expect, it } from 'vitest';
import {
  annualYieldIdr,
  calculateRoundUp,
  calculateVaultYield,
  displayIdr,
  displayUsdc,
  formatUsdc,
  IDR_PER_USDC,
  idrToUsdc,
  parseHorizonSseData,
  parseUsdc,
  simulatePathPayment,
  sumBigintStrings,
  USDC_UNIT,
  usdcToIdr,
} from '../src/server/lib/usdc';

describe('USDC BigInt utilities', () => {
  // parseUsdc
  it('parseUsdc: whole number', () => {
    expect(parseUsdc('1')).toBe(1_000_000n);
  });

  it('parseUsdc: fractional', () => {
    expect(parseUsdc('1.5')).toBe(1_500_000n);
  });

  it('parseUsdc: 6-decimal precision', () => {
    expect(parseUsdc('0.937500')).toBe(937_500n);
  });

  it('parseUsdc: zero', () => {
    expect(parseUsdc('0')).toBe(0n);
  });

  // formatUsdc
  it('formatUsdc: 1 USDC', () => {
    expect(formatUsdc(1_000_000n)).toBe('1.000000');
  });

  it('formatUsdc: fractional', () => {
    expect(formatUsdc(937_500n)).toBe('0.937500');
  });

  // displayUsdc
  it('displayUsdc: 12.5 USDC', () => {
    expect(displayUsdc(12_500_000n)).toBe('12.50');
  });

  it('displayUsdc: string input', () => {
    expect(displayUsdc('500000')).toBe('0.50');
  });

  // calculateRoundUp — core feature
  it('calculateRoundUp: 1.35 USDC → 0.65 USDC', () => {
    // 1.35 USDC = 1_350_000n, remainder=350_000, roundUp=650_000
    expect(calculateRoundUp(1_350_000n)).toBe(650_000n);
  });

  it('calculateRoundUp: exact whole USDC = 0', () => {
    expect(calculateRoundUp(2_000_000n)).toBe(0n);
  });

  it('calculateRoundUp: 0.9375 USDC → 0.0625 USDC', () => {
    expect(calculateRoundUp(937_500n)).toBe(62_500n);
  });

  it('calculateRoundUp: tiny amount → large round-up', () => {
    // 0.000001 USDC → 0.999999 USDC round-up
    expect(calculateRoundUp(1n)).toBe(999_999n);
  });

  it('calculateRoundUp: zero → zero', () => {
    expect(calculateRoundUp(0n)).toBe(0n);
  });

  // IDR conversion
  it('idrToUsdc: Rp 16,000 = 1 USDC', () => {
    expect(idrToUsdc(16_000n)).toBe(1_000_000n);
  });

  it('idrToUsdc: Rp 15,000 ≈ 0.9375 USDC', () => {
    const result = idrToUsdc(15_000n);
    expect(result).toBe(937_500n);
  });

  it('usdcToIdr: 1 USDC = Rp 16,000', () => {
    expect(usdcToIdr(1_000_000n)).toBe(16_000n);
  });

  it('usdcToIdr: 0.52 USDC ≈ Rp 8,320', () => {
    const result = usdcToIdr(520_000n);
    expect(result).toBe(8_320n);
  });

  // displayIdr
  it('displayIdr: formats with Rp prefix', () => {
    const result = displayIdr(8_400n);
    expect(result).toContain('Rp');
    expect(result).toContain('8.400'); // Indonesian locale uses . as thousand separator
  });

  it('displayIdr: string input', () => {
    expect(displayIdr('0')).toBe('Rp 0');
  });

  // sumBigintStrings
  it('sumBigintStrings: sums correctly', () => {
    expect(sumBigintStrings(['100000', '200000', '300000'])).toBe(600_000n);
  });

  it('sumBigintStrings: empty array = 0', () => {
    expect(sumBigintStrings([])).toBe(0n);
  });

  // calculateVaultYield
  it('calculateVaultYield: 12.5 USDC at 8.5% for 365 days', () => {
    const principal = 12_500_000n;
    const yield1yr = calculateVaultYield(principal, 850, 365);
    // 12.5 * 0.085 = 1.0625 USDC = 1_062_500n
    expect(yield1yr).toBe(1_062_500n);
  });

  it('calculateVaultYield: 14-day yield', () => {
    const principal = 12_500_000n;
    const yield14 = calculateVaultYield(principal, 850, 14);
    expect(yield14).toBeGreaterThan(0n);
    expect(yield14).toBeLessThan(principal / 100n);
  });

  // annualYieldIdr
  it('annualYieldIdr: 12.5 USDC at 8.5% ≈ Rp 17,000/year', () => {
    const principal = 12_500_000n;
    const idrYield = annualYieldIdr(principal, 850);
    // 1.0625 USDC * 16000 = ~17,000 IDR
    expect(idrYield).toBeGreaterThan(10_000n);
    expect(idrYield).toBeLessThan(30_000n);
  });

  // parseHorizonSseData
  it('parseHorizonSseData: valid data line', () => {
    const line = 'data: {"type":"payment","amount":"1.5"}';
    const result = parseHorizonSseData(line);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('payment');
  });

  it('parseHorizonSseData: hello message = null', () => {
    expect(parseHorizonSseData('data: hello')).toBeNull();
  });

  it('parseHorizonSseData: non-data line = null', () => {
    expect(parseHorizonSseData('event: ping')).toBeNull();
  });

  it('parseHorizonSseData: empty data = null', () => {
    expect(parseHorizonSseData('data: ')).toBeNull();
  });

  // simulatePathPayment
  it('simulatePathPayment: deducts 0.1% fee', () => {
    const send = 1_000_000n;
    const received = simulatePathPayment(send);
    expect(received).toBe(999_000n);
  });

  it('simulatePathPayment: small amount', () => {
    const send = 520_000n;
    const received = simulatePathPayment(send);
    expect(received).toBeLessThan(send);
    expect(received).toBeGreaterThan(0n);
  });

  // USDC_UNIT and IDR_PER_USDC constants
  it('USDC_UNIT is 1_000_000n', () => {
    expect(USDC_UNIT).toBe(1_000_000n);
  });

  it('IDR_PER_USDC is 16_000n', () => {
    expect(IDR_PER_USDC).toBe(16_000n);
  });
});
