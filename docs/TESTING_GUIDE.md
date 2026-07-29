# Testing guide

```bash
npm test
npm run build
npm run verify:deployment
cargo test --manifest-path contracts/round-up-savings/Cargo.toml
```

The contract suite covers the complete batch lifecycle, approval ordering, and
open-batch cancellation. Mainnet hashes are verified separately.
