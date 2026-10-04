import { expect } from "chai";
import { network } from "hardhat";

describe("ManuscriptProvenance", function () {
  async function deployProject() {
    const { ethers } = await network.create();
    const [owner, coauthor, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ManuscriptProvenance");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    const titleSalt = ethers.hexlify(ethers.randomBytes(32));
    const titleCommitment = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "bytes32"],
        ["private project title", titleSalt]
      )
    );
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes("revision one"));
    await contract.createProject(titleCommitment, [coauthor.address]);
    return { contract, owner, coauthor, outsider, titleCommitment, contentHash, ethers };
  }

  it("creates a project with its owner and coauthors as members", async function () {
    const { contract, owner, coauthor, titleCommitment } = await deployProject();
    const project = await contract.projects(1);

    expect(project.owner).to.equal(owner.address);
    expect(project.titleCommitment).to.equal(titleCommitment);
    expect(await contract.members(1, coauthor.address)).to.equal(true);
  });

  it("links revisions and records their submitter", async function () {
    const { contract, coauthor, contentHash, ethers } = await deployProject();
    const secondHash = ethers.keccak256(ethers.toUtf8Bytes("revision two"));

    await contract.connect(coauthor).commitRevision(1, contentHash, ethers.ZeroHash);
    await contract.connect(coauthor).commitRevision(1, secondHash, contentHash);
    const secondRevision = await contract.revisions(1, 2);

    expect(secondRevision.contentHash).to.equal(secondHash);
    expect(secondRevision.parentHash).to.equal(contentHash);
    expect(secondRevision.submittedBy).to.equal(coauthor.address);
  });

  it("rejects a stale parent hash instead of silently branching", async function () {
    const { contract, contentHash, ethers } = await deployProject();
    const wrongParent = ethers.keccak256(ethers.toUtf8Bytes("stale revision"));

    await contract.commitRevision(1, contentHash, ethers.ZeroHash);
    await expect(contract.commitRevision(1, wrongParent, ethers.ZeroHash))
      .to.be.revertedWithCustomError(contract, "StaleParent");
  });

  it("rejects revision commits from nonmembers", async function () {
    const { contract, outsider, contentHash, ethers } = await deployProject();

    await expect(contract.connect(outsider).commitRevision(1, contentHash, ethers.ZeroHash))
      .to.be.revertedWithCustomError(contract, "NotProjectMember");
  });

  it("records each member's contribution attestation once per revision", async function () {
    const { contract, coauthor, contentHash, ethers } = await deployProject();
    await contract.commitRevision(1, contentHash, ethers.ZeroHash);

    await contract.connect(coauthor).attestContribution(1, 1);
    expect(await contract.attestationCount(1, 1)).to.equal(1);
    await expect(contract.connect(coauthor).attestContribution(1, 1))
      .to.be.revertedWithCustomError(contract, "AlreadyAttested");
  });

  it("allows only the owner to add members", async function () {
    const { contract, coauthor, outsider } = await deployProject();

    await expect(contract.connect(coauthor).addMember(1, outsider.address))
      .to.be.revertedWithCustomError(contract, "NotProjectOwner");
    await contract.addMember(1, outsider.address);
    expect(await contract.members(1, outsider.address)).to.equal(true);
  });
});