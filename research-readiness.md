# DraftChain Research Readiness

Assessment date: 2026-10-04

## Verification and preliminary benchmark

Command: `npm test`

Result: 6 passing, 0 failing on Hardhat's local in-memory EVM. Full captured output is in [test-results.txt](test-results.txt).

The tests cover project creation and membership, revision linking, stale-parent rejection, member access control, one-time contribution attestations, and owner-only member addition.

Command: `npm run benchmark`

The reproducible script used Node.js 24.21.0, Git 2.55.0, Hardhat chain ID 31337, 20 synthetic revisions per run, 5 sequential runs, and 4 contributor wallets. It produced 100 revision commits, 100 attestations, 100 Git commits, and 5 project-creation samples. Full raw samples and environment metadata are in [benchmark-results.json](benchmark-results.json).

| Operation | Samples | Mean gas | Mean local elapsed time | Median | P95 |
|---|---:|---:|---:|---:|---:|
| Project creation | 5 | 198,329.2 | 19.29 ms | 3.50 ms | 69.09 ms |
| Revision commit | 100 | 109,143.6 | 2.42 ms | 1.79 ms | 4.91 ms |
| Contribution attestation | 100 | 76,190 | 2.15 ms | 1.68 ms | 4.55 ms |
| Git revision commit | 100 | Not applicable | 16.04 ms | 14.42 ms | 23.20 ms |

These are repeated local measurements, but not a controlled performance comparison. The EVM figures include in-memory RPC and JavaScript overhead; the Git measurement times `git add` and `git commit`, while file writing and repository initialization are excluded. The operations are not semantically equivalent, runs are sequential on one machine without an explicit warm-up or randomized order, the project-creation timing has a large first-run outlier, and no confidence intervals are reported. These measurements do not estimate public-chain fees or latency and must not be used to claim that DraftChain is faster than Git.

## Initial related-work scan

An initial OpenAlex metadata search found relevant adjacent work. This is not a systematic review and cannot establish novelty.

- [Blockchain Based Provenance Sharing of Scientific Workflows](https://doi.org/10.1109/BigData.2018.8622237) (2018).
- [A Blockchain-Based Approach to Provenance and Reproducibility in Research Workflows](https://doi.org/10.1109/ICBC51069.2021.9461139) (2021).
- [SciLedger: A Blockchain-based Scientific Workflow Provenance and Data Sharing Platform](https://doi.org/10.1109/CIC56439.2022.00027) (2022).
- [Preserving File Provenance Using Principles of Blockchain to Ensure Scientific Reproducibility](https://doi.org/10.1109/e-Science58273.2023.10254665) (2023).
- [A Review on Blockchain Technology and Blockchain Projects Fostering Open Science](https://doi.org/10.3389/fbloc.2019.00016) (2019).

These works rule out a broad novelty claim such as “blockchain for scientific provenance.” A narrower candidate question is: **What integrity, cost, latency, privacy, and collaboration trade-offs arise when manuscript revisions use member-gated attestations and a single-parent on-chain revision sequence, compared with an off-chain Git workflow?** Whether this distinction is genuinely novel remains unverified; the full papers and related work must be compared directly.

## Conference-paper assessment

**Current evidence is not sufficient for a Springer conference research paper.** The prototype and initial benchmark demonstrate feasibility, but not novelty, security, generalizable performance, or user benefit. Springer publishes many conferences, each with its own call for papers and formatting requirements, so the target venue must be identified before checking venue-specific compliance.

Before treating this as a research contribution, the paper still needs:

1. A systematic related-work review across academic databases, with search strings, selection criteria, full-text comparison, and a defensible gap. The initial scan already found close neighboring systems.
2. A stated threat model and independent security review. Contract checks restrict writes to members and reject stale parents, but do not verify real-world identity or authorship, prevent the owner from controlling membership, guarantee censorship resistance, or hide public addresses and activity. Manuscript confidentiality and hashes of low-entropy content need careful handling.
3. A stronger Git comparison with equivalent operations, repeated trials, multiple revision/team sizes, stated hardware/software configuration, variability estimates, throughput and storage-growth measurements, and public-chain or well-specified test-network latency/fee measurements.
4. A fault/tamper evaluation, including altered files, missing or reordered revisions, stale/concurrent commits, unauthorized writes, and an explicit off-chain hash-verification procedure.
5. A usability study only if making usability claims, with participant consent and ethics approval where required. Attestations remain self-claims, not verified authorship.
6. The chosen conference's current call for papers, scope fit, submission deadline, and Springer template/format requirements.

## Appropriate current claim

At this stage, describe DraftChain as a functional prototype with an exploratory repeated local benchmark. Do not claim verified authorship, production security, measured performance advantages over Git, or established research novelty. The current benchmark is useful for exercising and refining the measurement pipeline, not for drawing comparative conclusions.
