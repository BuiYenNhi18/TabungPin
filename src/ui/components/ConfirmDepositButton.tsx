'use client';

import { CheckCircle, Loader2, PiggyBank } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  tallyId: string;
  amountIdr: string;
}

export function ConfirmDepositButton({ tallyId, amountIdr }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'signing' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleConfirm() {
    setState('signing');
    // Simulate wallet signing delay
    await new Promise((r) => setTimeout(r, 1200));
    setState('submitting');

    try {
      const res = await fetch('/api/tally/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tallyId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: { message: string } };
      if (!json.ok) throw new Error(json.error?.message ?? 'Konfirmasi gagal');
      setState('done');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  }

  if (state === 'done') {
    return (
      <div className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-heading font-bold py-4 rounded-2xl text-lg">
        <CheckCircle className="w-6 h-6" />
        Berhasil Disetor! Mengarahkan...
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={state !== 'idle'}
        className="w-full flex items-center justify-center gap-3 bg-orange-600 text-white font-heading font-bold py-4 rounded-2xl hover:bg-orange-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-lg shadow-lg"
        data-testid="sign-and-deposit-btn"
      >
        {state === 'idle' && (
          <>
            <PiggyBank className="w-6 h-6" />
            Tandatangani & Setor {amountIdr}
          </>
        )}
        {state === 'signing' && (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Menandatangani dengan wallet...
          </>
        )}
        {state === 'submitting' && (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Mengirim ke Stellar...
          </>
        )}
      </button>
      {state === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-body text-sm text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
