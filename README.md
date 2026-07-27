# Round-Up Batch Savings

Round-up accounting and reviewed batch savings intents for users who want to save small amounts automatically.

## Public hackathon demo

The Vercel demo runs in `DEMO_MODE` with an in-memory TabungPin dataset: Andi Pratama, 12 Gojek payments, a weekly round-up tally, and a DeFindex-style vault preview at 8.5% APY. This keeps the public demo usable without PostgreSQL, wallet extensions, private keys, or real mainnet funds. The seed resets when the server restarts.

Open the landing page, review the dashboard, then use **Konfirmasi Minggu Ini** to preview and approve the simulated weekly batch deposit. Reference screenshots are included in [`screen-shot/`](screen-shot/).

## Stellar surface

- Soroban vault/policy boundary
- Horizon batch payout preparation
- Human approval and external signing instead of session-key custody

## Readiness status

This repository has a live Soroban contract on Stellar mainnet. The verified deployment
and initialization records are in [`contracts/round-up-savings/deployment.json`](contracts/round-up-savings/deployment.json).
The first functional mainnet call created batch `290291` for `0.1 XLM`; its transaction
is recorded in the same manifest. The public UI remains a lightweight `DEMO_MODE` demo,
while deposit, approval, and withdrawal are deliberately prepared as unsigned XDR for
an external wallet signer.

See [`docs/MAINNET_READINESS.md`](docs/MAINNET_READINESS.md).

## Local demo

Use disposable testnet accounts, configure local environment variables, and follow `package.json` scripts. Keep all signer secrets outside Git.

## Mainnet gate

Mainnet requires a deployed contract, reviewed batch manifest, wallet signatures, exact Horizon/Soroban reconciliation, expiry handling, and idempotency. The deployed contract and
initialization are complete; the next functional actions are `deposit -> approve -> withdraw`.

## Soroban MVP artifact

The minimal Commitment/Vault contract is in [`contracts/vault/`](contracts/vault/).
Run `cargo test --manifest-path contracts/vault/Cargo.toml`. Its deployment
manifest remains `not-deployed` until an external signer completes upload,
deploy and initialize.

## Soroban XLM surface

The minimal contract in `contracts/round-up-savings/` implements
`OPEN -> DEPOSITED -> APPROVED -> WITHDRAWN` with native XLM SAC custody. Run
`cargo test --manifest-path contracts/round-up-savings/Cargo.toml` and use
[`docs/MAD_OPS.md`](docs/MAD_OPS.md) to prepare unsigned XDR. Deployment IDs and
verified mainnet transaction hashes are recorded in
`contracts/round-up-savings/deployment.json`.
