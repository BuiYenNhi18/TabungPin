'use client';

import { Loader2, WifiOff, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface FeedEvent {
  id: string;
  type: string;
  amount?: string;
  from?: string;
  to?: string;
  asset_type?: string;
  asset_code?: string;
  created_at?: string;
}

interface Props {
  account: string;
  userId: string;
}

// Demo simulated events for when Horizon returns no events
const DEMO_EVENTS: FeedEvent[] = [
  {
    id: '1',
    type: 'payment',
    amount: '1.406250',
    asset_code: 'USDC',
    from: 'GCGOJEK...DRIVER',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'payment',
    amount: '1.937500',
    asset_code: 'USDC',
    from: 'GCGOJEK...MERCHANT',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'payment',
    amount: '1.156250',
    asset_code: 'USDC',
    from: 'GCGOJEK...DRIVER',
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'payment',
    amount: '2.812500',
    asset_code: 'USDC',
    from: 'GCGOSEND...PARCEL',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'payment',
    amount: '2.062500',
    asset_code: 'USDC',
    from: 'GCGOFOOD...REST',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

function calcRoundUp(amount: string): string {
  try {
    // Parse amount (e.g., "1.406250") to 6-decimal units
    const [whole, frac = ''] = amount.split('.');
    const fracPadded = frac.padEnd(6, '0').slice(0, 6);
    const bigVal = BigInt(whole) * 1_000_000n + BigInt(fracPadded);
    const remainder = bigVal % 1_000_000n;
    if (remainder === 0n) return '0';
    const roundUp = 1_000_000n - remainder;
    // Convert to IDR: 1 USDC = 16,000 IDR, roundUp is in 6-decimal units
    const idr = (roundUp * 16_000n) / 1_000_000n;
    return `Rp ${idr.toLocaleString('id-ID')}`;
  } catch {
    return '';
  }
}

export function SsePaymentFeed({ account, userId }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>(DEMO_EVENTS);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!account) {
      setStatus('disconnected');
      setEvents(DEMO_EVENTS);
      return;
    }

    const url = `/api/horizon/stream?account=${encodeURIComponent(account)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus('connected');

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as FeedEvent & { type: string };
        if (data.type === 'connected') {
          setStatus('connected');
        } else if (data.type === 'payment') {
          setEvents((prev) => [
            {
              id: String(Date.now()),
              type: 'payment',
              amount: data.amount,
              asset_code: data.asset_code ?? 'USDC',
              from: data.from,
              created_at: new Date().toISOString(),
            },
            ...prev.slice(0, 9),
          ]);
        }
      } catch {
        // ignore parse error
      }
    };

    es.onerror = () => {
      setStatus('disconnected');
      // Fall back to demo data
      setEvents(DEMO_EVENTS);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [account]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-orange-100">
        <span className="text-xs font-body text-gray-500">
          Stellar Horizon Testnet · Manual SSE
        </span>
        <div className="flex items-center gap-1.5">
          {status === 'connecting' && (
            <>
              <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
              <span className="text-xs text-orange-500">Menghubungkan...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-heading">Live</span>
            </>
          )}
          {status === 'disconnected' && (
            <>
              <WifiOff className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Demo mode</span>
            </>
          )}
        </div>
      </div>

      {/* Event list */}
      <div className="divide-y divide-orange-50 max-h-72 overflow-y-auto">
        {events.length === 0 && (
          <div className="p-6 text-center text-gray-400 font-body text-sm">
            Menunggu transaksi...
          </div>
        )}
        {events.map((evt) => (
          <div
            key={evt.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-heading font-semibold text-sm text-gray-900">
                  {evt.amount ?? '?'} {evt.asset_code ?? 'USDC'}
                </span>
                {evt.amount && (
                  <span className="text-xs font-body text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                    +{calcRoundUp(evt.amount)} round-up
                  </span>
                )}
              </div>
              <div className="text-xs font-body text-gray-400 truncate">
                {evt.from ? `dari ${evt.from}` : 'pembayaran Gojek'} ·{' '}
                {evt.created_at ? timeAgo(evt.created_at) : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
