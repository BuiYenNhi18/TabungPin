'use client';

import { ArrowRight, CheckCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface Tally {
  id: string;
  weekLabel: string;
  totalRoundUp: string;
  status: 'pending' | 'confirmed' | 'deposited';
}

interface Props {
  tally: Tally | null;
  userId: string;
}

function formatRoundUp(totalRoundUp: string): { usdc: string; idr: string } {
  try {
    const n = BigInt(totalRoundUp);
    const whole = n / 1_000_000n;
    const frac = n % 1_000_000n;
    const usdc = `${whole}.${frac.toString().padStart(6, '0').slice(0, 2)}`;
    const idr = (n * 16_000n) / 1_000_000n;
    return {
      usdc,
      idr: `Rp ${idr.toLocaleString('id-ID')}`,
    };
  } catch {
    return { usdc: '0.00', idr: 'Rp 0' };
  }
}

export function WeeklyTallyPreview({ tally, userId }: Props) {
  if (!tally) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 text-center">
        <div className="text-gray-400 font-body text-sm">
          Belum ada tally minggu ini.{' '}
          <Link href="/dashboard" className="text-orange-600 hover:underline">
            Mulai dari dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { usdc, idr } = formatRoundUp(tally.totalRoundUp);
  const isPending = tally.status === 'pending';
  const isDeposited = tally.status === 'deposited';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-body text-orange-100">Minggu {tally.weekLabel}</span>
          <span
            className={`text-xs font-heading px-2 py-1 rounded-full ${
              isPending
                ? 'bg-yellow-400 text-yellow-900'
                : isDeposited
                  ? 'bg-green-400 text-green-900'
                  : 'bg-blue-400 text-blue-900'
            }`}
          >
            {tally.status === 'pending'
              ? 'Menunggu'
              : tally.status === 'confirmed'
                ? 'Dikonfirmasi'
                : 'Tersimpan'}
          </span>
        </div>
        <div className="font-heading font-bold text-3xl">{idr}</div>
        <div className="text-orange-200 text-sm font-body mt-1">{usdc} USDC terkumpul</div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-center gap-2 text-sm font-body text-gray-600 mb-4">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          Kembalian dari 12 perjalanan Gojek minggu ini
        </div>

        {isPending ? (
          <Link
            href="/confirm"
            className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white font-heading font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors"
            data-testid="confirm-deposit-btn"
          >
            Konfirmasi Setor ke Vault
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-green-600 font-heading font-semibold">
            <CheckCircle className="w-5 h-5" />
            Sudah tersimpan di vault DeFi
          </div>
        )}

        <p className="text-xs font-body text-gray-400 mt-3 text-center">
          1 tanda tangan · tidak ada session key · Stellar testnet
        </p>
      </div>
    </div>
  );
}
