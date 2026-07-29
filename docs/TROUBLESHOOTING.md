# Troubleshooting

## XDR cannot be parsed

Copy the complete Base64 envelope and ensure the Lab input format is Base64.

## Auto-assembly fails

Prepare an assembled XDR with current simulation data and fresh bounds.

## Transaction is too late

Discard the old envelope and rebuild it.

## Submission says retry later

Check the hash before signing a duplicate.
