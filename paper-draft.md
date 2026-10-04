# DraftChain: An Exploratory Evaluation of Blockchain-Anchored Manuscript Revision Provenance

**Status:** Preliminary research-paper draft. This is not yet submission-ready. The venue, systematic literature review, and controlled evaluation remain to be completed.

## Abstract

Collaborative research manuscripts are commonly revised through tools such as Git, shared editors, and document-management systems. DraftChain is an EVM smart-contract prototype that records salted project-title commitments, hash-linked manuscript revisions, submitting wallets, and voluntary member attestations while leaving manuscript text off-chain. We report a functional evaluation and an exploratory local benchmark against a temporary Git repository. The benchmark replays 20 synthetic revisions in each of five runs, with four contributor wallets, and records transaction gas and local elapsed time. Revision commits used a mean of 109,143.6 gas; contribution attestations used a mean of 76,190 gas. Local transaction time averaged 2.42 ms for revision commits and 2.15 ms for attestations. The Git `add` plus `commit` operation averaged 16.04 ms. These timings are not directly comparable: they cover different work, run on one machine, and the EVM is simulated in memory. The results therefore demonstrate prototype behavior and measurement feasibility, not a performance advantage, production security, or research novelty. Existing work on blockchain provenance for scientific workflows, blockchain scholarly publishing, and Git-based collaborative writing makes a focused literature review essential. We identify manuscript-specific membership and stale-parent controls as a candidate comparative question, not an established research gap.

**Keywords:** manuscript provenance; blockchain; smart contracts; scientific workflows; version control; reproducibility

## 1. Introduction

Research manuscripts change through drafting, review, editing, and contribution by multiple people. A research group may need to inspect the sequence of revisions and determine which wallet recorded a particular revision. Conventional version-control tools already support history and collaboration, while blockchain systems offer an append-only shared ledger. The relevant research question is not whether a blockchain can store a hash, but whether the properties of a shared ledger justify its costs and risks for manuscript provenance.

DraftChain is a prototype that stores a project title commitment, member addresses, a current revision hash, revision-parent links, submitting addresses, timestamps, and member attestations. Manuscript text is not stored by the contract. A revision must name the currently recorded head as its parent; a stale parent is rejected instead of silently creating a second canonical branch. Project owners control membership. Attestations are claims made by wallets and are not verified authorship.

This paper is an exploratory system-and-measurement report. Its candidate research question is: **What integrity, operational-cost, privacy, and collaboration trade-offs arise when manuscript revisions use member-gated attestations and a single-parent on-chain sequence, compared with an off-chain Git workflow?** The present artifact cannot establish that this question is novel or that DraftChain is preferable to Git.

The current contributions are limited to: (1) an executable contract prototype and behavioral tests; (2) a reproducible script that measures selected local EVM and Git operations; and (3) an explicit account of what those measurements do and do not support.

## 2. Related Work

Blockchain provenance is established research territory. Chen, Liang, and Li describe provenance sharing for scientific workflows [1]. Wittek et al. investigate blockchain-based provenance and reproducibility in research workflows [2], and Hoopes et al. present SciLedger for workflow provenance and data sharing [3]. Hasan et al. study blockchain principles for file provenance and scientific reproducibility [4]. Leible et al. review blockchain projects related to open science [5]. These systems make a broad claim such as “blockchain for scientific provenance” unsuitable as DraftChain's novelty claim without a detailed full-text comparison.

Blockchain has also been proposed directly for scholarly communication. Hoffman et al. discuss blockchain-based scholarly publishing and smart informetrics [6]; Hoffman, Ibáñez, and Fryer describe dynamic “smart papers” [7]; and Stojmenova Duh et al. discuss cooperative scholarly communication using a blockchain platform [8]. These are especially relevant prior art and must be examined in detail before positioning a manuscript-history contribution.

Git is an important baseline, not merely a control. Himmelstein et al. describe Manubot, an open collaborative writing system built around version-controlled scholarly documents [9]. Therefore, a meaningful evaluation must compare equivalent workflows and account for the history, collaboration, identity, and review features already available in existing tools. The present benchmark's Git operation is only `git add` plus `git commit`; it does not compare complete manuscript workflows.

