# TabungPin round-up savings contract

Minimal weekly savings batch contract using native XLM SAC. A saver creates a
batch and deposits XLM; the configured admin explicitly approves it; the saver
can then withdraw the same XLM. This makes the approval boundary visible on
chain without session keys or server custody.

```text
OPEN -> DEPOSITED -> APPROVED -> WITHDRAWN
  |
  v
CANCELLED
```

## Verify locally

```bash
cargo test --manifest-path contracts/round-up-savings/Cargo.toml
PATH="$HOME/.rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH" \
  cargo build --manifest-path contracts/round-up-savings/Cargo.toml \
  --target wasm32v1-none --release
```

The contract stores one native XLM SAC address at initialization. The admin
only approves a deposited batch; no secret key is accepted by the app or CLI.
Deployment evidence is recorded in `deployment.json`.
