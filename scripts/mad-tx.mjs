#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Address, Networks, Operation, TransactionBuilder, nativeToScVal, rpc } from '@stellar/stellar-sdk';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'contracts/round-up-savings/deployment.json');
const networks = { testnet: { passphrase: Networks.TESTNET, rpcUrl: 'https://soroban-testnet.stellar.org:443' }, mainnet: { passphrase: Networks.PUBLIC, rpcUrl: 'https://soroban-rpc.mainnet.stellar.gateway.fm' } };

function usage() {
  console.log(`TabungPin round-up transaction helper (unsigned only)

Commands:
  node scripts/mad-tx.mjs show
  node scripts/mad-tx.mjs status --network testnet --hash <transaction-hash>
  node scripts/mad-tx.mjs create-batch --network testnet --contract <C...> --source <G...> --id 1 --amount 0.1
  node scripts/mad-tx.mjs deposit-batch --network testnet --contract <C...> --source <G...> --id 1
  node scripts/mad-tx.mjs approve-batch --network testnet --contract <C...> --source <G...> --id 1
  node scripts/mad-tx.mjs withdraw-batch --network testnet --contract <C...> --source <G...> --id 1

The helper never accepts a secret key, signs, or submits a transaction.
`);
}

function inputArgs() {
  const { values, positionals } = parseArgs({ args: process.argv.slice(2), options: { network: { type: 'string', default: 'testnet' }, contract: { type: 'string' }, source: { type: 'string' }, id: { type: 'string' }, amount: { type: 'string' }, hash: { type: 'string' }, out: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: true, strict: true });
  return { command: positionals[0], ...values };
}
function selectedNetwork(name) { if (!networks[name]) throw new Error('--network must be testnet or mainnet'); return { name, ...networks[name] }; }
function publicKey(value) { if (!value || !/^G[A-Z2-7]{55}$/.test(value)) throw new Error('--source must be a Stellar public key (G...)'); return value; }
function contractId(value) { if (!value || !/^C[A-Z2-7]{55}$/.test(value)) throw new Error('--contract must be a Soroban contract ID (C...)'); return value; }
function amount(value) { if (!value || !/^\d+(\.\d{1,7})?$/.test(value)) throw new Error('--amount must be a decimal XLM amount'); const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0')); }
function xlm(stroops) { return (Number(stroops) / 10_000_000).toFixed(7); }
async function writeXdr(xdr, out, command) { const file = out ? path.resolve(process.cwd(), out) : path.join(root, '.mad-ops/xdr', `${Date.now()}-${command}.xdr`); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, `${xdr}\n`, { mode: 0o600 }); return file; }
async function show() { console.log(JSON.stringify({ manifest: JSON.parse(await fs.readFile(manifestPath, 'utf8')), networks }, null, 2)); }
async function status(input) { if (!input.hash) throw new Error('--hash is required'); const selected = selectedNetwork(input.network); const result = await new rpc.Server(selected.rpcUrl).getTransaction(input.hash); console.log(JSON.stringify({ network: selected.name, hash: input.hash, status: result.status, ledger: result.ledger ?? null, feeCharged: result.feeCharged ?? null }, null, 2)); }
async function assemble(input) {
  const selected = selectedNetwork(input.network); const source = publicKey(input.source); const contract = contractId(input.contract); const server = new rpc.Server(selected.rpcUrl); const account = await server.getAccount(source); const id = BigInt(input.id ?? '1');
  const functionName = { 'deposit-batch': 'deposit', 'approve-batch': 'approve', 'withdraw-batch': 'withdraw', 'cancel-batch': 'cancel' }[input.command];
  const args = input.command === 'create-batch' ? [nativeToScVal(id, { type: 'u64' }), Address.fromString(source).toScVal(), nativeToScVal(amount(input.amount ?? '0.1'), { type: 'i128' })] : [nativeToScVal(id, { type: 'u64' })];
  const operation = Operation.invokeContractFunction({ contract, function: input.command === 'create-batch' ? 'create_batch' : functionName, args });
  const raw = new TransactionBuilder(account, { fee: '100', networkPassphrase: selected.passphrase }).addOperation(operation).setTimeout(86_400).build();
  const simulation = await server.simulateTransaction(raw); if (simulation.error) throw new Error(simulation.error);
  const assembled = rpc.assembleTransaction(raw, simulation).build(); const xdrPath = await writeXdr(assembled.toXDR(), input.out, input.command); const minResourceFee = simulation.minResourceFee ?? '0';
  console.log(JSON.stringify({ network: selected.name, action: input.command, contract, sequence: assembled.sequence.toString(), hash: assembled.hash().toString('hex'), minResourceFee, maxFeeXlm: xlm(BigInt(minResourceFee) + 100n), xdrPath, signUrl: 'https://lab.stellar.org/transaction/sign' }, null, 2));
}
async function main() { const input = inputArgs(); if (input.help || !input.command) return usage(); if (input.command === 'show') return show(); if (input.command === 'status') return status(input); return assemble(input); }
main().catch((error) => { console.error(`mad-tx: ${error.message}`); process.exitCode = 1; });