The references below were checked against DOI-indexed scholarly metadata. This initial scan is not systematic: it does not define complete database coverage, search strings, screening criteria, or full-text inclusion decisions. It cannot prove a research gap.

## 3. System Design and Threat Model

### 3.1 On-chain data and operations

A project stores an owner address, title commitment, current head hash, and revision count. The owner can add members. Members can submit a content hash only when the supplied parent matches the current head. Each accepted revision stores its hash, parent hash, submitter address, and block timestamp. A member can record one contribution attestation per revision.

The contract stores no manuscript text and provides no decentralized content store. A client must retain the document and compute the content hash over a documented, stable byte representation. Title commitments should include a high-entropy random salt; a hash of a guessable title alone does not provide meaningful confidentiality.

### 3.2 Intended protections

The contract enforces member-only revision and attestation calls, owner-only member addition, a single canonical parent sequence, and one attestation per address per revision. These are contract-level rules. They do not establish that the submitter is the real-world author, that an attestation is truthful, or that a revision is scientifically meaningful.

### 3.3 Threats and limitations

Wallet addresses and transaction timing are public on a public chain and may be linkable. Hashes can reveal low-entropy content through guessing. The owner can control membership. Transactions may be delayed, censored, or made costly by the underlying network. Lost keys can prevent members from acting. The prototype does not define content canonicalization, key recovery, identity verification, encryption, moderation, or dispute resolution. No independent smart-contract audit has been performed. Public-chain deployment and human-participant testing are outside this evaluation.

## 4. Method

### 4.1 Functional tests

Six Hardhat tests cover project creation and membership, revision linking and submitter recording, stale-parent rejection, nonmember write rejection, one-time contribution attestations, and owner-only membership changes. They are contract behavior checks, not a security proof.

### 4.2 Exploratory benchmark

The benchmark script replays 20 deterministic synthetic text revisions per run in five sequential runs. It uses four contributor wallets plus the project owner, a Hardhat in-memory network (chain ID 31337), Node.js 24.21.0, and Git 2.55.0 on Linux x64. The contract records a project, revisions, and one attestation per revision. A temporary Git repository performs `git add` and `git commit` for each revision. The script records raw samples and summary statistics in `benchmark-results.json`.

Contract elapsed time is measured from transaction submission through receipt. This includes local JavaScript and in-memory provider overhead and is not a public-chain confirmation time. Git timing covers `git add` and `git commit`; it excludes file writes and repository initialization. Runs execute sequentially on one machine without an explicit warm-up or randomized order. The observed local values are descriptive only. No confidence intervals, significance tests, public-chain measurements, or currency-denominated fee estimates are reported.

## 5. Results

All six functional tests passed in the latest saved run; the full output is in `test-results.txt`.

| Operation | Samples | Mean gas | Mean local elapsed time | Median | P95 |
|---|---:|---:|---:|---:|---:|
| Project creation | 5 | 198,329.2 | 19.29 ms | 3.50 ms | 69.09 ms |
| Revision commit | 100 | 109,143.6 | 2.42 ms | 1.79 ms | 4.91 ms |
| Contribution attestation | 100 | 76,190 | 2.15 ms | 1.68 ms | 4.55 ms |
| Git `add` plus `commit` | 100 | Not applicable | 16.04 ms | 14.42 ms | 23.20 ms |

Project-creation timing has a large first-run outlier, which substantially affects its mean and tail. Gas use is stable for attestations and mostly stable for revision commits after the first revision. Local EVM transaction timings are much shorter than Git command timings in this environment, but this is not a valid performance comparison: the measured operations do different work and use different execution paths. No claim that DraftChain is faster than Git follows from these measurements.

The benchmark supports only that the script can record local gas and elapsed-time samples for this prototype. It does not measure throughput under concurrency, chain congestion, durable public consensus, storage growth at scale, fees in currency, usability, integrity detection of actual modified files, or author attribution accuracy.

## 6. Discussion

The prototype shows how a contract can enforce membership checks, revision-parent sequencing, and one-per-revision attestations. Whether those controls improve research collaboration is unanswered. Git already offers revision history and established workflows; an on-chain record introduces fees, public metadata, key management, and a governance question around the project owner. The relevant comparison should test equivalent tasks and report what the chain enables that Git alone does not, as well as the cost of combining them.

