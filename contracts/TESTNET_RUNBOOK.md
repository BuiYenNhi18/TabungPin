# 029 Testnet runbook

1. Build from `contracts/vault/` with `stellar contract build` or Cargo.
2. Upload the WASM and prepare unsigned XDR with the Stellar CLI.
3. Simulate and assemble the upload/deploy/initialize transactions.
4. Sign each XDR in Freighter and submit manually.
5. Update `vault/deployment.json` only with verified hashes and contract ID.

The contract is not deployed by this repository. Never place a secret key in
the project or in a command history.
