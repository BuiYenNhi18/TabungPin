# Contract flow

`create_batch` records the owner, batch identifier, and intended amount.
`deposit_batch` moves XLM into contract custody. `approve_batch` records the
user's review decision. `withdraw_batch` closes an approved batch.

The contract rejects approval before deposit, duplicate identifiers, invalid
states, and unauthorized callers. Amounts are represented in stroops.
