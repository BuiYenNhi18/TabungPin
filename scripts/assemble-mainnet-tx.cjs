const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  Address,
  nativeToScVal,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
} = require('@stellar/stellar-sdk');

const SOURCE = 'GDCTDB4KL6YHPMDTGVUGVJ7PLEC2CZWUWEHJCOKSX44RWEAGFIBKJAFY';
const ROOT = path.resolve(__dirname, '..');
const WASM_PATH = path.resolve(ROOT, 'contracts/round-up-savings/target/wasm32v1-none/release/tabungpin_round_up_savings_contract.wasm');
const WASM_HASH = crypto.createHash('sha256').update(fs.readFileSync(WASM_PATH)).digest('hex');
const XLM_SAC = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';
const BATCH_ID = 29029n;
const AMOUNT = 1_000_000n;
const SALT = crypto.createHash('sha256').update('029-tabungpin-round-up-savings-v1').digest();

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function outputPath(stage) {
  return path.resolve(ROOT, `contracts/round-up-savings/mainnet-${stage}-assembled.xdr`);
}

async function main() {
  const stage = option('stage');
  const allowed = ['upload', 'deploy', 'initialize', 'create-batch', 'deposit-batch', 'approve-batch', 'withdraw-batch', 'cancel-batch'];
  if (!allowed.includes(stage)) throw new Error(`Usage: node scripts/assemble-mainnet-tx.cjs --stage ${allowed.join('|')} [--contract-id C...]`);

  const server = new rpc.Server('https://soroban-rpc.mainnet.stellar.gateway.fm');
  const account = await server.getAccount(SOURCE);
  const builder = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.PUBLIC });

  if (stage === 'upload') {
    builder.addOperation(Operation.uploadContractWasm({ wasm: fs.readFileSync(WASM_PATH) }));
  } else if (stage === 'deploy') {
    builder.addOperation(Operation.createCustomContract({ address: Address.fromString(SOURCE), wasmHash: Buffer.from(WASM_HASH, 'hex'), salt: SALT }));
  } else {
    const contract = option('contract-id');
    if (!contract) throw new Error(`--contract-id is required for ${stage}`);
    const id = nativeToScVal(BATCH_ID, { type: 'u64' });
    if (stage === 'initialize') {
      builder.addOperation(Operation.invokeContractFunction({ contract, function: 'initialize', args: [Address.fromString(SOURCE).toScVal(), Address.fromString(XLM_SAC).toScVal()] }));
    } else if (stage === 'create-batch') {
      builder.addOperation(Operation.invokeContractFunction({ contract, function: 'create_batch', args: [id, Address.fromString(SOURCE).toScVal(), nativeToScVal(AMOUNT, { type: 'i128' })] }));
    } else {
      const functionName = { 'deposit-batch': 'deposit', 'approve-batch': 'approve', 'withdraw-batch': 'withdraw', 'cancel-batch': 'cancel' }[stage];
      builder.addOperation(Operation.invokeContractFunction({ contract, function: functionName, args: [id] }));
    }
  }

  const raw = builder.setTimeout(86400).build();
  const simulation = await server.simulateTransaction(raw);
  if (simulation.error) throw new Error(simulation.error);
  const assembled = rpc.assembleTransaction(raw, simulation).build();
  const xdr = assembled.toXDR();
  const destination = outputPath(stage);
  fs.writeFileSync(destination, `${xdr}\n`, { mode: 0o600 });
  const retval = stage === 'deploy' ? simulation.result?.retval : null;
  console.log(JSON.stringify({
    stage, outputPath: destination, xdr, hash: assembled.hash().toString('hex'), sequence: assembled.sequence.toString(),
    contractId: retval ? Address.fromScVal(retval).toString() : null, wasmSha256: WASM_HASH,
    minResourceFee: simulation.minResourceFee, latestLedger: simulation.latestLedger,
  }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message || error); process.exitCode = 1; });
