# Operations runbook

1. Check the public Vercel app.
2. Check that the Mainnet contract instance is available.
3. Run unit tests, contract tests, build, and manifest verification.
4. Compare the latest recorded transaction with a public explorer.
5. Confirm no local environment or secret file is staged.

For failures record the public key, batch ID, function, hash, and RPC error.
