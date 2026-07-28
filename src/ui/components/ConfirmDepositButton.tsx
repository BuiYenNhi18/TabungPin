'use client';

import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import {
  Address,
  Networks,
  nativeToScVal,
  Operation,
  rpc,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { CheckCircle, Copy, ExternalLink, Loader2, PiggyBank, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';

const CONTRACT_ID = 'CCQZSEKMARQROHCEXTTM7KKAVCXENSJZ7U2MX3GET77TGK3UQBCKOH6R';
const MAINNET_RPC_URL = 'https://mainnet.sorobanrpc.com';
const MAINNET_PASSPHRASE = Networks.PUBLIC;
const DEFAULT_AMOUNT_XLM = '0.1';

interface Props {
  tallyId: string;
  amountIdr: string;
}

export function ConfirmDepositButton(_props: Props) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [amountXlm, setAmountXlm] = useState(DEFAULT_AMOUNT_XLM);
  const [xdr, setXdr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'building' | 'signing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const { isConnected: available } = await isConnected();
        if (!available) return;
        const { address } = await getAddress();
        if (address) setPublicKey(address);
      } catch {
        // The connect button provides the recovery path when Freighter is locked.
      }
    })();
  }, []);

  async function connect() {
    try {
      const { address } = await requestAccess();
      if (!address) throw new Error('Freighter did not return a public key');
      setPublicKey(address);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan');
    }
  }

  function amountToStroops(value: string): bigint {
    if (!/^\d+(\.\d{1,7})?$/.test(value)) throw new Error('Masukkan jumlah XLM yang valid');
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
  }

  async function prepare() {
    if (!publicKey) return connect();
    setState('building');
    setErrorMsg('');
    setXdr(null);
    setTxHash(null);
    try {
      const server = new rpc.Server(MAINNET_RPC_URL);
      const account = await server.getAccount(publicKey);
      const batchId = BigInt(Math.floor(Date.now() / 1000));
      const raw = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: MAINNET_PASSPHRASE,
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: 'create_batch',
            args: [
              nativeToScVal(batchId, { type: 'u64' }),
              Address.fromString(publicKey).toScVal(),
              nativeToScVal(amountToStroops(amountXlm), { type: 'i128' }),
            ],
          }),
        )
        .setTimeout(86_400)
        .build();
      const simulation = await server.simulateTransaction(raw);
      if ('error' in simulation && simulation.error) throw new Error(simulation.error);
      const assembled = rpc.assembleTransaction(raw, simulation).build();
      setXdr(assembled.toXDR());
      setTxHash(assembled.hash().toString('hex'));
      setState('idle');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Tidak dapat membuat XDR mainnet');
    }
  }

  async function sign() {
    if (!xdr || !publicKey) return;
    setState('signing');
    setErrorMsg('');
    try {
      const { networkPassphrase } = await getNetworkDetails();
      if (networkPassphrase !== MAINNET_PASSPHRASE) {
        throw new Error('Set Freighter ke Stellar Mainnet sebelum menandatangani.');
      }
      const result = await signTransaction(xdr, {
        address: publicKey,
        networkPassphrase: MAINNET_PASSPHRASE,
      });
      if (result.error) throw new Error(String(result.error));
      const signed = TransactionBuilder.fromXDR(result.signedTxXdr, MAINNET_PASSPHRASE);
      setTxHash(signed.hash().toString('hex'));
      setState('done');
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Freighter signing failed');
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-gray-900">Mainnet contract action</h3>
            <p className="text-xs text-gray-500">
              Round-up Savings · create_batch · unsigned until you sign
            </p>
          </div>
          {publicKey ? (
            <span className="font-mono text-xs text-green-700">
              {publicKey.slice(0, 8)}…{publicKey.slice(-6)}
            </span>
          ) : null}
        </div>
        <div className="mb-3 flex gap-2">
          <input
            value={amountXlm}
            onChange={(event) => setAmountXlm(event.target.value)}
            inputMode="decimal"
            aria-label="Mainnet XLM amount"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="self-center text-sm text-gray-500">XLM</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={connect}
            className="inline-flex items-center gap-2 rounded-lg border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
          >
            <Wallet className="h-4 w-4" /> {publicKey ? 'Wallet connected' : 'Connect Freighter'}
          </button>
          <button
            type="button"
            onClick={() => void prepare()}
            disabled={!publicKey || state === 'building'}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {state === 'building' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PiggyBank className="h-4 w-4" />
            )}
            Build mainnet XDR
          </button>
          {xdr ? (
            <button
              type="button"
              onClick={() => void sign()}
              disabled={state === 'signing'}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" /> Sign in Freighter
            </button>
          ) : null}
        </div>
        {xdr ? (
          <div className="mt-4 rounded-lg bg-gray-900 p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
              <span>Unsigned XDR ready</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(xdr)}
                className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <code className="block max-h-24 overflow-auto break-all text-[10px] text-green-300">
              {xdr}
            </code>
          </div>
        ) : null}
        {state === 'done' && txHash ? (
          <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle className="h-4 w-4" /> Signed successfully (not submitted)
            </div>
            <code className="mt-1 block break-all text-xs">Hash: {txHash}</code>
            <a
              className="mt-1 inline-flex items-center gap-1 text-xs underline"
              href={`https://stellar.expert/explorer/public/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              Open explorer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
        {txHash && state !== 'done' ? (
          <p className="mt-3 break-all text-xs text-gray-500">
            Unsigned transaction hash: {txHash}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-gray-500">
          The existing demo tally remains separate from this native-XLM mainnet contract action. No
          transaction is broadcast by the app.
        </p>
      </div>
      {state === 'error' && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-body text-sm text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
