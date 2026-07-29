# Security model

TabungPin does not use a session key with custody authority. Wallet signatures
authorize each mainnet state transition. The contract authenticates the batch
owner and enforces state order.

- private keys remain in Freighter;
- contract and SAC IDs come from a committed manifest;
- each batch ID is unique;
- deposits require an open batch;
- approvals require a deposited batch;
- demo records are never treated as ledger state.
