import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { network } from "hardhat";

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];

  return {
    count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median,
    p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
  };
}

async function measureTransaction(transactionPromise) {
  const started = performance.now();
  const transaction = await transactionPromise;
  const receipt = await transaction.wait();
  return {
    gasUsed: Number(receipt.gasUsed),
    elapsedMs: performance.now() - started,
  };
}

function git(args, cwd) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function runGitBaseline(revisionTexts) {
  const directory = mkdtempSync(path.join(tmpdir(), "draftchain-git-benchmark-"));

  try {
    git(["init", "-q"], directory);
    git(["config", "user.name", "DraftChain Benchmark"], directory);
    git(["config", "user.email", "benchmark@example.invalid"], directory);

    const elapsedMs = revisionTexts.map((text, revisionIndex) => {
      writeFileSync(path.join(directory, "manuscript.txt"), text);
      const started = performance.now();
      git(["add", "manuscript.txt"], directory);
      git(["commit", "-q", "-m", `Revision ${revisionIndex + 1}`], directory);
      return performance.now() - started;
    });

    return { commitCount: revisionTexts.length, elapsedMs };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function runChainProject({ contract, members, ethers, revisionTexts, projectId }) {
  const titleCommitment = ethers.keccak256(ethers.randomBytes(32));
  const createProject = await measureTransaction(
    contract.createProject(titleCommitment, members.map((member) => member.address))
  );
  const revisionSamples = [];
  const attestationSamples = [];
  let parentHash = ethers.ZeroHash;

  for (let index = 0; index < revisionTexts.length; index++) {
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(revisionTexts[index]));
    const submitter = members[index % members.length];
    revisionSamples.push(await measureTransaction(
      contract.connect(submitter).commitRevision(projectId, contentHash, parentHash)
    ));
    parentHash = contentHash;

    const attester = members[(index + 1) % members.length];
    attestationSamples.push(await measureTransaction(
      contract.connect(attester).attestContribution(projectId, index + 1)
    ));
  }

  return { createProject, revisionSamples, attestationSamples };
}

const revisionCount = Number(process.env.REVISION_COUNT ?? 20);
const teamSize = Number(process.env.TEAM_SIZE ?? 4);
const runCount = Number(process.env.BENCHMARK_RUNS ?? 5);
if (!Number.isSafeInteger(revisionCount) || revisionCount < 1) {
  throw new Error("REVISION_COUNT must be a positive integer");
}
if (!Number.isSafeInteger(teamSize) || teamSize < 1 || teamSize > 10) {
  throw new Error("TEAM_SIZE must be an integer between 1 and 10");
}
if (!Number.isSafeInteger(runCount) || runCount < 2 || runCount > 100) {
  throw new Error("BENCHMARK_RUNS must be an integer between 2 and 100");
}

const { ethers } = await network.create();
const signers = await ethers.getSigners();
if (signers.length < teamSize + 1) {
  throw new Error(`The local network needs at least ${teamSize + 1} signers`);
}

const [owner, ...members] = signers.slice(0, teamSize + 1);
const coauthors = members.map((member) => member.address);
const factory = await ethers.getContractFactory("ManuscriptProvenance", owner);
const contract = await factory.deploy();
await contract.waitForDeployment();

const revisionTexts = Array.from(
  { length: revisionCount },
  (_, index) => `DraftChain reproducible benchmark revision ${index + 1}\n`
);
const createProjectSamples = [];
const revisionSamples = [];
const attestationSamples = [];
const gitSamples = [];
const runs = [];

for (let runIndex = 0; runIndex < runCount; runIndex++) {
  const projectId = runIndex + 1;
  let chainRun;
  let gitRun;

  if (runIndex % 2 === 0) {
    chainRun = await runChainProject({ contract, members, ethers, revisionTexts, projectId });
    gitRun = runGitBaseline(revisionTexts);
  } else {
    gitRun = runGitBaseline(revisionTexts);
    chainRun = await runChainProject({ contract, members, ethers, revisionTexts, projectId });
  }

  createProjectSamples.push(chainRun.createProject);
  revisionSamples.push(...chainRun.revisionSamples);
  attestationSamples.push(...chainRun.attestationSamples);
  gitSamples.push(...gitRun.elapsedMs);
  runs.push({
    run: runIndex + 1,
    projectId,
    createProject: chainRun.createProject,
    revisions: chainRun.revisionSamples,
    attestations: chainRun.attestationSamples,
    gitCommitElapsedMs: gitRun.elapsedMs,
  });
}

const networkInfo = await ethers.provider.getNetwork();
const gitVersion = execFileSync("git", ["--version"], { encoding: "utf8" }).trim();
const results = {
  benchmark: "DraftChain local EVM versus temporary Git repository",
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    git: gitVersion,
    chainId: networkInfo.chainId.toString(),
    network: "Hardhat local simulated network",
    revisionCount,
    benchmarkRuns: runCount,
    coauthorWallets: teamSize,
    totalProjectMembers: teamSize + 1,
  },
  limitations: [
    "EVM timings include local JavaScript and in-memory RPC overhead; they are not public-chain latency measurements.",
    "Gas units are reported without converting them to currency or estimating a particular chain's fees.",
    "Git elapsed time covers git add and git commit; file writing and repository initialization are excluded.",
    "Git and EVM operations have different semantics; measurements are exploratory and do not establish comparative performance.",
  ],
  runs,
  blockchain: {
    createProject: {
      gasUsed: summarize(createProjectSamples.map((sample) => sample.gasUsed)),
      elapsedMs: summarize(createProjectSamples.map((sample) => sample.elapsedMs)),
      samples: createProjectSamples,
    },
    revisions: {
      gasUsed: summarize(revisionSamples.map((sample) => sample.gasUsed)),
      elapsedMs: summarize(revisionSamples.map((sample) => sample.elapsedMs)),
      samples: revisionSamples,
    },
    attestations: {
      gasUsed: summarize(attestationSamples.map((sample) => sample.gasUsed)),
      elapsedMs: summarize(attestationSamples.map((sample) => sample.elapsedMs)),
      samples: attestationSamples,
    },
  },
  git: {
    commitCount: gitSamples.length,
    elapsedMs: summarize(gitSamples),
    samples: gitSamples,
  },
};

const outputPath = path.resolve(process.env.RESULTS_PATH ?? "benchmark-results.json");
writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
console.log(`Saved benchmark results to ${outputPath}`);