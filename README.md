# DraftChain

DraftChain is a research prototype for tamper-evident provenance of collaborative research manuscripts. It records content hashes, revision order, submitting wallets, and voluntary contributor attestations on an EVM-compatible blockchain. Manuscript text stays off-chain.

## Research question

Can a permissioned, hash-linked revision ledger improve the verifiability of manuscript history and contribution claims, and what transaction-cost and workflow trade-offs does it introduce compared with a conventional version-control workflow?

Possible paper title: **DraftChain: Evaluating Blockchain-Based Provenance for Collaborative Research Manuscripts**

Research questions:

1. Can a reviewer detect altered content or a broken revision history using only the published hashes and receipts?
2. What are the latency and transaction-cost overheads for project creation, revision commits, and contribution attestations?
3. How do authors assess the usability and privacy trade-offs compared with a Git-based workflow?

## Prototype design

- A project is identified by an opaque ID and a salted title commitment, not a plaintext title.
- Only project members can commit revisions or attest to contributions; the project owner manages membership.
- Each revision links to the current content hash. A stale parent hash is rejected, preventing silent forks in the canonical history.
- A contribution attestation is an on-chain claim by the wallet owner, not proof that the person performed the work or a substitute for a formal authorship process.
- The contract stores no manuscript content. Keep the mapping from a manuscript to its hash private when that mapping could reveal sensitive work.

The prototype does not implement content storage, identity verification, token incentives, or production deployment. Blockchain immutability also means public-chain addresses and activity may be linkable; use a local chain for experiments unless participants have consented to public-chain publication.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm test
npm run benchmark
```

Tests run against Hardhat's local in-memory EVM. No wallet, external RPC endpoint, or blockchain funds are needed.

`npm run benchmark` replays the same synthetic revisions through the local contract and a temporary Git repository. It writes raw samples and summary statistics to `benchmark-results.json`. The EVM timing is local process/RPC time, not public-chain transaction latency or a production gas-fee estimate.

## Suggested evaluation

Compare DraftChain with a Git-based baseline using identical scripted revision histories. Measure transaction count, gas used, commit latency, and the ability to detect altered content, omitted revisions, and stale-parent submissions. For a human study, recruit consenting participants, use fictional manuscript text and test wallets, and compare task completion time and perceived usability. Report the chain configuration, compiler version, and workload; do not treat self-attested contributions as verified authorship.