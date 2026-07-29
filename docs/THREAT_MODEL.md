# Threat model

| Threat | Control |
|---|---|
| Wrong network | Display and enforce Stellar Mainnet |
| Contract substitution | Pin the manifest contract ID |
| Duplicate batch | Contract uniqueness check |
| Approval without deposit | Contract state transition guard |
| Unauthorized withdrawal | Owner authentication |
| Stale transaction | Time bounds and fresh simulation |

Reject wallet prompts that differ from the reviewed batch summary.
