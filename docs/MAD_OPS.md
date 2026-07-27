# 029 MAD Ops runbook

The helper prepares unsigned XDR only.

```bash
node scripts/mad-tx.mjs show
node scripts/mad-tx.mjs create-batch --network testnet --contract <C...> --source <saver-G...> --id 1 --amount 0.1
node scripts/mad-tx.mjs deposit-batch --network testnet --contract <C...> --source <saver-G...> --id 1
node scripts/mad-tx.mjs approve-batch --network testnet --contract <C...> --source <admin-G...> --id 1
node scripts/mad-tx.mjs withdraw-batch --network testnet --contract <C...> --source <saver-G...> --id 1
node scripts/mad-tx.mjs status --network testnet --hash <hash>
```

Each command must be signed by the role shown in the command. Inspect the
generated XDR in Stellar Lab/Freighter and confirm the network and contract
before signing. The manifest remains `not-deployed` until a signed deployment
is verified.
