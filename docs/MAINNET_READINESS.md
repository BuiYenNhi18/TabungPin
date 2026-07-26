# Mainnet readiness

## Intended contract state

This app intends to batch weekly round-ups into a DeFindex/Soroban vault after explicit wallet approval. A tally should become confirmed/deposited only after a real signed transaction is submitted and verified.

## Current evidence

- Stellar SDK, Horizon configuration, and testnet/public USDC issuer settings exist.
- `src/server/service/savings.service.ts` changes tally and vault rows in Postgres without a chain confirmation; the vault address and XDR are explicitly simulated/mock values.
- The app and seed script insert synthetic Horizon transaction identifiers; the UI also has demo fallback events.
- No Soroban/DeFindex contract source, build artifact, deployment manifest, verified vault/contract IDs, or verified mainnet transaction evidence is present in this copy.

## Missing IDs and artifacts

- DeFindex vault and share-contract deployment IDs: missing.
- Mainnet asset/strategy configuration and verified wallet-signing/submission flow: missing.
- Horizon event correlation and reconciliation for deposits/redemptions: missing.

## Manual gates

1. Replace mock XDR and DB-only confirmation with wallet signing, submission, confirmation, and event verification.
2. Verify vault/share contract IDs, asset issuer, strategy, permissions, and withdrawal behavior.
3. Test duplicate approvals, stale tallies, failed submissions, partial fills, and reconciliation.
4. Keep demo seed/API paths disabled on public network until those controls pass review.

Mainnet deposit confirmation is fail-closed in this copy; the demo seed is testnet-only.