The closest candidate contribution is an empirical examination of a narrow manuscript workflow that combines role-gated revision anchoring and member attestations, rather than another generic provenance ledger. This candidate is not yet demonstrated as novel. A systematic search and full-text comparison against scientific-workflow systems, blockchain publishing proposals, and collaborative writing tools could show that the candidate is already covered or needs further refinement.

## 7. Limitations and Future Work

This is a single-machine exploratory benchmark with a small synthetic workload. It has no repeated independent environments, baseline workload equivalence, confidence intervals, transaction-fee conversion, or test/public network. The Git baseline is intentionally narrow and excludes file-write cost; the blockchain path does not include content retrieval or client-side hashing. Functional tests cover selected expected behavior but do not constitute fuzzing, formal verification, or a security audit.

Next work should: (1) conduct and document a systematic related-work search and full-text comparison; (2) define equivalent Git and blockchain workflows and workloads; (3) repeat measurements across workload sizes and independent environments, report distributions and uncertainty, and include chain configuration and realistic fee scenarios; (4) test content-hash verification, tampering, missing revisions, stale/concurrent commits, and access-control boundaries; (5) obtain an independent contract security review; and (6) conduct a consented usability study only if the paper makes human-factors claims. The target Springer conference must be named before scope, deadline, and formatting compliance can be assessed.

## 8. Conclusion

DraftChain is a functioning prototype for recording hash-linked manuscript revisions and voluntary contribution attestations on an EVM contract. Six behavioral tests pass, and a five-run local benchmark generated reproducible samples. The benchmark is exploratory and does not establish an advantage over Git. Because related work already addresses scientific provenance and blockchain scholarly communication, novelty remains unresolved. DraftChain is therefore a basis for a more rigorous study, not yet a submission-ready Springer conference paper.

## References

[1] W. Chen, X. Liang, and J. Li, “Blockchain Based Provenance Sharing of Scientific Workflows,” 2018 IEEE International Conference on Big Data. https://doi.org/10.1109/BigData.2018.8622237

[2] K. Wittek, N. Wittek, and J. Lawton, “A Blockchain-Based Approach to Provenance and Reproducibility in Research Workflows,” 2021 IEEE International Conference on Blockchain and Cryptocurrency. https://doi.org/10.1109/ICBC51069.2021.9461139

[3] R. Hoopes, H. Hardy, and M. Long, “SciLedger: A Blockchain-based Scientific Workflow Provenance and Data Sharing Platform,” 2022 IEEE International Conference on Collaboration and Internet Computing. https://doi.org/10.1109/CIC56439.2022.00027

[4] R. Hasan, S. Purawat, and C. M. Olschanowsky, “Preserving File Provenance Using Principles of Blockchain to Ensure Scientific Reproducibility,” 2023 IEEE 19th International Conference on e-Science. https://doi.org/10.1109/e-Science58273.2023.10254665

[5] S. Leible, S. Schlager, M. Schubotz, and B. Gipp, “A Review on Blockchain Technology and Blockchain Projects Fostering Open Science,” Frontiers in Blockchain, 2019. https://doi.org/10.3389/fbloc.2019.00016

[6] M. R. Hoffman, L. Ibáñez, and E. P. Bontas Simperl, “Scholarly publishing on the blockchain – from smart papers to smart informetrics,” Data Science, 2019. https://doi.org/10.3233/DS-190018

[7] M. R. Hoffman, L.-D. Ibáñez, and H. Fryer, “Smart Papers: Dynamic Publications on the Blockchain,” 2018. https://doi.org/10.1007/978-3-319-93417-4_20

[8] E. Stojmenova Duh, A. Duh, and U. Droftina, “Publish-and-Flourish: Using Blockchain Platform to Enable Cooperative Scholarly Communication,” Publications, 2019. https://doi.org/10.3390/publications7020033

[9] D. S. Himmelstein, V. Rubinetti, D. R. Slochower, et al., “Open collaborative writing with Manubot,” PLOS Computational Biology, 2019. https://doi.org/10.1371/journal.pcbi.1007128
