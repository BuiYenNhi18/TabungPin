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

This repository is in hackathon readiness hardening. Mock XDR and simulated settlement are disabled on public network configuration. No mainnet deployment is claimed.

See [`docs/MAINNET_READINESS.md`](docs/MAINNET_READINESS.md).

## Local demo

Use disposable testnet accounts, configure local environment variables, and follow `package.json` scripts. Keep all signer secrets outside Git.

## Mainnet gate

Mainnet requires a deployed contract, reviewed batch manifest, wallet signatures, exact Horizon/Soroban reconciliation, expiry handling, and idempotency.
