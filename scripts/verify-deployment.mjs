import { readFile } from 'node:fs/promises';

const manifestUrl = new URL('../contracts/round-up-savings/deployment.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const mainnet = manifest.mainnet;
const isContract = (value) => typeof value === 'string' && /^C[A-Z2-7]{55}$/.test(value);
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

if (manifest.projectId !== '029') throw new Error('Unexpected project ID');
if (!isContract(mainnet.contractId)) throw new Error('Invalid mainnet contract ID');
if (!isHash(mainnet.wasmUploadTxHash)) throw new Error('Invalid upload hash');
if (!isHash(mainnet.deploymentTxHash)) throw new Error('Invalid deployment hash');
if (!isHash(mainnet.initializeTxHash)) throw new Error('Invalid initialize hash');
for (const [name, hash] of Object.entries(mainnet.functionalTxHashes ?? {})) {
  if (!isHash(hash)) throw new Error(`Invalid ${name} transaction hash`);
}

console.log(`TabungPin deployment manifest verified: ${mainnet.contractId}`);
