import { Asset, Networks } from '@stellar/stellar-sdk';
import { env, USDC_ISSUER } from '@/server/config/env';

export const HORIZON_URL = env.STELLAR_HORIZON_URL;
export const NETWORK_PASSPHRASE =
  env.STELLAR_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;

export const USDC_ASSET = new Asset(env.USDC_ASSET_CODE, USDC_ISSUER);

/**
 * Build a simulated batch deposit XDR for display purposes.
 * In production: user signs a real transaction with Freighter/wallet.
 * We generate a mock XDR to show the user what they're approving.
 */
export function buildBatchDepositXdr(params: {
  sourceAccount: string;
  vaultAddress: string;
  amountUsdc: string;
}): string {
  return generateMockXdr(params.sourceAccount, params.amountUsdc);
}

/**
 * Generate a deterministic mock XDR string for display purposes
 */
export function generateMockXdr(sourceAccount: string, amountUsdc: string): string {
  // Encode a readable mock XDR-like string
  const data = Buffer.from(
    JSON.stringify({
      type: 'BATCH_DEPOSIT',
      source: sourceAccount,
      amount: amountUsdc,
      asset: `USDC:${USDC_ISSUER}`,
      network: env.STELLAR_NETWORK,
    }),
  ).toString('base64');
  return data;
}

/**
 * Manual Horizon SSE fetch using ReadableStream (pitfall #9 — NOT sdk.stream())
 * Returns an async generator of parsed event objects
 */
export async function* streamHorizonPayments(
  accountId: string,
  signal?: AbortSignal,
): AsyncGenerator<Record<string, unknown>> {
  const url = `${HORIZON_URL}/accounts/${accountId}/payments?cursor=now&limit=10`;
  const res = await fetch(url, {
    headers: { Accept: 'text/event-stream' },
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Horizon SSE failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr && jsonStr !== 'hello') {
            try {
              const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
              yield parsed;
            } catch {
              // skip malformed
            }
          }
        }
      }
    }
  }
}

/**
 * Fetch recent payments from Horizon (non-streaming, for initial load)
 */
export async function fetchRecentPayments(
  accountId: string,
  limit = 5,
): Promise<Record<string, unknown>[]> {
  const url = `${HORIZON_URL}/accounts/${accountId}/payments?order=desc&limit=${limit}`;
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      _embedded?: { records?: Record<string, unknown>[] };
    };
    return data._embedded?.records ?? [];
  } catch {
    return [];
  }
}
